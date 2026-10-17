-- A later manual scan is compared with the saved baseline; no legal risk score.
begin;
alter table public.vb_bcm_scans add column scan_type text not null default 'baseline' check(scan_type in ('baseline','comparison'));
alter table public.vb_bcm_scans add column baseline_id uuid references public.vb_bcm_scans(id);
alter table public.vb_bcm_scans add constraint bcm_scan_baseline_link_check check((scan_type='baseline' and baseline_id is null) or (scan_type='comparison' and baseline_id is not null));
drop index public.vb_bcm_one_baseline;
create unique index vb_bcm_one_baseline on public.vb_bcm_scans(client_id,settings_version) where status='completed' and scan_type='baseline';
create function public.vb_begin_bcm_comparison(target_client uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; prior public.vb_bcm_scans; result uuid;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if not found or expected_version is null or cfg.version<>expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 if cfg.access_mode<>'public' or cardinality(cfg.urls)<>1 or cfg.urls[1] not in ('https://cotivate.com','https://cotivate.com/') or '/'=any(cfg.exclusions)
 then raise exception 'Cotivate homepage public pilot only' using errcode='22023'; end if;
 select * into prior from public.vb_bcm_scans where client_id=target_client and settings_version=cfg.version and scan_type='baseline' and status='completed' order by finished_at desc limit 1;
 if not found then raise exception 'A saved baseline is required' using errcode='40001'; end if;
 if exists(select 1 from public.vb_bcm_scans where client_id=target_client and started_at>now()-interval '2 minutes') then raise exception 'Wait before scanning again' using errcode='40001'; end if;
 update public.vb_bcm_scans set status='failed',finished_at=now() where client_id=target_client and status='running';
 insert into public.vb_bcm_scans(client_id,requested_by,settings_version,scan_type,baseline_id) values(target_client,auth.uid(),cfg.version,'comparison',prior.id) returning id into result;
 return result;
end;$$;
revoke all on function public.vb_begin_bcm_comparison(uuid,integer) from public,anon;
grant execute on function public.vb_begin_bcm_comparison(uuid,integer) to authenticated;
create or replace function public.vb_finish_bcm_baseline(ticket uuid,snapshot jsonb,failure boolean) returns text
language plpgsql security definer set search_path='' as $$
declare run public.vb_bcm_scans; cfg public.vb_bcm_settings; prior public.vb_bcm_scans; target uuid;
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
 or exists(select 1 from vb_private.staff_members where user_id=run.requested_by) then
  update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed';
 end if;
 if run.scan_type='comparison' then
  select * into prior from public.vb_bcm_scans where id=run.baseline_id and client_id=run.client_id and settings_version=run.settings_version and scan_type='baseline' and status='completed';
  if not found then update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed'; end if;
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
