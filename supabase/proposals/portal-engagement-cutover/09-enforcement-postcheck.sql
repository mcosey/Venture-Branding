begin read only;
select jsonb_build_object(
 'system_identifier',(select system_identifier::text from pg_control_system()),
 'converted_clients',(select count(*) from vb_private.legacy_test_mappings where enforcement_enabled),
 'active_original_engagements',(select count(*) from public.vb_engagements e join vb_private.legacy_test_mappings m on m.engagement_id=e.id where e.status='active'),
 'service_bindings',(select count(*) from vb_private.portal_service_bindings),
 'runtime_scope_triggers',(select count(*) from pg_trigger where tgname='zz_portal_scope' and tgenabled='O'),
 'restrictive_read_policies',(select count(*) from pg_policies where policyname='portal_scoped_read' and permissive='RESTRICTIVE'),
 'clients_unchanged',(select md5(coalesce(jsonb_agg(c order by id)::text,'')) from public.vb_clients c)='910249c562ca27860858146771e2fa6d',
 'memberships_unchanged',(select md5(coalesce(jsonb_agg(m order by client_id,user_id)::text,'')) from vb_private.client_memberships m)='fa3747007aff32f9e9f7558cff515963',
 'retained_test_engagements',(select count(*) from public.vb_engagements where id::text like 'f1740000-%'),
 'retained_test_matters',(select count(*) from public.vb_matters where id::text like 'f1750000-%'),
 'retained_test_marks',(select count(*) from public.vb_marks where id::text like 'f1760000-%'),
 'retained_test_evidence',(select count(*) from public.vb_evidence where id::text like 'f1770000-%'),
 'retained_test_storage_metadata',(select count(*) from storage.objects where bucket_id='vb-evidence' and name like 'rollback-scope/%'),
 'retained_test_publications',(select count(*) from public.vb_maintenance_publications where id::text like 'f1780000-%'),
 'retained_test_messages',(select count(*) from public.vb_inbox where id::text like 'f1790000-%'),
 'retained_test_runs',(select count(*) from public.vb_bcm_ai_runs where id::text like 'f17a0000-%'),
 'anon_cannot_close',not has_function_privilege('anon','public.vb_close_test_engagement(uuid,text)','EXECUTE'),
 'free_member_received_no_grants',not exists(select 1 from vb_private.portal_test_onboarding o join vb_private.engagement_grants g on g.user_id=o.user_id where not exists(select 1 from vb_private.client_memberships old where old.user_id=o.user_id)),
 'scheduler_config',(select to_jsonb(c) from vb_private.bcm_scheduler_config c where singleton),
 'ai_config',(select to_jsonb(c) from vb_private.bcm_ai_config c where singleton),
 'watch_config',(select to_jsonb(c) from vb_private.watch_config c where singleton)
) as postcheck;
rollback;
