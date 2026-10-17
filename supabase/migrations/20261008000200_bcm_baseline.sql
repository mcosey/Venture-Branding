-- Cotivate-only manual baseline pilot. No scheduler or AI findings.
begin;
create table public.vb_bcm_scans (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.vb_clients(id),
 requested_by uuid not null references auth.users(id),
 settings_version integer not null,
 status text not null default 'running' check(status in ('running','completed','failed')),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 snapshot jsonb,
 check((status='completed' and snapshot is not null) or (status<>'completed' and snapshot is null))
);
create index vb_bcm_scans_client_time on public.vb_bcm_scans(client_id,started_at desc);
create unique index vb_bcm_one_baseline on public.vb_bcm_scans(client_id,settings_version) where status='completed';
alter table public.vb_bcm_scans enable row level security;
revoke all on public.vb_bcm_scans from public,anon,authenticated;
grant select on public.vb_bcm_scans to authenticated;
grant all on public.vb_bcm_scans to service_role;
create policy bcm_scans_read on public.vb_bcm_scans for select to authenticated
 using(vb_private.is_client_member(client_id) or (select vb_private.is_staff()));
create trigger vb_bcm_scan_audit after insert or update on public.vb_bcm_scans for each row execute function vb_private.audit_record();
create function public.vb_begin_bcm_baseline(target_client uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; result uuid;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if not found or expected_version is null or cfg.version<>expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 if cfg.access_mode<>'public' or cardinality(cfg.urls)<>1 or cfg.urls[1] not in ('https://cotivate.com','https://cotivate.com/') or '/'=any(cfg.exclusions)
 then raise exception 'Cotivate homepage public pilot only' using errcode='22023'; end if;
 if exists(select 1 from public.vb_bcm_scans where client_id=target_client and ((status='completed' and settings_version=cfg.version) or started_at>now()-interval '2 minutes')) then raise exception 'Baseline exists or wait before retrying' using errcode='40001'; end if;
 update public.vb_bcm_scans set status='failed',finished_at=now() where client_id=target_client and status='running';
 insert into public.vb_bcm_scans(client_id,requested_by,settings_version) values(target_client,auth.uid(),cfg.version) returning id into result;
 return result;
end;$$;
revoke all on function public.vb_begin_bcm_baseline(uuid,integer) from public,anon;
grant execute on function public.vb_begin_bcm_baseline(uuid,integer) to authenticated;
create function public.vb_finish_bcm_baseline(ticket uuid,snapshot jsonb,failure boolean) returns text
language plpgsql security definer set search_path='' as $$
declare run public.vb_bcm_scans; cfg public.vb_bcm_settings; target uuid;
begin
 select client_id into target from public.vb_bcm_scans where id=ticket;
 if target is null then raise exception 'Unknown scan'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into run from public.vb_bcm_scans where id=ticket for update;
 if run.status<>'running' then return run.status; end if;
 select * into cfg from public.vb_bcm_settings where client_id=run.client_id;
 if failure is distinct from false or cfg.version is distinct from run.settings_version or run.started_at<now()-interval '2 minutes'
 or not exists(select 1 from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id where m.client_id=run.client_id and m.user_id=run.requested_by and m.active and c.portal_enabled and c.archived_at is null)
 or exists(select 1 from vb_private.staff_members where user_id=run.requested_by) then
  update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed';
 end if;
 if snapshot is null or jsonb_typeof(snapshot)<>'object' or snapshot->>'url' is distinct from 'https://cotivate.com/' or snapshot->>'extractor' is distinct from 'source-text-v1'
 or jsonb_typeof(snapshot->'text') is distinct from 'string' or length(snapshot->>'text') not between 40 and 60000
 or jsonb_typeof(snapshot->'title') is distinct from 'string' or length(snapshot->>'title')>500
 or jsonb_typeof(snapshot->'headings') is distinct from 'array' or octet_length(snapshot::text)>100000 then raise exception 'Invalid snapshot'; end if;
 update public.vb_bcm_scans set status='completed',finished_at=now(),snapshot=vb_finish_bcm_baseline.snapshot where id=ticket;
 return 'completed';
end;$$;
revoke all on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) to service_role;
commit;
