-- Read-only baseline/postcheck; compare before, after rehearsal, and after application.
-- Member checks cover the two disclosed Test accounts, returning hashes only.
begin read only;
with actors as (select id from auth.users where lower(email) in('mithrilzeppelin117@gmail.com','mithrilzeppelin117+newclient@gmail.com'))
select jsonb_build_object(
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
