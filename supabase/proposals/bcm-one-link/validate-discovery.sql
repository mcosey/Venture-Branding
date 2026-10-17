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
