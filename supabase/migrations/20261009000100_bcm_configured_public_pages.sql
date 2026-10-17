-- Let the manual BCM scanner use the authenticated client's saved public pages.
-- Authenticated-page scanning and scheduled runs remain out of scope.
begin;

create or replace function public.vb_save_bcm_settings(target_client uuid, expected_version integer, details jsonb, authorized boolean)
returns public.vb_bcm_settings language plpgsql security definer set search_path='' as $$
declare saved public.vb_bcm_settings; sources text[]; exclusion_paths text[]; kinds text[]; item text;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 if authorized is distinct from true or expected_version is null or expected_version<0 or details is null or jsonb_typeof(details)<>'object' then raise exception 'Invalid settings' using errcode='22023'; end if;
 if details - array['urls','exclusions','access_mode','frequency','categories'] <> '{}'::jsonb
 or not(details ?& array['urls','exclusions','access_mode','frequency','categories'])
 or jsonb_typeof(details->'urls') is distinct from 'array' or jsonb_typeof(details->'exclusions') is distinct from 'array'
 or jsonb_typeof(details->'categories') is distinct from 'array'
 or coalesce(details->>'access_mode','') not in ('public','account')
 or coalesce(details->>'frequency','') not in ('weekly','monthly') then raise exception 'Invalid settings' using errcode='22023'; end if;
 if jsonb_array_length(details->'urls') not between 1 and 20 or jsonb_array_length(details->'exclusions')>50
 or jsonb_array_length(details->'categories') not between 1 and 7 then raise exception 'Invalid settings' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements((details->'urls')||(details->'exclusions')||(details->'categories')) as elems(value) where jsonb_typeof(value)<>'string') then raise exception 'Invalid settings' using errcode='22023'; end if;
 select array_agg(btrim(value)) into sources from jsonb_array_elements_text(details->'urls');
 select coalesce(array_agg(btrim(value)),'{}'::text[]) into exclusion_paths from jsonb_array_elements_text(details->'exclusions');
 select array_agg(value) into kinds from jsonb_array_elements_text(details->'categories');
 foreach item in array sources loop
  if length(item)>2048 or item !~ '^https://[A-Za-z0-9.-]+(:443)?(/[^[:space:]?#@]*)?$'
   or item ~* '^https://(localhost|[^/]*\.(localhost|local|internal|test|invalid|example|lan|home\.arpa))(:443)?(/|$)'
   or item ~ '^https://[0-9]{1,3}(\.[0-9]{1,3}){3}(:443)?(/|$)'
  then raise exception 'Use public HTTPS page URLs without credentials, query strings, fragments or custom ports' using errcode='22023'; end if;
 end loop;
 foreach item in array exclusion_paths loop
  if length(item) not between 1 and 512 or item !~ '^/[^[:space:]?#]*$' then raise exception 'Invalid excluded path' using errcode='22023'; end if;
 end loop;
 if not(kinds <@ array['product_names','feature_names','slogans','logos','sub_brands','renames','presentation']::text[])
 or cardinality(kinds)<>(select count(distinct x) from unnest(kinds) x)
 or cardinality(sources)<>(select count(distinct x) from unnest(sources) x)
 then raise exception 'Invalid or duplicate settings' using errcode='22023'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into saved from public.vb_bcm_settings where client_id=target_client;
 if (found and saved.version<>expected_version) or (not found and expected_version<>0) then raise exception 'Settings changed; reload first' using errcode='40001'; end if;
 insert into public.vb_bcm_settings as existing(client_id,urls,exclusions,access_mode,frequency,categories,authorized_by)
 values(target_client,sources,exclusion_paths,details->>'access_mode',details->>'frequency',kinds,auth.uid())
 on conflict(client_id) do update set urls=excluded.urls,exclusions=excluded.exclusions,access_mode=excluded.access_mode,
 frequency=excluded.frequency,categories=excluded.categories,version=existing.version+1,authorized_by=auth.uid(),authorized_at=now()
 returning * into saved;
 return saved;
end; $$;
revoke all on function public.vb_save_bcm_settings(uuid,integer,jsonb,boolean) from public,anon;
grant execute on function public.vb_save_bcm_settings(uuid,integer,jsonb,boolean) to authenticated;

create or replace function public.vb_begin_bcm_baseline(target_client uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; result uuid;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if not found or expected_version is null or cfg.version<>expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 if cfg.access_mode<>'public' or cardinality(cfg.urls) not between 1 and 20
  or cardinality(cfg.urls)=(select count(*) from unnest(cfg.urls) u where exists(select 1 from unnest(cfg.exclusions) e where e='/' or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1)=e or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1) like rtrim(e,'/')||'/%'))
 then raise exception 'Save at least one included public HTTPS page' using errcode='22023'; end if;
 if exists(select 1 from public.vb_bcm_scans where client_id=target_client and ((status='completed' and settings_version=cfg.version and scan_type='baseline') or started_at>now()-interval '2 minutes')) then raise exception 'Baseline exists or wait before retrying' using errcode='40001'; end if;
 update public.vb_bcm_scans set status='failed',finished_at=now() where client_id=target_client and status='running';
 insert into public.vb_bcm_scans(client_id,requested_by,settings_version) values(target_client,auth.uid(),cfg.version) returning id into result;
 return result;
end; $$;

create or replace function public.vb_begin_bcm_comparison(target_client uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; prior public.vb_bcm_scans; result uuid;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if not found or expected_version is null or cfg.version<>expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 if cfg.access_mode<>'public' or cardinality(cfg.urls) not between 1 and 20
  or cardinality(cfg.urls)=(select count(*) from unnest(cfg.urls) u where exists(select 1 from unnest(cfg.exclusions) e where e='/' or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1)=e or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1) like rtrim(e,'/')||'/%'))
 then raise exception 'Save at least one included public HTTPS page' using errcode='22023'; end if;
 select * into prior from public.vb_bcm_scans where client_id=target_client and settings_version=cfg.version and scan_type='baseline' and status='completed' order by finished_at desc limit 1;
 if not found then raise exception 'A saved baseline is required' using errcode='40001'; end if;
 if exists(select 1 from public.vb_bcm_scans where client_id=target_client and started_at>now()-interval '2 minutes') then raise exception 'Wait before scanning again' using errcode='40001'; end if;
 update public.vb_bcm_scans set status='failed',finished_at=now() where client_id=target_client and status='running';
 insert into public.vb_bcm_scans(client_id,requested_by,settings_version,scan_type,baseline_id) values(target_client,auth.uid(),cfg.version,'comparison',prior.id) returning id into result;
 return result;
end; $$;

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
  if snapshot->>'url' is distinct from cfg.urls[1] then raise exception 'Snapshot primary URL does not match settings'; end if;
 end if;
 update public.vb_bcm_scans set status='completed',finished_at=now(),snapshot=vb_finish_bcm_baseline.snapshot where id=ticket;
 return 'completed';
end; $$;

revoke all on function public.vb_begin_bcm_baseline(uuid,integer) from public,anon;
grant execute on function public.vb_begin_bcm_baseline(uuid,integer) to authenticated;
revoke all on function public.vb_begin_bcm_comparison(uuid,integer) from public,anon;
grant execute on function public.vb_begin_bcm_comparison(uuid,integer) to authenticated;
revoke all on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) to service_role;
commit;
