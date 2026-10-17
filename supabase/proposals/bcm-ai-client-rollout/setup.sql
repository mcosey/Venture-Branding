-- Approved general-client Production rollout; atomic, preserves schedules and records.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 if to_regprocedure('vb_private.dispatch_bcm_ai_tick()') is null then raise exception 'Existing verified dispatcher required';end if;
 if exists(select 1 from public.vb_bcm_ai_runs where status='running') then raise exception 'Wait for current research before applying';end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-due-tick' and active) then raise exception 'Legacy crawler must stay off';end if;
end;$$;
alter table vb_private.bcm_ai_config add column client_month_limit integer not null default 8 check(client_month_limit>0),add column global_month_limit integer not null default 200 check(global_month_limit>0);
create index bcm_ai_run_month on public.vb_bcm_ai_runs(started_at);
create function vb_private.bcm_ai_month_start() returns timestamptz language sql stable set search_path='' as $$
 select date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
$$;
create or replace function public.vb_bcm_ai_ready() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and auth.role() is distinct from 'service_role' then raise exception 'Sign in' using errcode='42501';end if;
 return coalesce((select ready from vb_private.bcm_ai_config where singleton),false) and public.vb_bcm_scheduler_ready();
end;$$;
create function vb_private.bcm_ai_allowance(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cfg vb_private.bcm_ai_config; used integer; shared integer; active boolean; connected boolean; reason text; month_start timestamptz:=vb_private.bcm_ai_month_start();
begin
 select * into cfg from vb_private.bcm_ai_config where singleton;
 select count(*),count(*) filter(where client_id=target) into shared,used from public.vb_bcm_ai_runs where started_at>=month_start;
 active:=exists(select 1 from public.vb_clients where id=target and portal_enabled and archived_at is null);
 connected:=coalesce(cfg.ready,false) and coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false);
 reason:=case when not active then 'client_unavailable' when not connected then 'paused' when shared>=cfg.global_month_limit then 'global_limit' when used>=cfg.client_month_limit then 'client_limit' else 'available' end;
 return jsonb_build_object('limit',cfg.client_month_limit,'used',used,'remaining',greatest(cfg.client_month_limit-used,0),'resets_at',((month_start at time zone 'UTC')+interval '1 month') at time zone 'UTC','available',reason='available','reason',reason);
end;$$;
create function public.vb_bcm_ai_allowance(target_client uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not (vb_private.is_staff() or vb_private.is_client_member(target_client)) then raise exception 'Client access required' using errcode='42501';end if;
 return vb_private.bcm_ai_allowance(target_client);
end;$$;
revoke all on function vb_private.bcm_ai_month_start(),vb_private.bcm_ai_allowance(uuid),public.vb_bcm_ai_allowance(uuid) from public,anon,authenticated;
grant execute on function public.vb_bcm_ai_allowance(uuid) to authenticated;
create or replace function vb_private.reserve_bcm_ai(target uuid,actor uuid,schedule_rev integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; ticket uuid; domain_name text; names jsonb; allowance jsonb;
begin
 -- Every reservation takes the same global row lock before checking either monthly counter.
 perform 1 from vb_private.bcm_ai_config where singleton for update;
 if not public.vb_bcm_ai_ready() then raise exception 'Research is paused';end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,actor) then raise exception 'Access or settings unavailable';end if;
 allowance:=vb_private.bcm_ai_allowance(target);
 if not (allowance->>'available')::boolean then raise exception 'Monthly research allowance reached';end if;
 if exists(select 1 from public.vb_bcm_ai_runs where client_id=target and status='running' and started_at>now()-interval '5 minutes') then raise exception 'Research already running';end if;
 update public.vb_bcm_ai_runs set status='failed',finished_at=now() where client_id=target and status='running';
 domain_name:=vb_private.bcm_ai_domain(cfg.urls[1]);
 insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,schedule_revision,domain) values(target,cfg.version,actor,schedule_rev,domain_name) returning id into ticket;
 select coalesce(jsonb_agg(name),'[]') into names from (select name from public.vb_bcm_ai_observations where client_id=target and domain=domain_name order by last_seen desc limit 50) n;
 return jsonb_build_object('ticket',ticket,'settings',to_jsonb(cfg),'known_names',names);
end;$$;
create or replace function public.vb_claim_bcm_ai_due_run() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; cfg public.vb_bcm_settings; s public.vb_bcm_schedules; result jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501';end if;
 perform 1 from vb_private.bcm_ai_config where singleton for update;
 if not public.vb_bcm_ai_ready() then return null;end if;
 -- Exhausted clients are skipped, so they cannot block another client's due work.
 for target in select c.id from public.vb_clients c join public.vb_bcm_schedules due_schedule on due_schedule.client_id=c.id
 where c.portal_enabled and c.archived_at is null and due_schedule.enabled and due_schedule.next_run_at<=now()
 and (vb_private.bcm_ai_allowance(c.id)->>'available')::boolean
 and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')
 order by due_schedule.next_run_at,c.id for update of c skip locked loop
  select * into cfg from public.vb_bcm_settings where client_id=target;
  select * into s from public.vb_bcm_schedules where client_id=target for update;
  if cfg.version is distinct from s.settings_version or not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,s.authorized_by)
  or (select count(*) from public.vb_bcm_ai_runs where client_id=target and domain=vb_private.bcm_ai_domain(cfg.urls[1]) and status='completed')<3 then
   update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,last_status='access_unavailable',updated_at=now() where client_id=target;
   continue;
  end if;
  result:=vb_private.reserve_bcm_ai(target,s.authorized_by,s.revision);
  update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,last_status='running',updated_at=now() where client_id=target;
  return result;
 end loop;
 return null;
end;$$;
create or replace function public.vb_bcm_ai_run_is_current(ticket uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501';end if;
 -- A reservation that uses the final allowance remains valid for completion.
 return public.vb_bcm_ai_ready() and exists(select 1 from public.vb_bcm_ai_runs r join public.vb_bcm_settings c on c.client_id=r.client_id
 left join public.vb_bcm_schedules s on s.client_id=r.client_id where r.id=ticket and r.status='running' and r.started_at>now()-interval '5 minutes'
 and c.version=r.settings_version and vb_private.bcm_ai_valid(c) and vb_private.bcm_ai_domain(c.urls[1])=r.domain and vb_private.bcm_actor_has_access(r.client_id,r.requested_by)
 and (r.schedule_revision is null or (s.enabled and s.revision=r.schedule_revision and s.authorized_by=r.requested_by and s.settings_version=c.version)));
end;$$;
create or replace function public.vb_set_bcm_ai_monitoring(target_client uuid,expected_settings_version integer,expected_revision integer,enabled boolean) returns public.vb_bcm_schedules language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 perform 1 from public.vb_clients where id=target_client for update;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if enabled and (((public.vb_bcm_ai_baseline_progress(target_client)->>'remaining')::integer)>0 or not (vb_private.bcm_ai_allowance(target_client)->>'available')::boolean or not coalesce(vb_private.bcm_ai_valid(cfg),false)) then raise exception 'Research unavailable, allowance reached, or baseline incomplete';end if;
 return public.vb_set_bcm_monitoring(target_client,expected_settings_version,expected_revision,enabled);
end;$$;
create or replace function vb_private.dispatch_bcm_ai_tick() returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text; credential text;
begin
 if not coalesce((select ready from vb_private.bcm_ai_config where singleton),false) or not coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false)
 or not exists(select 1 from public.vb_bcm_schedules s join public.vb_clients c on c.id=s.client_id where s.enabled and s.next_run_at<=now() and c.portal_enabled and c.archived_at is null
 and (vb_private.bcm_ai_allowance(c.id)->>'available')::boolean and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')) then return null;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='bcm_scheduler_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='bcm_scheduler_secret_v2';
 if endpoint is distinct from 'https://omvkwiosonatswocbdgx.supabase.co' or credential is null or length(credential)<32 or credential ~ '[[:space:]]' then raise exception 'Private scheduler unavailable';end if;
 return net.http_post(url:=endpoint||'/functions/v1/bcm-ai-schedule',body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','x-bcm-scheduler-secret',credential),timeout_milliseconds:=110000);
end;$$;
-- Old pilot fields remain as historical metadata; active functions no longer use them.
update vb_private.bcm_ai_config set pilot_client_id=null where singleton;
notify pgrst,'reload schema';
commit;
