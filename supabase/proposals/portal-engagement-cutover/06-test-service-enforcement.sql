-- Prepared, NOT applied. Run immediately after 05 in the SAME transaction.
-- Reconcile new rows created since the approved snapshot. This is allowed only
-- while the four clients still have exactly their one reviewed engagement each (05 guard).
do $$ declare r text; keys text[]; begin
 foreach r in array array['public.vb_bcm_ai_observations','public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews','public.vb_bcm_ai_runs','public.vb_bcm_scans','public.vb_bcm_schedules','public.vb_bcm_settings','public.vb_client_references','public.vb_digest_preferences','public.vb_evidence','public.vb_filing_drafts','public.vb_inbox','public.vb_maintenance_publications','public.vb_marks','public.vb_service_preferences','vb_private.maintenance_drafts','vb_private.watch_findings','vb_private.watch_runs','vb_private.watch_settings'] loop
  select array_agg(a.attname::text order by k.n) into keys from pg_index x cross join lateral unnest(x.indkey) with ordinality k(attnum,n) join pg_attribute a on a.attrelid=x.indrelid and a.attnum=k.attnum where x.indrelid=r::regclass and x.indisprimary;
  if keys is null then raise exception 'Missing primary key'; end if;
  execute format($q$insert into vb_private.legacy_test_record_scopes(resource,record_key,client_id,engagement_id,matter_id,source_fingerprint)
   select $1,(select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(t)) where key=any($2)),t.client_id,m.engagement_id,m.matter_id,md5(to_jsonb(t)::text)
   from %s t join vb_private.legacy_test_mappings m on m.client_id=t.client_id on conflict(resource,record_key) do nothing$q$,r::regclass) using r,keys;
 end loop;
end $$;
-- public.vb_bcm_ai_observations: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_ai_observations for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','id');
create policy portal_scoped_read on public.vb_bcm_ai_observations as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_ai_observations',jsonb_build_object('id',id),'brand_change_monitor'));
-- public.vb_bcm_ai_publications: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_ai_publications for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','finding_id');
create policy portal_scoped_read on public.vb_bcm_ai_publications as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_ai_publications',jsonb_build_object('finding_id',finding_id),'brand_change_monitor'));
-- public.vb_bcm_ai_reviews: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_ai_reviews for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','id');
create policy portal_scoped_read on public.vb_bcm_ai_reviews as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_ai_reviews',jsonb_build_object('id',id),'brand_change_monitor'));
-- public.vb_bcm_ai_runs: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_ai_runs for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','id');
create policy portal_scoped_read on public.vb_bcm_ai_runs as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_ai_runs',jsonb_build_object('id',id),'brand_change_monitor'));
-- public.vb_bcm_scans: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_scans for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','id');
create policy portal_scoped_read on public.vb_bcm_scans as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_scans',jsonb_build_object('id',id),'brand_change_monitor'));
-- public.vb_bcm_schedules: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_schedules for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','client_id');
create policy portal_scoped_read on public.vb_bcm_schedules as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_schedules',jsonb_build_object('client_id',client_id),'brand_change_monitor'));
-- public.vb_bcm_settings: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_bcm_settings for each row execute function vb_private.portal_scope_new_record('brand_change_monitor','client_id');
create policy portal_scoped_read on public.vb_bcm_settings as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_bcm_settings',jsonb_build_object('client_id',client_id),'brand_change_monitor'));
-- public.vb_client_references: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_client_references for each row execute function vb_private.portal_scope_new_record('portfolio','client_id');
create policy portal_scoped_read on public.vb_client_references as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_client_references',jsonb_build_object('client_id',client_id),'portfolio'));
-- public.vb_digest_preferences: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_digest_preferences for each row execute function vb_private.portal_scope_new_record('activity_digest','user_id,client_id');
create policy portal_scoped_read on public.vb_digest_preferences as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_digest_preferences',jsonb_build_object('user_id',user_id,'client_id',client_id),'activity_digest'));
-- public.vb_evidence: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_evidence for each row execute function vb_private.portal_scope_new_record('use_history','id');
create policy portal_scoped_read on public.vb_evidence as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_evidence',jsonb_build_object('id',id),'use_history'));
-- public.vb_filing_drafts: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_filing_drafts for each row execute function vb_private.portal_scope_new_record('portfolio','id');
create policy portal_scoped_read on public.vb_filing_drafts as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_filing_drafts',jsonb_build_object('id',id),'portfolio'));
-- public.vb_inbox: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_inbox for each row execute function vb_private.portal_scope_new_record('messages','id');
create policy portal_scoped_read on public.vb_inbox as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_inbox',jsonb_build_object('id',id),'messages'));
-- public.vb_maintenance_publications: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_maintenance_publications for each row execute function vb_private.portal_scope_new_record('maintenance_reminder','id');
create policy portal_scoped_read on public.vb_maintenance_publications as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_maintenance_publications',jsonb_build_object('id',id),'maintenance_reminder'));
-- public.vb_marks: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_marks for each row execute function vb_private.portal_scope_new_record('portfolio','id');
create policy portal_scoped_read on public.vb_marks as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_marks',jsonb_build_object('id',id),'portfolio'));
-- public.vb_service_preferences: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on public.vb_service_preferences for each row execute function vb_private.portal_scope_new_record('preference','client_id,service');
create policy portal_scoped_read on public.vb_service_preferences as restrictive for select to authenticated using(vb_private.portal_row_read(client_id,'public.vb_service_preferences',jsonb_build_object('client_id',client_id,'service',service),case service when 'specimen_capture' then 'use_history' else service end));
create policy portal_scoped_preference_write on public.vb_service_preferences as restrictive for update to authenticated using(vb_private.portal_row_read(client_id,'public.vb_service_preferences',jsonb_build_object('client_id',client_id,'service',service),case service when 'specimen_capture' then 'use_history' else service end)) with check(vb_private.portal_row_read(client_id,'public.vb_service_preferences',jsonb_build_object('client_id',client_id,'service',service),case service when 'specimen_capture' then 'use_history' else service end));
-- vb_private.maintenance_drafts: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on vb_private.maintenance_drafts for each row execute function vb_private.portal_scope_new_record('maintenance_reminder','id');
-- vb_private.watch_findings: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on vb_private.watch_findings for each row execute function vb_private.portal_scope_new_record('trademark_watch','id');
-- vb_private.watch_runs: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on vb_private.watch_runs for each row execute function vb_private.portal_scope_new_record('trademark_watch','id');
-- vb_private.watch_settings: existing rows keep their mapped engagement, new rows inherit a validated parent/binding.
create trigger zz_portal_scope after insert or update on vb_private.watch_settings for each row execute function vb_private.portal_scope_new_record('trademark_watch','client_id');
create function vb_private.portal_digest_source(cid uuid,resource_name text,key_value jsonb,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) or exists(select 1 from vb_private.portal_service_bindings b join vb_private.legacy_test_record_scopes r on r.engagement_id=b.engagement_id and r.client_id=b.client_id
 join vb_private.engagement_grants g on g.engagement_id=b.engagement_id
 where b.client_id=cid and b.service='activity_digest' and r.resource=resource_name and r.record_key=key_value
 and vb_private.portal_actor_scope(b.engagement_id,g.user_id,feature)
 and (auth.uid() is null or g.user_id=auth.uid()));
$$;
revoke all on function vb_private.portal_digest_source(uuid,text,jsonb,text) from public,anon,authenticated;
do $$ begin if md5(pg_get_functiondef('public.vb_bcm_ai_baseline_progress(uuid)'::regprocedure))<>'6b98682096f7cda551564ec5b20859a6' then raise exception 'Definition changed: vb_bcm_ai_baseline_progress'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_bcm_ai_baseline_progress(target_client uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare hostname text; passes integer;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
 if not (vb_private.is_staff() or vb_private.is_client_member(target_client)) then raise exception 'Client access required' using errcode='42501';end if;
 select vb_private.bcm_ai_domain(urls[1]) into hostname from public.vb_bcm_settings where client_id=target_client;
 select least(count(*),3)::integer into passes from public.vb_bcm_ai_runs where client_id=target_client and domain=hostname and vb_private.portal_row_read(client_id,'public.vb_bcm_ai_runs',jsonb_build_object('id',id),'brand_change_monitor') and status='completed';
 return jsonb_build_object('completed',passes,'remaining',3-passes);
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_bcm_ai_client_history(uuid)'::regprocedure))<>'19ea113e34def1873e95d159f12bd3a2' then raise exception 'Definition changed: vb_bcm_ai_client_history'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_bcm_ai_client_history(target_client uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select id,status,started_at,finished_at,observation_count from public.vb_bcm_ai_runs where client_id=target_client and vb_private.portal_row_read(client_id,'public.vb_bcm_ai_runs',jsonb_build_object('id',id),'brand_change_monitor') order by started_at desc limit 20) r),'[]');
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_begin_bcm_ai_run(uuid,integer)'::regprocedure))<>'11c586de024a04afdfcebdf997b4b2f4' then raise exception 'Definition changed: vb_begin_bcm_ai_run'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_begin_bcm_ai_run(target_client uuid, expected_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
 if not vb_private.is_client_member(target_client) or public.vb_session_role()<>'client' then raise exception 'Client access required' using errcode='42501'; end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 -- Reserve first under the global lock; mismatch raises and rolls back the reservation.
 result:=vb_private.reserve_bcm_ai(target_client,auth.uid(),null);
 if (result->'settings'->>'version')::integer is distinct from expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 return result;
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_begin_bcm_baseline(uuid,integer)'::regprocedure))<>'90da20a412774aec7f552255e2a2d04a' then raise exception 'Definition changed: vb_begin_bcm_baseline'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_begin_bcm_baseline(target_client uuid, expected_version integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cfg public.vb_bcm_settings; result uuid;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
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
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_begin_bcm_comparison(uuid,integer)'::regprocedure))<>'e60d94fdfd99f5e6c2e034f12ac7ba6c' then raise exception 'Definition changed: vb_begin_bcm_comparison'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_begin_bcm_comparison(target_client uuid, expected_version integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cfg public.vb_bcm_settings; prior public.vb_bcm_scans; result uuid;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if not found or expected_version is null or cfg.version<>expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 if cfg.access_mode<>'public' or cardinality(cfg.urls) not between 1 and 20
 or cardinality(cfg.urls)=(select count(*) from unnest(cfg.urls) u where exists(select 1 from unnest(cfg.exclusions) e where e='/' or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1)=e or split_part(regexp_replace(u,'^https://[^/]+',''),'?',1) like rtrim(e,'/')||'/%'))
 then raise exception 'Save at least one included public HTTPS page' using errcode='22023'; end if;
 select * into prior from public.vb_bcm_scans where client_id=target_client and settings_version=cfg.version and scan_type='baseline' and vb_private.portal_row_read(client_id,'public.vb_bcm_scans',jsonb_build_object('id',id),'brand_change_monitor') and status='completed' order by finished_at desc limit 1;
 if not found then raise exception 'A saved baseline is required' using errcode='40001'; end if;
 if exists(select 1 from public.vb_bcm_scans where client_id=target_client and started_at>now()-interval '2 minutes') then raise exception 'Wait before scanning again' using errcode='40001'; end if;
 update public.vb_bcm_scans set status='failed',finished_at=now() where client_id=target_client and status='running';
 insert into public.vb_bcm_scans(client_id,requested_by,settings_version,scan_type,baseline_id) values(target_client,auth.uid(),cfg.version,'comparison',prior.id) returning id into result;
 return result;
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_save_bcm_settings(uuid,integer,jsonb,boolean)'::regprocedure))<>'cd69f65ad763542173ad4bb363633170' then raise exception 'Definition changed: vb_save_bcm_settings'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_save_bcm_settings(target_client uuid, expected_version integer, details jsonb, authorized boolean)
 RETURNS vb_bcm_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare saved public.vb_bcm_settings; sources text[]; exclusion_paths text[]; kinds text[]; item text;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
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
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_set_bcm_ai_monitoring(uuid,integer,integer,boolean)'::regprocedure))<>'7943b9b88ccdcae274e6af17084c87a2' then raise exception 'Definition changed: vb_set_bcm_ai_monitoring'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_set_bcm_ai_monitoring(target_client uuid, expected_settings_version integer, expected_revision integer, enabled boolean)
 RETURNS vb_bcm_schedules
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cfg public.vb_bcm_settings;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 perform 1 from public.vb_clients where id=target_client for update;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if enabled and (((public.vb_bcm_ai_baseline_progress(target_client)->>'remaining')::integer)>0 or not public.vb_bcm_ai_ready() or not coalesce(vb_private.bcm_ai_valid(cfg),false)) then raise exception 'AI research unavailable for these settings';end if;
 return public.vb_set_bcm_monitoring(target_client,expected_settings_version,expected_revision,enabled);
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_set_bcm_monitoring(uuid,integer,integer,boolean)'::regprocedure))<>'e3c78d691ee665fac72234832c4cc038' then raise exception 'Definition changed: vb_set_bcm_monitoring'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_set_bcm_monitoring(target_client uuid, expected_settings_version integer, expected_revision integer, enabled boolean)
 RETURNS vb_bcm_schedules
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cfg public.vb_bcm_settings; schedule public.vb_bcm_schedules;
begin
 perform vb_private.portal_require_service(target_client,'brand_change_monitor');
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
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_save_digest_preferences(uuid,integer,jsonb)'::regprocedure))<>'ad98deee2d560d2e5b81f35dec9ccd1b' then raise exception 'Definition changed: vb_save_digest_preferences'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_save_digest_preferences(target_client uuid, expected_version integer, details jsonb)
 RETURNS vb_digest_preferences
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cats text[];p public.vb_digest_preferences;
begin
 perform vb_private.portal_require_service(target_client,'activity_digest');
 perform vb_private.digest_scope(target_client);
 if jsonb_typeof(details->'categories') is distinct from 'array' then raise exception 'Choose digest results' using errcode='22023';end if;
 select array_agg(value order by value) into cats from jsonb_array_elements_text(details->'categories');
 if cats is null or cardinality(cats) not between 1 and 3 or not cats <@ array['bcm','use_history','maintenance']::text[] or cardinality(cats)<>(select count(distinct x) from unnest(cats) x)
 or details->>'frequency' is null or details->>'frequency' not in ('daily','weekly','monthly') or details->>'delivery' is distinct from 'account'
 then raise exception 'Check digest preferences' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||target_client::text,0));
 select * into p from public.vb_digest_preferences where user_id=auth.uid() and client_id=target_client for update;
 if expected_version is null or expected_version<>coalesce(p.version,0) then raise exception 'Preferences changed. Reload before saving.' using errcode='40001';end if;
 insert into public.vb_digest_preferences(user_id,client_id,categories,frequency) values(auth.uid(),target_client,cats,details->>'frequency')
 on conflict(user_id,client_id) do update set categories=excluded.categories,frequency=excluded.frequency,version=vb_digest_preferences.version+1,updated_at=now() returning * into p;
 return p;
end;$function$;
do $$ begin if md5(pg_get_functiondef('public.vb_generate_digest_sample(uuid,integer)'::regprocedure))<>'9e1f18db2bc36a3215fc1ae37ddaa67a' then raise exception 'Definition changed: vb_generate_digest_sample'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_generate_digest_sample(target_client uuid, expected_version integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.vb_digest_preferences;result uuid;since_time timestamptz;
begin
 perform vb_private.portal_require_service(target_client,'activity_digest');
 perform vb_private.digest_scope(target_client);
 select * into p from public.vb_digest_preferences where user_id=auth.uid() and client_id=target_client for share;
 if p.version is null or expected_version is null or p.version<>expected_version then raise exception 'Save or reload preferences first' using errcode='40001';end if;
 perform pg_advisory_xact_lock(hashtextextended('digest'||auth.uid()::text||target_client::text,0));
 if exists(select 1 from public.vb_inbox where recipient_id=auth.uid() and client_id=target_client and created_at>now()-interval '5 seconds') then raise exception 'Wait a moment before generating another sample' using errcode='40001';end if;
 since_time:=now()-case p.frequency when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '30 days' end;
 insert into public.vb_inbox(recipient_id,client_id,categories,frequency,period_start,source_items) values(auth.uid(),target_client,p.categories,p.frequency,since_time,vb_private.digest_items(target_client,p.categories,since_time)) returning id into result;
 return result;
end;$function$;
do $$ begin if md5(pg_get_functiondef('public.vb_open_inbox(uuid,uuid)'::regprocedure))<>'5ac1d772c9eaa5e613dc12c5f35632fa' then raise exception 'Definition changed: vb_open_inbox'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_open_inbox(target_client uuid, target_message uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare msg public.vb_inbox;items jsonb;
begin
 perform vb_private.portal_require_record('public.vb_inbox',jsonb_build_object('id',target_message),'messages',target_client);
 perform vb_private.digest_scope(target_client);
 select * into msg from public.vb_inbox where id=target_message and client_id=target_client and recipient_id=auth.uid();
 if msg.id is null then raise exception 'Message unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc),'[]'::jsonb) into items from (
 select 'bcm'::text source,s.id,'Completed BCM comparison — review possible changes'::text title,s.finished_at occurred_at from public.vb_bcm_scans s where s.client_id=target_client and vb_private.portal_row_read(target_client,'public.vb_bcm_scans',jsonb_build_object('id',s.id),'brand_change_monitor') and s.status='completed' and s.scan_type='comparison' and exists(select 1 from jsonb_array_elements(msg.source_items) j where j->>'source'='bcm' and j->>'id'=s.id::text)
 union all
 select 'use_history',e.id,'Upload available in Use History',e.uploaded_at from public.vb_evidence e join public.vb_marks m on m.id=e.mark_id and m.client_id=e.client_id where e.client_id=target_client and vb_private.portal_row_read(target_client,'public.vb_evidence',jsonb_build_object('id',e.id),'use_history') and e.removed_at is null and e.uploaded_at is not null and m.archived_at is null and exists(select 1 from jsonb_array_elements(msg.source_items) j where j->>'source'='use_history' and j->>'id'=e.id::text)
 union all
 select 'maintenance',p.id,p.description||' — due '||p.deadline::text,p.updated_at from public.vb_maintenance_publications p join public.vb_marks m on m.id=p.mark_id and m.client_id=p.client_id where p.client_id=target_client and vb_private.portal_row_read(target_client,'public.vb_maintenance_publications',jsonb_build_object('id',p.id),'maintenance_reminder') and p.withdrawn_at is null and m.archived_at is null and exists(select 1 from jsonb_array_elements(msg.source_items) j where j->>'source'='maintenance' and j->>'id'=p.id::text)
 ) x;
 update public.vb_inbox set read_at=coalesce(read_at,now()) where id=msg.id returning * into msg;
 return jsonb_build_object('kind',msg.kind,'id',msg.id,'client_id',msg.client_id,'created_at',msg.created_at,'period_start',msg.period_start,'frequency',msg.frequency,'read_at',msg.read_at,'items',items);
end;$function$;
do $$ begin if md5(pg_get_functiondef('public.vb_reserve_evidence(uuid,uuid,uuid,jsonb)'::regprocedure))<>'8c45098b305e7e2f731995112083ef1e' then raise exception 'Definition changed: vb_reserve_evidence'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_reserve_evidence(target_id uuid, target_client uuid, target_mark uuid, details jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.vb_evidence; k text:=details->>'kind'; mt text:=details->>'mimeType'; d date;
 sz bigint; fname text:=btrim(details->>'filename'); source text:=nullif(btrim(details->>'sourceUrl'),'');
 note text:=coalesce(details->>'notes',''); digest text:=details->>'sha256'; path text;
begin
 perform vb_private.portal_require_record('public.vb_marks',jsonb_build_object('id',target_mark),'use_history',target_client);
 perform 1 from public.vb_clients c where c.id=target_client and c.archived_at is null and c.portal_enabled for share;
 if not found or not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 perform 1 from public.vb_marks m where m.id=target_mark and m.client_id=target_client and m.archived_at is null for share;
 if not found then raise exception 'Trademark unavailable' using errcode='42501';end if;
 if target_id is null or k is null or k not in ('webpage','photo') or mt is null or mt not in ('image/png','image/jpeg')
 or fname is null or length(fname) not between 1 and 200 or fname ~ '[[:cntrl:]]'
 or length(note)>1000 or digest is null or digest !~ '^[a-f0-9]{64}$'
 or (k='webpage' and (source is null or source !~ '^https?://[^[:space:]]+$' or length(source)>2048))
 then raise exception 'Check evidence details' using errcode='22023';end if;
 begin d:=(details->>'capturedOn')::date;sz:=(details->>'byteSize')::bigint;
 exception when others then raise exception 'Check capture date and file size' using errcode='22023';end;
 if d is null or d>current_date or d<date '1900-01-01' or sz is null or sz not between 1 and 10485760 then raise exception 'Check capture date and file size' using errcode='22023';end if;
 path:=target_client::text||'/'||target_mark::text||'/'||target_id::text||case when mt='image/png' then '.png' else '.jpg' end;
 perform pg_advisory_xact_lock(hashtextextended(target_id::text,0));
 select * into e from public.vb_evidence where id=target_id;
 if e.id is not null then
 if e.client_id<>target_client or e.mark_id<>target_mark or e.uploaded_by<>auth.uid() then raise exception 'Evidence unavailable' using errcode='42501';end if;
 if (e.kind,e.captured_on,e.source_url,e.notes,e.filename,e.mime_type,e.byte_size,e.content_sha256)
 is distinct from (k,d,source,note,fname,mt,sz,digest) then raise exception 'This upload changed. Choose the file again.' using errcode='22023';end if;
 else
 insert into public.vb_evidence(id,client_id,mark_id,uploaded_by,kind,captured_on,source_url,notes,filename,mime_type,byte_size,content_sha256,object_path)
 values(target_id,target_client,target_mark,auth.uid(),k,d,source,note,fname,mt,sz,digest,path) returning * into e;
 end if;
 return to_jsonb(e);
end;$function$;
do $$ begin if md5(pg_get_functiondef('public.vb_remove_evidence(uuid,uuid)'::regprocedure))<>'865855abc00625495bd7399155478c60' then raise exception 'Definition changed: vb_remove_evidence'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_remove_evidence(target_id uuid, target_client uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.vb_evidence;
begin
 perform vb_private.portal_require_record('public.vb_evidence',jsonb_build_object('id',target_id),'use_history',target_client);
 select * into e from public.vb_evidence where id=target_id and client_id=target_client;
 if e.id is null or e.uploaded_at is null then raise exception 'Evidence unavailable' using errcode='42501';end if;
 perform 1 from public.vb_clients c where c.id=e.client_id for share;
 perform 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id for share;
 if not vb_private.is_staff() and not (vb_private.is_client_member(e.client_id) and exists(
 select 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null))
 then raise exception 'Evidence unavailable' using errcode='42501';end if;
 select * into e from public.vb_evidence where id=target_id for update;
 if e.removed_at is null then update public.vb_evidence set removed_at=now(),removed_by=auth.uid() where id=e.id;end if;
end;$function$;
do $$ begin if md5(pg_get_functiondef('vb_private.watch_access(uuid)'::regprocedure))<>'c4af935c4cf22787868019aae24d719b' then raise exception 'Definition changed: watch_access'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.watch_access(c uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform vb_private.portal_require_service(c,'trademark_watch');
 if not (vb_private.is_staff() or vb_private.is_client_member(c)) or not exists(select 1 from public.vb_clients where id=c and archived_at is null and portal_enabled) then
 raise exception 'Watch workspace unavailable' using errcode='42501';
 end if;
end $function$;
do $$ begin if md5(pg_get_functiondef('vb_private.bcm_actor_has_access(uuid,uuid)'::regprocedure))<>'3c8092c321319234b0fc26dbd3ee407c' then raise exception 'Definition changed: bcm_actor_has_access'; end if; end $$;
create or replace function vb_private.bcm_actor_has_access(target_client uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$ select vb_private.portal_service_actor(target_client,actor,'brand_change_monitor'); $$;
do $$ begin if md5(pg_get_functiondef('public.vb_bcm_ai_run_is_current(uuid)'::regprocedure))<>'91a7b038cc0e4ffcdc5ec1ff9642abff' then raise exception 'Definition changed: vb_bcm_ai_run_is_current'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_bcm_ai_run_is_current(ticket uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 return public.vb_bcm_ai_ready() and exists(select 1 from public.vb_bcm_ai_runs r join public.vb_bcm_settings c on c.client_id=r.client_id
 left join public.vb_bcm_schedules s on s.client_id=r.client_id where r.id=ticket and vb_private.portal_record_actor('public.vb_bcm_ai_runs',jsonb_build_object('id',r.id),r.requested_by,'brand_change_monitor') and r.status='running' and r.started_at>now()-interval '5 minutes'
 and c.version=r.settings_version and vb_private.bcm_ai_valid(c) and vb_private.bcm_ai_domain(c.urls[1])=r.domain
 and vb_private.bcm_actor_has_access(r.client_id,r.requested_by)
 and (r.schedule_revision is null or (s.enabled and s.revision=r.schedule_revision and s.authorized_by=r.requested_by and s.settings_version=c.version)));
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_bcm_job_is_current(uuid)'::regprocedure))<>'eb465ab58aadeacba097c5713b2b5478' then raise exception 'Definition changed: vb_bcm_job_is_current'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_bcm_job_is_current(ticket uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 return public.vb_bcm_scheduler_ready() and exists(
 select 1 from public.vb_bcm_scans r join public.vb_bcm_schedules s on s.client_id=r.client_id join public.vb_bcm_settings cfg on cfg.client_id=r.client_id
 where r.id=ticket and vb_private.portal_record_actor('public.vb_bcm_scans',jsonb_build_object('id',r.id),r.requested_by,'brand_change_monitor') and r.status='running' and r.started_at>now()-interval '2 minutes' and s.enabled
 and s.revision=r.schedule_revision and s.authorized_by=r.requested_by and cfg.version=r.settings_version and s.settings_version=cfg.version
 and cfg.access_mode='public' and vb_private.bcm_actor_has_access(r.client_id,r.requested_by));
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_claim_bcm_ai_due_run()'::regprocedure))<>'7ec6ec73410efa538557980bf9196a48' then raise exception 'Definition changed: vb_claim_bcm_ai_due_run'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_claim_bcm_ai_due_run()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare target uuid; cfg public.vb_bcm_settings; s public.vb_bcm_schedules; result jsonb; cap integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 select max_runs into cap from vb_private.bcm_ai_config where singleton and ready for update;
 if cap is null or not public.vb_bcm_ai_ready() or (select count(*) from public.vb_bcm_ai_runs)>=cap then return null; end if;
 select c.id into target from public.vb_clients c join public.vb_bcm_schedules due_schedule on due_schedule.client_id=c.id
 where vb_private.portal_service_actor(c.id,due_schedule.authorized_by,'brand_change_monitor') and due_schedule.enabled and due_schedule.next_run_at<=now() and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')
 order by due_schedule.next_run_at,c.id for update of c skip locked limit 1;
 if target is null then return null; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 select * into s from public.vb_bcm_schedules where client_id=target for update;
 if cfg.version is distinct from s.settings_version or not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,s.authorized_by) then
 update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,last_status='access_unavailable',updated_at=now() where client_id=target;
 return null;
 end if;
 result:=vb_private.reserve_bcm_ai(target,s.authorized_by,s.revision);
 update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,last_status='running',updated_at=now() where client_id=target;
 return result;
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_claim_bcm_due_scan()'::regprocedure))<>'5ad9a6f3e71260dc047cf8a6ef45c15f' then raise exception 'Definition changed: vb_claim_bcm_due_scan'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_claim_bcm_due_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare target uuid; cfg public.vb_bcm_settings; schedule public.vb_bcm_schedules; baseline uuid; ticket uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker access required' using errcode='42501'; end if;
 if not public.vb_bcm_scheduler_ready() or not pg_try_advisory_xact_lock(527014271) then return null; end if;
 -- One automatic scan globally at a time; expired reservations do not block later work.
 if exists(select 1 from public.vb_bcm_scans where schedule_revision is not null and status='running' and started_at>now()-interval '2 minutes') then return null; end if;
 select c.id into target from public.vb_clients c join public.vb_bcm_schedules s on s.client_id=c.id
 where vb_private.portal_service_actor(c.id,s.authorized_by,'brand_change_monitor') and s.enabled and s.next_run_at<=now()
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
 select id into baseline from public.vb_bcm_scans where client_id=target and settings_version=cfg.version and scan_type='baseline' and vb_private.portal_same_service_scope(target,'public.vb_bcm_scans',jsonb_build_object('id',id),'brand_change_monitor') and status='completed';
 insert into public.vb_bcm_scans(client_id,settings_version,requested_by,scan_type,baseline_id,schedule_revision)
 values(target,cfg.version,schedule.authorized_by,case when baseline is null then 'baseline' else 'comparison' end,baseline,schedule.revision)
 returning id into ticket;
 update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,
 last_status='running',updated_at=now() where client_id=target;
 return jsonb_build_object('ticket',ticket,'settings',to_jsonb(cfg));
end; $function$;
do $$ begin if md5(pg_get_functiondef('vb_private.reserve_bcm_ai(uuid,uuid,integer)'::regprocedure))<>'5e4961c7d78474ac3e4f52740c0f1b97' then raise exception 'Definition changed: reserve_bcm_ai'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.reserve_bcm_ai(target uuid, actor uuid, schedule_rev integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cfg public.vb_bcm_settings; ticket uuid; domain_name text; names jsonb; cap integer;
begin
 -- Lock order is global budget, then client, then schedule/run/finding.
 select max_runs into cap from vb_private.bcm_ai_config where singleton and ready for update;
 if cap is null or not public.vb_bcm_ai_ready() then raise exception 'Test not connected'; end if;
 if (select count(*) from public.vb_bcm_ai_runs)>=cap then raise exception 'Test run limit reached'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,actor) then raise exception 'Access or settings unavailable'; end if;
 if exists(select 1 from public.vb_bcm_ai_runs where client_id=target and status='running' and started_at>now()-interval '5 minutes') then raise exception 'Research already running'; end if;
 update public.vb_bcm_ai_runs set status='failed',finished_at=now() where client_id=target and status='running';
 domain_name:=vb_private.bcm_ai_domain(cfg.urls[1]);
 insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,schedule_revision,domain)
 values(target,cfg.version,actor,schedule_rev,domain_name) returning id into ticket;
 select coalesce(jsonb_agg(name),'[]') into names from
 (select name from public.vb_bcm_ai_observations where client_id=target and domain=domain_name and vb_private.portal_record_actor('public.vb_bcm_ai_observations',jsonb_build_object('id',id),actor,'brand_change_monitor') order by last_seen desc limit 50) n;
 return jsonb_build_object('ticket',ticket,'settings',to_jsonb(cfg),'known_names',names);
end; $function$;
do $$ begin if md5(pg_get_functiondef('vb_private.dispatch_bcm_ai_tick()'::regprocedure))<>'997962b92f171fdaea159c7a857d51ac' then raise exception 'Definition changed: dispatch_bcm_ai_tick'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.dispatch_bcm_ai_tick()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare endpoint text; credential text;
begin
 if not coalesce((select ready from vb_private.bcm_ai_config where singleton),false)
 or (select count(*) from public.vb_bcm_ai_runs)>=(select max_runs from vb_private.bcm_ai_config where singleton)
 or not coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false)
 or not exists(select 1 from public.vb_bcm_schedules s where s.enabled and s.next_run_at<=now() and vb_private.portal_service_actor(s.client_id,s.authorized_by,'brand_change_monitor'))
 or exists(select 1 from public.vb_bcm_ai_runs where status='running' and started_at>now()-interval '5 minutes') then return null;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='bcm_scheduler_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='bcm_scheduler_secret';
 if endpoint is distinct from 'https://imvkhicfmidzbzsbhkzs.supabase.co' or credential is null or length(credential)<32 or credential ~ '[[:space:]]' then raise exception 'Private scheduler unavailable';end if;
 return net.http_post(url:=endpoint||'/functions/v1/bcm-ai-schedule',body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','x-bcm-scheduler-secret',credential),timeout_milliseconds:=110000);
end; $function$;
do $$ begin if md5(pg_get_functiondef('vb_private.dispatch_bcm_tick()'::regprocedure))<>'ebc422e2866b08306fa975a1cb82e8b0' then raise exception 'Definition changed: dispatch_bcm_tick'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.dispatch_bcm_tick()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare endpoint text; credential text;
begin
 if not coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false) then return null; end if;
 if not exists(select 1 from public.vb_bcm_schedules s where s.enabled and s.next_run_at<=now() and vb_private.portal_service_actor(s.client_id,s.authorized_by,'brand_change_monitor'))
 or exists(select 1 from public.vb_bcm_scans where schedule_revision is not null and status='running' and started_at>now()-interval '2 minutes') then return null; end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='bcm_scheduler_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='bcm_scheduler_secret';
 if endpoint is distinct from 'https://imvkhicfmidzbzsbhkzs.supabase.co' or credential is null or length(credential)<32 then raise exception 'Scheduler configuration unavailable'; end if;
 return net.http_post(url:=endpoint||'/functions/v1/bcm-schedule',body:='{}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json','x-bcm-scheduler-secret',credential),timeout_milliseconds:=110000);
end; $function$;
do $$ begin if md5(pg_get_functiondef('vb_private.finish_bcm_snapshot(uuid,jsonb,boolean)'::regprocedure))<>'2f0c48d46666049345f74c75cdbbb649' then raise exception 'Definition changed: finish_bcm_snapshot'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.finish_bcm_snapshot(ticket uuid, snapshot jsonb, failure boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 or not vb_private.portal_record_actor('public.vb_bcm_scans',jsonb_build_object('id',run.id),run.requested_by,'brand_change_monitor')
 or cfg.access_mode is distinct from 'public'
 or exists(select 1 from vb_private.staff_members where user_id=run.requested_by) then
 update public.vb_bcm_scans set status='failed',finished_at=now() where id=ticket; return 'failed';
 end if;
 if run.scan_type='comparison' then
 select * into prior from public.vb_bcm_scans where id=run.baseline_id and client_id=run.client_id and vb_private.portal_same_service_scope(run.client_id,'public.vb_bcm_scans',jsonb_build_object('id',id),'brand_change_monitor') and settings_version=run.settings_version and scan_type='baseline' and status='completed';
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
end; $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_finish_evidence(uuid,uuid)'::regprocedure))<>'28b351c35723665f2324d0b9f4122ed5' then raise exception 'Definition changed: vb_finish_evidence'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_finish_evidence(target_id uuid, actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.vb_evidence; meta jsonb;
begin
 select * into e from public.vb_evidence where id=target_id;
 if e.id is null or e.uploaded_by<>actor then raise exception 'Evidence unavailable' using errcode='42501';end if;
 perform 1 from public.vb_clients c where c.id=e.client_id and c.archived_at is null and c.portal_enabled for share;
 if not found or not vb_private.portal_record_actor('public.vb_evidence',jsonb_build_object('id',e.id),actor,'use_history')
 or exists(select 1 from vb_private.staff_members s where s.user_id=actor)
 then raise exception 'Client access changed' using errcode='42501';end if;
 perform 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null for share;
 if not found then raise exception 'Trademark unavailable' using errcode='42501';end if;
 select * into e from public.vb_evidence where id=target_id for update;
 if e.removed_at is not null then raise exception 'Evidence removed' using errcode='42501';end if;
 select metadata into meta from storage.objects where bucket_id='vb-evidence' and name=e.object_path;
 if meta is null or (meta->>'size')::bigint is distinct from e.byte_size or meta->>'mimetype' is distinct from e.mime_type
 then raise exception 'Upload incomplete' using errcode='22023';end if;
 if e.uploaded_at is null then update public.vb_evidence set uploaded_at=now() where id=e.id returning * into e;end if;
 return to_jsonb(e);
end;$function$;
do $$ begin if md5(pg_get_functiondef('vb_private.can_read_evidence_object(text)'::regprocedure))<>'7e55e89ecc9e392b07f154a0a390d757' then raise exception 'Definition changed: can_read_evidence_object'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.can_read_evidence_object(path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.vb_evidence e where e.object_path=path and e.uploaded_at is not null and e.removed_at is null
 and (vb_private.is_staff() or (vb_private.portal_row_read(e.client_id,'public.vb_evidence',jsonb_build_object('id',e.id),'use_history') and exists(
 select 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null))));
$function$;
do $$ begin if md5(pg_get_functiondef('public.vb_watch_snapshot(uuid)'::regprocedure))<>'bfdbb7423e0bb172190402852eb1a51d' then raise exception 'Definition changed: vb_watch_snapshot'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_watch_snapshot(target_client uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare staff boolean; s jsonb; f jsonb; r jsonb;
begin
 perform vb_private.watch_access(target_client); staff:=vb_private.is_staff();
 select to_jsonb(t) into s from vb_private.watch_settings t where client_id=target_client and vb_private.portal_row_read(client_id,'vb_private.watch_settings',jsonb_build_object('client_id',client_id),'trademark_watch');
 select coalesce(jsonb_agg(v order by v->>'first_seen_at' desc),'[]') into f from (
 select case when staff then jsonb_build_object('id',id,'mark_id',mark_id,'serial',serial,'evidence',evidence,'reason',reason,'version',version,'review_status',review_status,'private_note',private_note,'publication',publication,'first_seen_at',first_seen_at)
 else publication||jsonb_build_object('id',id,'mark_id',mark_id,'serial',serial,'first_seen_at',first_seen_at) end v
 from vb_private.watch_findings where client_id=target_client and vb_private.portal_row_read(client_id,'vb_private.watch_findings',jsonb_build_object('id',id),'trademark_watch') and (staff or (publication is not null and exists(select 1 from public.vb_marks m where m.id=mark_id and m.client_id=target_client and m.archived_at is null)))
 order by first_seen_at desc limit 200
 ) rows;
 select coalesce(jsonb_agg(to_jsonb(t) order by checked_at desc),'[]') into r from (
 select id,checked_at,coverage_from,coverage_to,status,missing_dates,settings_version from vb_private.watch_runs where client_id=target_client and vb_private.portal_row_read(client_id,'vb_private.watch_runs',jsonb_build_object('id',id),'trademark_watch') order by checked_at desc limit 20
 ) t;
 return jsonb_build_object('settings',coalesce(s,jsonb_build_object('client_id',target_client,'version',0,'mark_ids','[]'::jsonb,'enabled',false)),
 'ready',(select enabled from vb_private.watch_config),'latest_source_date',(select max(data_date) from vb_private.watch_files where completed_at is not null),
 'findings',f,'runs',r,'staff',staff,'limit',200);
end $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_watch_save(uuid,integer,uuid[],boolean)'::regprocedure))<>'74b053cd52dcee9b32b7840c61049a9c' then raise exception 'Definition changed: vb_watch_save'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_watch_save(target_client uuid, expected_version integer, selected_marks uuid[], monitoring boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s vb_private.watch_settings; enabled_before boolean;
begin
 perform vb_private.watch_access(target_client);
 -- Client lock serializes first save and concurrent updates and mark ownership changes.
 perform 1 from public.vb_clients where id=target_client for update;
 insert into vb_private.watch_settings(client_id) values(target_client) on conflict do nothing;
 select * into s from vb_private.watch_settings where client_id=target_client for update;
 if s.version<>expected_version then raise exception 'Watch settings changed' using errcode='40001'; end if;
 if selected_marks is null or cardinality(selected_marks)>10 or cardinality(selected_marks)<>(select count(distinct x) from unnest(selected_marks) x) then raise exception 'Choose up to ten marks' using errcode='22023'; end if;
 if (select count(*) from public.vb_marks where client_id=target_client and id=any(selected_marks) and mark_type='word' and archived_at is null and vb_private.portal_same_service_scope(target_client,'public.vb_marks',jsonb_build_object('id',id),'trademark_watch'))<>cardinality(selected_marks) then raise exception 'Word mark unavailable' using errcode='22023'; end if;
 if monitoring and (cardinality(selected_marks)=0 or not (select enabled from vb_private.watch_config)) then raise exception 'Monitoring is not ready' using errcode='22023'; end if;
 enabled_before:=s.enabled;
 update vb_private.watch_settings set mark_ids=selected_marks,enabled=monitoring,version=version+1,updated_at=now(),
 started_on=case when monitoring then coalesce(started_on,current_date) else started_on end,
 next_run_at=case when not monitoring then null when not enabled_before or selected_marks is distinct from s.mark_ids then now() else next_run_at end
 where client_id=target_client returning * into s;
 return to_jsonb(s);
end $function$;
do $$ begin if md5(pg_get_functiondef('public.vb_watch_run_due()'::regprocedure))<>'324c639084784d8a73c3218823dd6e34' then raise exception 'Definition changed: vb_watch_run_due'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_watch_run_due()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s vb_private.watch_settings; ending date; missing date[]; a record; finding_evidence jsonb; why text; count_new integer; processed integer:=0; old vb_private.watch_findings;
begin
 if not (select enabled from vb_private.watch_config) then raise exception 'Watch checks disabled'; end if;
 -- Serialize ingestion completion and checks; no matching partly committed files.
 perform pg_advisory_xact_lock(73772131);
 select max(data_date) into ending from vb_private.watch_files where completed_at is not null;
 for s in select ws.* from vb_private.watch_settings ws join public.vb_clients c on c.id=ws.client_id
 where vb_private.portal_worker_service(ws.client_id,'trademark_watch') and vb_private.portal_same_service_scope(ws.client_id,'vb_private.watch_settings',jsonb_build_object('client_id',ws.client_id),'trademark_watch') and ws.enabled and ws.next_run_at<=now() and c.archived_at is null and c.portal_enabled
 order by ws.next_run_at limit 1 for update of c skip locked loop
 select * into s from vb_private.watch_settings where client_id=s.client_id for update;
 if not s.enabled or s.next_run_at>now() or not vb_private.portal_worker_service(s.client_id,'trademark_watch') then continue; end if;
 count_new:=0;
 select array_agg(x::date) into missing from generate_series(coalesce(ending,current_date-1)-6,coalesce(ending,current_date-1),'1 day') x
 where not exists(select 1 from vb_private.watch_files where completed_at is not null and data_date=x::date);
 if ending is null or ending<current_date-2 or missing is not null then
 insert into vb_private.watch_runs(client_id,coverage_from,coverage_to,status,missing_dates,settings_version)
 values(s.client_id,coalesce(ending,current_date-1)-6,ending,'incomplete',coalesce(missing,'{}'),s.version);
 -- Retry tomorrow without pretending the weekly check completed.
 update vb_private.watch_settings set next_run_at=now()+interval '1 day' where client_id=s.client_id;
 continue;
 end if;
 -- Withdraw outdated approved copies before rematching, including a name that no longer matches.
 for old in select f.* from vb_private.watch_findings f join public.vb_marks m on m.id=f.mark_id
 join vb_private.watch_applications p on p.serial=f.serial where f.client_id=s.client_id and
 (f.evidence->>'name' is distinct from p.name or f.evidence->>'monitored_name' is distinct from m.name
 or f.evidence->>'filing_date' is distinct from p.filing_date::text
 or f.evidence->'goods' is distinct from p.goods or f.evidence->'classes' is distinct from p.classes
 or f.evidence->'owners' is distinct from p.owners or f.evidence->>'status_code' is distinct from p.status_code)
 for update of f loop
 insert into vb_private.watch_review_history(finding_id,previous,action) values(old.id,to_jsonb(old),'source_changed');
 select jsonb_build_object('name',p.name,'monitored_name',m.name,'filing_date',p.filing_date,'goods',p.goods,'classes',p.classes,'owners',p.owners,'status_code',p.status_code,
 'source_file',w.filename,'source_date',w.data_date,'source_revision',w.revision,'checked_at',now()),
 coalesce(vb_private.watch_reason(m.name,p.name),'Name no longer meets the automatic matching rule; re-review required')
 into finding_evidence,why from public.vb_marks m cross join vb_private.watch_applications p join vb_private.watch_files w on w.id=p.file_id
 where m.id=old.mark_id and p.serial=old.serial;
 update vb_private.watch_findings set evidence=finding_evidence,reason=why,version=version+1,publication=null,review_status='unreviewed',updated_at=now() where id=old.id;
 end loop;
 for a in select m.id mark_id,m.name monitored_name,p.* from public.vb_marks m cross join vb_private.watch_applications p
 where m.client_id=s.client_id and vb_private.portal_same_service_scope(s.client_id,'public.vb_marks',jsonb_build_object('id',m.id),'trademark_watch') and m.id=any(s.mark_ids) and m.mark_type='word' and m.archived_at is null
 and p.filing_date>=greatest(s.started_on-30,ending-30) and p.filing_date<=ending
 and p.serial is distinct from m.application_number
 and m.name !~ '[^ -~]' and p.name !~ '[^ -~]'
 and (p.name_key=vb_private.watch_normalize(m.name) or
 (length(vb_private.watch_normalize(m.name)) between 5 and 80 and
 abs(length(p.name_key)-length(vb_private.watch_normalize(m.name)))<=2)) loop
 why:=vb_private.watch_reason(a.monitored_name,a.name); if why is null then continue; end if;
 finding_evidence:=jsonb_build_object('name',a.name,'monitored_name',a.monitored_name,'filing_date',a.filing_date,'goods',a.goods,'classes',a.classes,'owners',a.owners,'status_code',a.status_code,
 'source_file',(select filename from vb_private.watch_files where id=a.file_id),'source_date',(select data_date from vb_private.watch_files where id=a.file_id),
 'source_revision',(select revision from vb_private.watch_files where id=a.file_id),'checked_at',now());
 select * into old from vb_private.watch_findings where client_id=s.client_id and mark_id=a.mark_id and serial=a.serial for update;
 if not found then
 insert into vb_private.watch_findings(client_id,mark_id,serial,evidence,reason) values(s.client_id,a.mark_id,a.serial,finding_evidence,why); count_new:=count_new+1;
 elsif (old.evidence-'checked_at'-'source_file'-'source_date'-'source_revision') is distinct from (finding_evidence-'checked_at'-'source_file'-'source_date'-'source_revision') or old.reason<>why then
 insert into vb_private.watch_review_history(finding_id,previous,action) values(old.id,to_jsonb(old),'source_changed');
 update vb_private.watch_findings set evidence=finding_evidence,reason=why,version=version+1,review_status='unreviewed',publication=null,updated_at=now() where id=old.id;
 end if;
 end loop;
 insert into vb_private.watch_runs(client_id,coverage_from,coverage_to,status,finding_count,settings_version) values(s.client_id,ending-6,ending,'completed',count_new,s.version);
 update vb_private.watch_settings set next_run_at=now()+interval '7 days' where client_id=s.client_id;
 processed:=processed+1;
 end loop;
 return jsonb_build_object('completed_clients',processed,'pending',exists(select 1 from vb_private.watch_settings ws join public.vb_clients c on c.id=ws.client_id where vb_private.portal_worker_service(ws.client_id,'trademark_watch') and vb_private.portal_same_service_scope(ws.client_id,'vb_private.watch_settings',jsonb_build_object('client_id',ws.client_id),'trademark_watch') and ws.enabled and ws.next_run_at<=now() and c.archived_at is null and c.portal_enabled));
end $function$;
do $$ begin if md5(pg_get_functiondef('vb_private.deliver_due_digests()'::regprocedure))<>'c1653caa0fa52723b43410642b6e2c24' then raise exception 'Definition changed: deliver_due_digests'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.deliver_due_digests()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare candidate record;p public.vb_digest_preferences;delivered integer:=0;
begin
 -- One transaction owns the batch; a retry either rolls back or sees advanced due times.
 if not pg_try_advisory_xact_lock(hashtextextended('vb-digest-scheduler',0)) then return 0;end if;
 for candidate in select d.user_id,d.client_id from public.vb_digest_preferences d join public.vb_clients c on c.id=d.client_id where vb_private.portal_service_actor(d.client_id,d.user_id,'activity_digest') and d.next_due_at<=now() and c.portal_enabled and c.archived_at is null and not exists(select 1 from vb_private.staff_members s where s.user_id=d.user_id) order by d.next_due_at,d.user_id,d.client_id limit 100 loop
 -- Match client/membership revocation locks before preference locks.
 perform 1 from public.vb_clients where id=candidate.client_id and portal_enabled and archived_at is null for share;
 if not found then continue;end if;
 if exists(select 1 from vb_private.legacy_test_mappings where client_id=candidate.client_id) then perform 1 from vb_private.portal_accounts where user_id=candidate.user_id and status='active' for share; else perform 1 from vb_private.client_memberships where client_id=candidate.client_id and user_id=candidate.user_id and active for share; end if;
 if not found or not vb_private.portal_service_actor(candidate.client_id,candidate.user_id,'activity_digest') or exists(select 1 from vb_private.staff_members where user_id=candidate.user_id) then continue;end if;
 select * into p from public.vb_digest_preferences where user_id=candidate.user_id and client_id=candidate.client_id for update;
 if p.next_due_at>now() then continue;end if;
 insert into public.vb_inbox(recipient_id,client_id,kind,categories,frequency,period_start,scheduled_for,source_items)
 values(p.user_id,p.client_id,'digest',p.categories,p.frequency,p.period_start,p.next_due_at,vb_private.digest_items(p.client_id,p.categories,p.period_start))
 on conflict(recipient_id,client_id,scheduled_for) where kind='digest' do nothing;
 if found then delivered:=delivered+1;end if;
 -- Overdue periods are combined in one digest, avoiding a backlog flood.
 update public.vb_digest_preferences set period_start=now(),next_due_at=vb_private.digest_next_due(now(),p.frequency) where user_id=p.user_id and client_id=p.client_id;
 end loop;
 return delivered;
end;$function$;
do $$ begin if md5(pg_get_functiondef('vb_private.digest_items(uuid,text[],timestamp with time zone)'::regprocedure))<>'18182202ea37a153458fc80af59543a6' then raise exception 'Definition changed: digest_items'; end if; end $$;
CREATE OR REPLACE FUNCTION vb_private.digest_items(target_client uuid, cats text[], since_time timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('source',source,'id',id,'occurred_at',occurred_at) order by occurred_at desc),'[]'::jsonb) from (
 select * from (
 select 'bcm'::text source,s.id, s.finished_at occurred_at from public.vb_bcm_scans s where 'bcm'=any(cats) and s.client_id=target_client and vb_private.portal_digest_source(target_client,'public.vb_bcm_scans',jsonb_build_object('id',s.id),'brand_change_monitor') and s.status='completed' and s.scan_type='comparison' and s.finished_at>=since_time
 union all
 select 'use_history',e.id,e.uploaded_at from public.vb_evidence e join public.vb_marks m on m.id=e.mark_id and m.client_id=e.client_id where 'use_history'=any(cats) and e.client_id=target_client and vb_private.portal_digest_source(target_client,'public.vb_evidence',jsonb_build_object('id',e.id),'use_history') and e.uploaded_at>=since_time and e.removed_at is null and m.archived_at is null
 union all
 select 'maintenance',p.id,p.updated_at from public.vb_maintenance_publications p join public.vb_marks m on m.id=p.mark_id and m.client_id=p.client_id where 'maintenance'=any(cats) and p.client_id=target_client and vb_private.portal_digest_source(target_client,'public.vb_maintenance_publications',jsonb_build_object('id',p.id),'maintenance_reminder') and p.withdrawn_at is null and m.archived_at is null and p.status<>'Completed' and p.deadline between current_date and current_date+30
 ) sources order by occurred_at desc,source,id limit 100) limited;
$function$;
do $$ begin if md5(pg_get_functiondef('public.vb_finish_bcm_ai_run(uuid,jsonb,boolean)'::regprocedure))<>'8c0be3c6ecad768425e0bab3277bbe8d' then raise exception 'Definition changed: vb_finish_bcm_ai_run'; end if; end $$;
CREATE OR REPLACE FUNCTION public.vb_finish_bcm_ai_run(ticket uuid, payload jsonb, failure boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.vb_bcm_ai_runs; cfg public.vb_bcm_settings; target uuid; o jsonb; item public.vb_bcm_ai_observations;
 k text; mark uuid; initial boolean; category text; host text; path text; changed boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 select client_id into target from public.vb_bcm_ai_runs where id=ticket;
 if target is null then raise exception 'Unknown run'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into r from public.vb_bcm_ai_runs where id=ticket for update;
 if r.status<>'running' then return r.status; end if;
 if failure is distinct from false or not public.vb_bcm_ai_run_is_current(ticket) then
 update public.vb_bcm_ai_runs set status=case when failure then 'failed' else 'discarded' end,finished_at=now() where id=ticket;
 update public.vb_bcm_schedules set last_status='failed',updated_at=now() where client_id=target and revision=r.schedule_revision;
 return case when failure then 'failed' else 'discarded' end;
 end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>60000
 or payload->>'source' is distinct from 'openai-observations-v1' or payload->>'model' is distinct from 'gpt-6-luna'
 or payload->>'domain' is distinct from r.domain or payload->>'coverage' is distinct from 'limited'
 or jsonb_typeof(payload->'observations') is distinct from 'array' or jsonb_array_length(payload->'observations')>12
 or jsonb_typeof(payload->'consulted_urls') is distinct from 'array' or jsonb_array_length(payload->'consulted_urls') not between 1 and 60
 or jsonb_typeof(payload->'coverage_note') is distinct from 'string' or length(payload->>'coverage_note')>2000
 or jsonb_typeof(payload->'usage') is distinct from 'object' then raise exception 'Invalid research payload'; end if;
 -- The first three successful passes for this client/domain form the baseline.
 initial:=(select count(*) from public.vb_bcm_ai_runs where client_id=target and domain=r.domain and status='completed' and vb_private.portal_same_service_scope(target,'public.vb_bcm_ai_runs',jsonb_build_object('id',id),'brand_change_monitor'))<3;
 for o in select value from jsonb_array_elements(payload->'observations') loop
 if jsonb_typeof(o)<>'object' or exists(select 1 from unnest(array['name','kind','context','passage','url','name_key']) f where jsonb_typeof(o->f) is distinct from 'string')
 or length(btrim(o->>'name')) not between 1 and 150 or length(btrim(o->>'context')) not between 1 and 300
 or length(btrim(o->>'passage')) not between 1 and 400 or length(o->>'url')>2048 then raise exception 'Invalid observation'; end if;
 category:=case o->>'kind' when 'product' then 'product_names' when 'service' then 'product_names' when 'feature' then 'feature_names' when 'slogan' then 'slogans' when 'sub_brand' then 'sub_brands' when 'rename' then 'renames' when 'identity' then 'presentation' end;
 k:=vb_private.bcm_ai_name(o->>'name');host:=lower(substring(o->>'url' from '^https://([^/:?#]+)'));path:=coalesce(substring(o->>'url' from '^https://[^/]+(/[^?#]*)'),'/');
 if k='' or k is distinct from o->>'name_key' or category is null or not (category=any(cfg.categories))
 or host is null or (host<>r.domain and right(host,length(r.domain)+1)<>'.'||r.domain)
 or o->>'url' !~ '^https://[A-Za-z0-9.-]+(/[^[:space:]@]*)?$'
 or not (payload->'consulted_urls' @> jsonb_build_array(o->>'url'))
 or exists(select 1 from unnest(cfg.exclusions) e where left(path,length(e))=e)
 then raise exception 'Evidence outside saved scope'; end if;
 select * into item from public.vb_bcm_ai_observations where client_id=target and domain=r.domain and name_key=k for update;
 if found then
 -- Remember aliases without overwriting the canonical asset's evidence with an alias's wording.
 if item.alias_of is not null then
 update public.vb_bcm_ai_observations set last_seen=now(),last_run=ticket where id=item.id;
 update public.vb_bcm_ai_observations set last_seen=now() where id=item.alias_of;
 else
 changed:=vb_private.bcm_ai_name(item.passage) is distinct from vb_private.bcm_ai_name(o->>'passage');
 update public.vb_bcm_ai_observations set last_seen=now(),last_run=ticket,
 kind=o->>'kind',context=o->>'context',passage=o->>'passage',source_url=o->>'url',revision=revision+1,
 state=case when not initial and changed and state='known' and o->>'kind' in ('rename','identity') and kind is distinct from o->>'kind' then 'needs_review' else state end where id=item.id;
 -- Approval/dismissal persists. Changed evidence remains available to the attorney;
 -- it never silently edits a previously approved client-facing snapshot.
 end if;
 else
 select id into mark from public.vb_marks where client_id=target and archived_at is null and vb_private.portal_same_service_scope(target,'public.vb_marks',jsonb_build_object('id',id),'brand_change_monitor') and mark_type is distinct from 'logo' and vb_private.bcm_ai_name(name)=k order by id limit 1;
 insert into public.vb_bcm_ai_observations(client_id,domain,name_key,name,kind,context,passage,source_url,first_run,last_run,state,matched_mark)
 values(target,r.domain,k,o->>'name',o->>'kind',o->>'context',o->>'passage',o->>'url',ticket,ticket,case when initial or mark is not null then 'known' else 'needs_review' end,mark);
 end if;
 end loop;
 update public.vb_bcm_ai_runs set status='completed',finished_at=now(),observation_count=jsonb_array_length(payload->'observations'),
 consulted_urls=payload->'consulted_urls',coverage_note=payload->>'coverage_note',usage=payload->'usage' where id=ticket;
 update public.vb_bcm_schedules set last_status='completed',updated_at=now() where client_id=target and revision=r.schedule_revision;
 return 'completed';
end; $function$;
update vb_private.legacy_test_mappings set enforcement_enabled=true;
notify pgrst, 'reload schema';
commit;
