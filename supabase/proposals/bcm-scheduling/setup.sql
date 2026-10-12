-- Applied and verified in BCM Test on 2026-10-10. Not applied to Production.
-- One-time setup, not idempotent. Requires the tested bcm-one-link schema and snapshot validator.
-- Installs NO recurring job. All existing configurations start paused; runtime remains disconnected.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test database required'; end if;
end; $$;
create table vb_private.bcm_scheduler_config (
 singleton boolean primary key default true check(singleton), ready boolean not null default false
);
insert into vb_private.bcm_scheduler_config(singleton,ready) values(true,false);
revoke all on vb_private.bcm_scheduler_config from public,anon,authenticated;
grant all on vb_private.bcm_scheduler_config to service_role;
create table public.vb_bcm_schedules (
 client_id uuid primary key references public.vb_bcm_settings(client_id) on delete cascade,
 enabled boolean not null default false, revision integer not null default 1 check(revision>0),
 settings_version integer not null check(settings_version>0), authorized_by uuid not null references auth.users(id),
 started_at timestamptz, next_run_at timestamptz, updated_at timestamptz not null default now(),
 last_status text not null default 'not_run' check(last_status in ('not_run','running','completed','failed','access_unavailable','settings_changed')),
 check((enabled and next_run_at is not null and started_at is not null) or (not enabled and next_run_at is null))
);
alter table public.vb_bcm_schedules enable row level security;
revoke all on public.vb_bcm_schedules from public,anon,authenticated;
grant select on public.vb_bcm_schedules to authenticated;
grant all on public.vb_bcm_schedules to service_role;
create policy bcm_schedule_read on public.vb_bcm_schedules for select to authenticated
 using(vb_private.is_client_member(client_id) or (select vb_private.is_staff()));
insert into public.vb_bcm_schedules(client_id,settings_version,authorized_by)
 select client_id,version,authorized_by from public.vb_bcm_settings;
create trigger vb_bcm_schedule_audit after insert or update on public.vb_bcm_schedules
 for each row execute function vb_private.audit_record();
alter table public.vb_bcm_scans add column schedule_revision integer check(schedule_revision>0);
create index bcm_due_schedule on public.vb_bcm_schedules(next_run_at) where enabled;

create function vb_private.pause_bcm_after_save() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.vb_bcm_schedules as existing(client_id,settings_version,authorized_by,last_status)
 values(new.client_id,new.version,new.authorized_by,'settings_changed')
 on conflict(client_id) do update set enabled=false,next_run_at=null,revision=existing.revision+1,
 settings_version=new.version,authorized_by=new.authorized_by,last_status='settings_changed',updated_at=now();
 return new;
end; $$;
revoke all on function vb_private.pause_bcm_after_save() from public,anon,authenticated;
create trigger vb_bcm_pause_after_save after insert or update on public.vb_bcm_settings
 for each row execute function vb_private.pause_bcm_after_save();

create function public.vb_bcm_scheduler_ready() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and auth.role() is distinct from 'service_role' then raise exception 'Sign-in required' using errcode='42501'; end if;
 return coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false);
end; $$;
revoke all on function public.vb_bcm_scheduler_ready() from public,anon;
grant execute on function public.vb_bcm_scheduler_ready() to authenticated,service_role;

create function public.vb_set_bcm_monitoring(target_client uuid,expected_settings_version integer,expected_revision integer,enabled boolean)
returns public.vb_bcm_schedules language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; schedule public.vb_bcm_schedules;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 select * into schedule from public.vb_bcm_schedules where client_id=target_client for update;
 if cfg.version is distinct from expected_settings_version or schedule.revision is distinct from expected_revision
 or schedule.settings_version is distinct from cfg.version or expected_settings_version is null or expected_revision is null
 then raise exception 'Settings or monitoring changed; reload' using errcode='40001'; end if;
 if enabled is null then raise exception 'Choose monitoring status' using errcode='22023'; end if;
 if enabled and (cfg.access_mode<>'public' or not public.vb_bcm_scheduler_ready()) then raise exception 'Public monitoring is not connected' using errcode='55000'; end if;
 update public.vb_bcm_schedules s set enabled=vb_set_bcm_monitoring.enabled,revision=s.revision+1,
 authorized_by=auth.uid(),started_at=case when vb_set_bcm_monitoring.enabled then coalesce(s.started_at,now()) else s.started_at end,
 next_run_at=case when vb_set_bcm_monitoring.enabled then now() else null end,updated_at=now()
 where client_id=target_client returning * into schedule;
 return schedule;
end; $$;
revoke all on function public.vb_set_bcm_monitoring(uuid,integer,integer,boolean) from public,anon;
grant execute on function public.vb_set_bcm_monitoring(uuid,integer,integer,boolean) to authenticated;

-- Explicit saved actor check: background work never impersonates a client JWT.
create function vb_private.bcm_actor_has_access(target_client uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id
 where m.client_id=target_client and m.user_id=actor and m.active and c.portal_enabled and c.archived_at is null)
 and not exists(select 1 from vb_private.staff_members s where s.user_id=actor);
$$;
revoke all on function vb_private.bcm_actor_has_access(uuid,uuid) from public,anon,authenticated;
grant execute on function vb_private.bcm_actor_has_access(uuid,uuid) to service_role;

create function public.vb_claim_bcm_due_scan() returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid; cfg public.vb_bcm_settings; schedule public.vb_bcm_schedules; baseline uuid; ticket uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 if not public.vb_bcm_scheduler_ready() or not pg_try_advisory_xact_lock(527014271) then return null; end if;
 -- One automatic scan globally at a time; expired reservations do not block later work.
 if exists(select 1 from public.vb_bcm_scans where schedule_revision is not null and status='running' and started_at>now()-interval '2 minutes') then return null; end if;
 select c.id into target from public.vb_clients c join public.vb_bcm_schedules s on s.client_id=c.id
 where s.enabled and s.next_run_at<=now()
 and not exists(select 1 from public.vb_bcm_scans r where r.client_id=c.id and r.started_at>now()-interval '2 minutes')
 order by s.next_run_at,c.id for update of c skip locked limit 1;
 if target is null then return null; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 select * into schedule from public.vb_bcm_schedules where client_id=target for update;
 if not schedule.enabled or schedule.next_run_at>now() then return null; end if;
 if cfg.version is distinct from schedule.settings_version or cfg.access_mode<>'public'
 or not vb_private.bcm_actor_has_access(target,schedule.authorized_by) then
  update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,updated_at=now(),
  last_status=case when not vb_private.bcm_actor_has_access(target,schedule.authorized_by) then 'access_unavailable' else 'settings_changed' end where client_id=target;
  return null;
 end if;
 update public.vb_bcm_scans set status='failed',finished_at=now() where client_id=target and status='running' and started_at<=now()-interval '2 minutes';
 select id into baseline from public.vb_bcm_scans where client_id=target and settings_version=cfg.version and scan_type='baseline' and status='completed';
 insert into public.vb_bcm_scans(client_id,settings_version,requested_by,scan_type,baseline_id,schedule_revision)
 values(target,cfg.version,schedule.authorized_by,case when baseline is null then 'baseline' else 'comparison' end,baseline,schedule.revision)
 returning id into ticket;
 update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,
 last_status='running',updated_at=now() where client_id=target;
 return jsonb_build_object('ticket',ticket,'settings',to_jsonb(cfg));
end; $$;
revoke all on function public.vb_claim_bcm_due_scan() from public,anon,authenticated;
grant execute on function public.vb_claim_bcm_due_scan() to service_role;

create function public.vb_bcm_job_is_current(ticket uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 return public.vb_bcm_scheduler_ready() and exists(
  select 1 from public.vb_bcm_scans r join public.vb_bcm_schedules s on s.client_id=r.client_id join public.vb_bcm_settings cfg on cfg.client_id=r.client_id
  where r.id=ticket and r.status='running' and r.started_at>now()-interval '2 minutes' and s.enabled
  and s.revision=r.schedule_revision and s.authorized_by=r.requested_by and cfg.version=r.settings_version and s.settings_version=cfg.version
  and cfg.access_mode='public' and vb_private.bcm_actor_has_access(r.client_id,r.requested_by));
end; $$;
revoke all on function public.vb_bcm_job_is_current(uuid) from public,anon,authenticated;
grant execute on function public.vb_bcm_job_is_current(uuid) to service_role;

-- Preserve the previously tested snapshot validator unchanged behind a guarded wrapper.
create or replace function vb_private.finish_bcm_snapshot(ticket uuid,snapshot jsonb,failure boolean) returns text
language plpgsql security definer set search_path='' as $$
declare run public.vb_bcm_scans; cfg public.vb_bcm_settings; prior public.vb_bcm_scans; target uuid; page_count integer; expected_pages text[];
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 select client_id into target from public.vb_bcm_scans where id=ticket;
 if target is null then raise exception 'Unknown scan'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into run from public.vb_bcm_scans where id=ticket for update;
 if run.status<>'running' then return run.status; end if;
 select * into cfg from public.vb_bcm_settings where client_id=run.client_id;
 if failure is distinct from false or cfg.version is distinct from run.settings_version or run.started_at<now()-interval '2 minutes'
  or not exists(select 1 from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id where m.client_id=run.client_id and m.user_id=run.requested_by and m.active and c.portal_enabled and c.archived_at is null)
  or cfg.access_mode is distinct from 'public'
  or exists(select 1 from vb_private.staff_members where user_id=run.requested_by) then
  update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed';
 end if;
 if run.scan_type='comparison' then
  select * into prior from public.vb_bcm_scans where id=run.baseline_id and client_id=run.client_id and settings_version=run.settings_version and scan_type='baseline' and status='completed';
  if not found then update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed'; end if;
 end if;
 if snapshot is null or jsonb_typeof(snapshot)<>'object' or snapshot->>'extractor' not in ('source-text-v1','source-text-v2','source-discovery-v3')
  or jsonb_typeof(snapshot->'text') is distinct from 'string' or length(snapshot->>'text') not between 40 and 60000
  or jsonb_typeof(snapshot->'title') is distinct from 'string' or length(snapshot->>'title')>500
  or jsonb_typeof(snapshot->'headings') is distinct from 'array' or octet_length(snapshot::text)>550000 then raise exception 'Invalid snapshot'; end if;
 if (cfg.discovery_mode='site') is distinct from (snapshot->>'extractor'='source-discovery-v3') then raise exception 'Snapshot does not match discovery mode'; end if;
 if snapshot->>'extractor'='source-text-v1' then
  if cardinality(cfg.urls)<>1 or cfg.urls[1] not in ('https://cotivate.com','https://cotivate.com/') or snapshot->>'url' is distinct from 'https://cotivate.com/' then raise exception 'Invalid legacy snapshot'; end if;
 elsif snapshot->>'extractor'='source-discovery-v3' then
  perform vb_private.check_bcm_discovery_snapshot(cfg,snapshot);
 else
  if jsonb_typeof(snapshot->'urls') is distinct from 'array' or jsonb_typeof(snapshot->'pages') is distinct from 'array'
   or jsonb_array_length(snapshot->'urls')<>jsonb_array_length(snapshot->'pages') then raise exception 'Invalid page snapshots'; end if;
  select array_agg(u order by n) into expected_pages from unnest(cfg.urls) with ordinality as configured(u,n) where not exists(select 1 from unnest(cfg.exclusions) e where e='/' or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1)=e or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1) like rtrim(e,'/')||'/%');
  page_count:=coalesce(cardinality(expected_pages),0);
  if jsonb_array_length(snapshot->'pages')<>page_count then raise exception 'Snapshot does not match configured pages'; end if;
  if exists(select 1 from jsonb_array_elements(snapshot->'pages') with ordinality p(value,n) where
   jsonb_typeof(p.value)<>'object' or jsonb_typeof(p.value->'url') is distinct from 'string' or
   p.value->>'url' is distinct from expected_pages[p.n] or jsonb_typeof(p.value->'text') is distinct from 'string' or length(p.value->>'text')<8 or
   jsonb_typeof(p.value->'title') is distinct from 'string' or length(p.value->>'title')>500 or jsonb_typeof(p.value->'headings') is distinct from 'array' or
   jsonb_typeof(p.value->'extractor') is distinct from 'string' or p.value->>'extractor'<>'source-text-v2' or
   exists(select 1 from unnest(cfg.exclusions) e where e='/' or split_part(regexp_replace(p.value->>'url','^https://[^/]+',''),'?',1)=e or split_part(regexp_replace(p.value->>'url','^https://[^/]+',''),'?',1) like rtrim(e,'/')||'/%')) then raise exception 'Snapshot page is not allowed'; end if;
  if (select array_agg(value order by ordinality) from jsonb_array_elements_text(snapshot->'urls') with ordinality) is distinct from expected_pages then raise exception 'Snapshot URLs do not match settings'; end if;
  if snapshot->>'url' is distinct from expected_pages[1] then raise exception 'Snapshot primary URL does not match included pages'; end if;
 end if;
 update public.vb_bcm_scans set status='completed',finished_at=now(),snapshot=finish_bcm_snapshot.snapshot where id=ticket;
 return 'completed';
end; $$;
revoke all on function vb_private.finish_bcm_snapshot(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function vb_private.finish_bcm_snapshot(uuid,jsonb,boolean) to service_role;
create or replace function public.vb_finish_bcm_baseline(ticket uuid,snapshot jsonb,failure boolean) returns text
language plpgsql security definer set search_path='' as $$
declare target uuid; run public.vb_bcm_scans; result text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 select client_id into target from public.vb_bcm_scans where id=ticket;
 if target is null then raise exception 'Unknown scan'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into run from public.vb_bcm_scans where id=ticket for update;
 if run.status<>'running' then return run.status; end if;
 if run.schedule_revision is not null and not public.vb_bcm_job_is_current(ticket) then
  update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket;
  return 'failed';
 end if;
 result:=vb_private.finish_bcm_snapshot(ticket,snapshot,failure);
 if run.schedule_revision is not null then
  update public.vb_bcm_schedules set last_status=result,updated_at=now()
  where client_id=target and revision=run.schedule_revision;
 end if;
 return result;
end; $$;
revoke all on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
commit;
