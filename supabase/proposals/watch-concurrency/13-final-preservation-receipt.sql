begin read only;
with observed as (with actors as (select id from auth.users where lower(email) in('mithrilzeppelin117@gmail.com','mithrilzeppelin117+newclient@gmail.com'))
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
) as preservation_state)
select 'BCM Test' as environment, preservation_state='{"grants":"d28407132b23b3cc3cc7bec0584b57d4","clients":"d2106a4368181bc711a593b184cc0f6f","is_test":true,"bindings":"202abdae6cc6b400e189635a233a80f3","findings":"156ce9134607f9cc32bfb2d446798d8e","ai_config":{"ready":false,"max_runs":8,"singleton":true},"all_marks":"f076089b81dde0d4b5660e5da5b70530","auth_users":5,"all_matters":"85b021b80e20bfeab2a3d14531e7352e","engagements":"71da5cc2ec6afd224585cb1ad551f72a","all_mappings":"66cf9f66b3d70346de7dbadd26e58f67","all_services":"71cf1934abf65d3f40999b0c3ce66638","client_audit":"58b414ea6be9aab8ccaeda1c55907b06","kit_profiles":"42cfcab4f7eb110bb7de3027964aabca","kit_progress":"2896ed74a83eefeb00b331339e688731","scope_ledger":"e16616451bc4269bc3d37b8ddd30fb57","source_files":"9c944eb971852c9c3e4386c39a4787b9","watch_config":{"enabled":true,"singleton":true},"kit_companies":"f3f7dd742284fc07c984e0499f9bbe1e","legacy_settings":"7d97a0422d87c13d254c9188b9549886","scoped_settings":"e2d60a454c43ece40b5286c386d8a2be","lifecycle_events":"fd6bda409b2e596c7eb377063d0f7b80","scheduler_config":{"ready":false,"singleton":true},"original_run_values":"0179251b99ed5de3f25727241519b1a1","service_preferences":"d3a9cc3e431d4c7d5c3be4fa506c8a2c","watch_review_history":"2ec8c06b769ff3c564b2cf9cf81c9603","source_application_count":50795,"source_application_values":"dbf83e4b633ffb47236cefad90fca84f"}'::jsonb as existing_data_unchanged, not exists(select 1 from public.vb_clients where id in('f2c00000-0000-0000-0000-000000000001'::uuid,'f2c00000-0000-0000-0000-000000000002'::uuid,'f2c00000-0000-0000-0000-000000000003'::uuid,'f2c00000-0000-0000-0000-000000000004'::uuid,'f2c00000-0000-0000-0000-000000000005'::uuid,'f2c00000-0000-0000-0000-000000000006'::uuid,'f2c00000-0000-0000-0000-000000000007'::uuid,'f2c00000-0000-0000-0000-000000000008'::uuid)) as disposable_clients_removed from observed;
rollback;
