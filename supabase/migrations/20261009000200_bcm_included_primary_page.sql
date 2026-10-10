-- Follow-up to configured public pages: the primary URL must be included.
-- Preserve existing snapshots, membership rules and worker-only finalization.
begin;

create or replace function public.vb_finish_bcm_baseline(ticket uuid,snapshot jsonb,failure boolean) returns text
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
  or exists(select 1 from vb_private.staff_members where user_id=run.requested_by) then
  update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed';
 end if;
 if run.scan_type='comparison' then
  select * into prior from public.vb_bcm_scans where id=run.baseline_id and client_id=run.client_id and settings_version=run.settings_version and scan_type='baseline' and status='completed';
  if not found then update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed'; end if;
 end if;
 if snapshot is null or jsonb_typeof(snapshot)<>'object' or snapshot->>'extractor' not in ('source-text-v1','source-text-v2')
  or jsonb_typeof(snapshot->'text') is distinct from 'string' or length(snapshot->>'text') not between 40 and 60000
  or jsonb_typeof(snapshot->'title') is distinct from 'string' or length(snapshot->>'title')>500
  or jsonb_typeof(snapshot->'headings') is distinct from 'array' or octet_length(snapshot::text)>550000 then raise exception 'Invalid snapshot'; end if;
 if snapshot->>'extractor'='source-text-v1' then
  if cardinality(cfg.urls)<>1 or cfg.urls[1] not in ('https://cotivate.com','https://cotivate.com/') or snapshot->>'url' is distinct from 'https://cotivate.com/' then raise exception 'Invalid legacy snapshot'; end if;
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
 update public.vb_bcm_scans set status='completed',finished_at=now(),snapshot=vb_finish_bcm_baseline.snapshot where id=ticket;
 return 'completed';
end; $$;


revoke all on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) to service_role;
commit;
