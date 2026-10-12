-- DRAFT / NOT APPLIED. Review and test in BCM Test before any deployment.
-- No credentials, new accounts, schedules or asset records are created.
begin;
alter table public.vb_bcm_settings add column discovery_mode text not null default 'pages' check(discovery_mode in ('pages','site'));
alter table public.vb_bcm_settings add constraint bcm_discovery_single_root check(discovery_mode<>'site' or cardinality(urls)=1);
create or replace function public.vb_save_bcm_settings(target_client uuid, expected_version integer, details jsonb, authorized boolean)
returns public.vb_bcm_settings language plpgsql security definer set search_path='' as $$
declare saved public.vb_bcm_settings; sources text[]; exclusion_paths text[]; kinds text[]; item text;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 if authorized is distinct from true or expected_version is null or expected_version<0 or details is null or jsonb_typeof(details)<>'object' then raise exception 'Invalid settings' using errcode='22023'; end if;
 if details - array['urls','exclusions','access_mode','frequency','categories','discovery_mode'] <> '{}'::jsonb
 or not(details ?& array['urls','exclusions','access_mode','frequency','categories'])
 or jsonb_typeof(details->'urls') is distinct from 'array' or jsonb_typeof(details->'exclusions') is distinct from 'array'
 or jsonb_typeof(details->'categories') is distinct from 'array'
 or coalesce(details->>'access_mode','') not in ('public','account')
 or coalesce(details->>'frequency','') not in ('weekly','monthly')
 or coalesce(details->>'discovery_mode','pages') not in ('pages','site')
 or (details ? 'discovery_mode' and jsonb_typeof(details->'discovery_mode') is distinct from 'string') then raise exception 'Invalid settings' using errcode='22023'; end if;
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
 if details->>'discovery_mode'='site' then
  if cardinality(sources)<>1 then raise exception 'Use one website address' using errcode='22023'; end if;
  sources[1]:=regexp_replace(sources[1],'^https://([^/]+)', 'https://' || lower(substring(sources[1] from '^https://([^/]+)')));
  sources[1]:=regexp_replace(sources[1],':443(/|$)', '\1');
  if sources[1] !~ '^https://[^/]+/' then sources[1]:=sources[1]||'/'; end if;
 end if;
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
 insert into public.vb_bcm_settings as existing(client_id,urls,exclusions,access_mode,frequency,categories,authorized_by,discovery_mode)
 values(target_client,sources,exclusion_paths,details->>'access_mode',details->>'frequency',kinds,auth.uid(),coalesce(details->>'discovery_mode','pages'))
 on conflict(client_id) do update set urls=excluded.urls,exclusions=excluded.exclusions,access_mode=excluded.access_mode,
 frequency=excluded.frequency,categories=excluded.categories,discovery_mode=excluded.discovery_mode,version=existing.version+1,authorized_by=auth.uid(),authorized_at=now()
 returning * into saved;
 return saved;
end; $$;
revoke all on function public.vb_save_bcm_settings(uuid,integer,jsonb,boolean) from public,anon;
grant execute on function public.vb_save_bcm_settings(uuid,integer,jsonb,boolean) to authenticated;

-- DRAFT ONLY: not executed. Included by setup.sql after the discovery_mode column exists.
create or replace function vb_private.check_bcm_discovery_snapshot(cfg public.vb_bcm_settings,payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare origin text; captured text[]; entry jsonb; address text; pathname text; assembled text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 origin:=substring(cfg.urls[1] from '^https://[^/]+');
 if cfg.access_mode<>'public' or cfg.discovery_mode<>'site' or cardinality(cfg.urls)<>1
 or payload->>'url' is distinct from cfg.urls[1] or payload->>'scope' is distinct from origin
 or payload - array['url','urls','pages','title','headings','text','extractor','observations','coverage','scope'] <> '{}'::jsonb
 or not(payload ?& array['url','urls','pages','title','headings','text','extractor','observations','coverage','scope'])
 or jsonb_typeof(payload->'urls') is distinct from 'array' or jsonb_typeof(payload->'pages') is distinct from 'array'
 or jsonb_typeof(payload->'observations') is distinct from 'array' or jsonb_typeof(payload->'coverage') is distinct from 'object'
 then raise exception 'Invalid discovery snapshot'; end if;
 if jsonb_array_length(payload->'pages') not between 1 and 30
 or jsonb_array_length(payload->'pages')<>jsonb_array_length(payload->'urls') or jsonb_array_length(payload->'observations')>200
 then raise exception 'Discovery limits exceeded'; end if;
 select array_agg(value->>'url' order by ordinality),string_agg(value->>'text',E'\n' order by ordinality) into captured,assembled
 from jsonb_array_elements(payload->'pages') with ordinality;
 if cardinality(captured)<>(select count(distinct x) from unnest(captured) x)
 or assembled is distinct from payload->>'text'
 or (select jsonb_agg(to_jsonb(x) order by n) from unnest(captured) with ordinality a(x,n)) is distinct from payload->'urls'
 then raise exception 'Inconsistent discovery pages'; end if;
 for entry in select value from jsonb_array_elements(payload->'pages') loop
  address:=entry->>'url';pathname:=substring(address from '^https://[^/]+(/.*)$');
  if jsonb_typeof(entry) is distinct from 'object' or entry - array['url','title','headings','text','extractor'] <> '{}'::jsonb
  or jsonb_typeof(entry->'url') is distinct from 'string' or length(address)>2048
  or address !~ '^https://[A-Za-z0-9.-]+/[^[:space:]?#]*$' or substring(address from '^https://[^/]+') is distinct from origin
  or jsonb_typeof(entry->'text') is distinct from 'string' or length(entry->>'text') not between 8 and 60000
  or jsonb_typeof(entry->'title') is distinct from 'string' or length(entry->>'title')>500
  or jsonb_typeof(entry->'headings') is distinct from 'array' or entry->>'extractor' is distinct from 'source-text-v2'
  or pathname ~* '(^|/)(login|logout|sign-in|sign-out|account|billing|checkout|cart|delete|unsubscribe)(/|$)'
  or exists(select 1 from unnest(cfg.exclusions) e where e='/' or pathname=e or pathname like rtrim(e,'/')||'/%')
  then raise exception 'Discovery page is not allowed'; end if;
  if jsonb_array_length(entry->'headings')>100 or exists(select 1 from jsonb_array_elements(entry->'headings') h(value) where jsonb_typeof(value)<>'string' or length(value#>>'{}')>500) then raise exception 'Invalid page headings'; end if;
 end loop;
 if jsonb_array_length(payload->'headings')>100 or exists(select 1 from jsonb_array_elements(payload->'headings') h(value) where jsonb_typeof(value)<>'string' or length(value#>>'{}')>500) then raise exception 'Invalid headings'; end if;
 for entry in select value from jsonb_array_elements(payload->'observations') loop
  address:=entry->>'destination';
  if jsonb_typeof(entry) is distinct from 'object' or entry - array['label','destination','sourceUrl'] <> '{}'::jsonb
  or jsonb_typeof(entry->'label') is distinct from 'string' or length(entry->>'label') not between 1 and 80
  or not(coalesce(entry->>'sourceUrl','')=any(captured)) or jsonb_typeof(entry->'destination') is distinct from 'string'
  or length(address)>2048 or address !~ '^https://[A-Za-z0-9.-]+/[^[:space:]?#]*$'
  or substring(address from '^https://[^/]+') is distinct from origin then raise exception 'Invalid navigation evidence'; end if;
 end loop;
 entry:=payload->'coverage';
 if entry - array['status','captured','discovered','skipped','pending','reasons','limits'] <> '{}'::jsonb
 or not(entry ?& array['status','captured','discovered','skipped','pending','reasons','limits'])
 or coalesce(entry->>'status','') not in ('captured','partial')
 or jsonb_typeof(entry->'captured') is distinct from 'number' or jsonb_typeof(entry->'discovered') is distinct from 'number'
 or jsonb_typeof(entry->'pending') is distinct from 'number' or jsonb_typeof(entry->'skipped') is distinct from 'array'
 or jsonb_typeof(entry->'reasons') is distinct from 'array'
 or entry->'limits' is distinct from '{"pages":30,"queue":200,"text":60000,"duration":90000,"sitemaps":5,"concurrency":4}'::jsonb
 then raise exception 'Invalid coverage'; end if;
 if (entry->>'captured')::numeric<>cardinality(captured) or (entry->>'discovered')::numeric not between cardinality(captured) and 200
 or (entry->>'pending')::numeric not between 0 and 200 or (entry->>'pending')::numeric<>trunc((entry->>'pending')::numeric)
 or (entry->>'discovered')::numeric<>trunc((entry->>'discovered')::numeric)
 or (entry->>'captured')::numeric+(entry->>'pending')::numeric>(entry->>'discovered')::numeric
 or jsonb_array_length(entry->'skipped')>200 or jsonb_array_length(entry->'reasons')>4
 or (entry->>'status'='captured' and (jsonb_array_length(entry->'skipped')>0 or jsonb_array_length(entry->'reasons')>0 or (entry->>'pending')::numeric>0))
 then raise exception 'Inconsistent coverage'; end if;
 if exists(select 1 from jsonb_array_elements(entry->'reasons') r(value) where jsonb_typeof(value)<>'string' or value#>>'{}' not in ('Discovery queue limit reached','Sitemap discovery limit reached','Saved text limit reached','Scan time limit reached','Page limit reached')) then raise exception 'Invalid coverage reason'; end if;
 for entry in select value from jsonb_array_elements(payload->'coverage'->'skipped') loop
  address:=entry->>'url';
  if jsonb_typeof(entry) is distinct from 'object' or entry - array['url','reason'] <> '{}'::jsonb
  or jsonb_typeof(entry->'url') is distinct from 'string' or length(address)>2048
  or address !~ '^https://[A-Za-z0-9.-]+/[^[:space:]?#]*$' or substring(address from '^https://[^/]+') is distinct from origin
  or coalesce(entry->>'reason','') not in ('Excluded path','Account or action page','Saved text limit reached','Page exceeds 1 MB download limit','Page unreadable, redirected, unsafe, or requires access')
  then raise exception 'Invalid skipped page'; end if;
 end loop;
end; $$;
revoke all on function vb_private.check_bcm_discovery_snapshot(public.vb_bcm_settings,jsonb) from public,anon,authenticated;
grant execute on function vb_private.check_bcm_discovery_snapshot(public.vb_bcm_settings,jsonb) to service_role;
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
 update public.vb_bcm_scans set status='completed',finished_at=now(),snapshot=vb_finish_bcm_baseline.snapshot where id=ticket;
 return 'completed';
end; $$;


revoke all on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.vb_finish_bcm_baseline(uuid,jsonb,boolean) to service_role;
commit;
