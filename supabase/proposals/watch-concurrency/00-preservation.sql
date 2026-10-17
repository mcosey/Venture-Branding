-- Read-only baseline/postcheck; compare before, after rehearsal, and after application.
-- Member checks cover the two disclosed Test accounts, returning hashes only.
begin read only;
with actors as (select id from auth.users where lower(email) in('mithrilzeppelin117@gmail.com','mithrilzeppelin117+newclient@gmail.com'))
select jsonb_build_object(
 'scoped_settings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.watch_scope_settings t),
 'watch_review_history',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.watch_review_history t),
 'all_services',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by engagement_id,service)::text,'')) from vb_private.engagement_services t),
 'all_matters',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.vb_matters t),
 'all_mappings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by client_id)::text,'')) from vb_private.legacy_test_mappings t),
 'source_application_values',(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by serial),'')) from vb_private.watch_applications t),
 'all_marks',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.vb_marks t),
 'service_preferences',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by client_id,service)::text,'')) from public.vb_service_preferences t),
 'client_audit',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.audit_events t),
 'lifecycle_events',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.portal_lifecycle_events t),
 'is_test',(select system_identifier::text from pg_control_system())='7692130048193495360',
 'auth_users',(select count(*) from auth.users),
 'clients',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from public.vb_clients t),
 'grants',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by engagement_id,user_id)::text,'[]')) from vb_private.engagement_grants t),
 'engagements',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from public.vb_engagements t),
 'bindings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by client_id,service)::text,'[]')) from vb_private.portal_service_bindings t),
 'scope_ledger',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by resource,record_key)::text,'[]')) from vb_private.legacy_test_record_scopes t),
 'legacy_settings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by client_id)::text,'[]')) from vb_private.watch_settings t),
 'original_run_values',(select md5(coalesce(jsonb_agg(to_jsonb(t)-'configuration_id' order by id)::text,'[]')) from vb_private.watch_runs t),
 'findings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from vb_private.watch_findings t),
 'source_files',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from vb_private.watch_files t),
 'source_application_count',(select count(*) from vb_private.watch_applications),
 'kit_profiles',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id)::text,'[]')) from public.vb_member_profiles t where user_id in(select id from actors)),
 'kit_companies',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]')) from public.vb_member_companies t where owner_id in(select id from actors)),
 'kit_progress',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by company_id,milestone_id)::text,'[]')) from public.vb_member_progress t where company_id in(select id from public.vb_member_companies where owner_id in(select id from actors))),
 'ai_config',(select to_jsonb(t) from vb_private.bcm_ai_config t where singleton),
 'scheduler_config',(select to_jsonb(t) from vb_private.bcm_scheduler_config t where singleton),
 'watch_config',(select to_jsonb(t) from vb_private.watch_config t where singleton)
) as preservation_state;
rollback;
