begin read only;
select jsonb_build_object(
 'system_identifier',(select system_identifier::text from pg_control_system()),
 'mappings',(select count(*) from vb_private.legacy_test_mappings),
 'active_test_engagements',(select count(*) from public.vb_engagements e join vb_private.legacy_test_mappings m on m.engagement_id=e.id where e.status='active'),
 'mapped_records',(select count(*) from vb_private.legacy_test_record_scopes),
 'mapped_marks',(select count(*) from vb_private.legacy_test_record_scopes where resource='public.vb_marks'),
 'original_clients_unchanged',(select md5(coalesce(jsonb_agg(c order by id)::text,'')) from public.vb_clients c)='910249c562ca27860858146771e2fa6d',
 'original_memberships_unchanged',(select md5(coalesce(jsonb_agg(m order by client_id,user_id)::text,'')) from vb_private.client_memberships m)='fa3747007aff32f9e9f7558cff515963',
 'retained_rollback_engagements',(select count(*) from public.vb_engagements where id='f1720000-0000-0000-0000-000000000001'),
 'retained_rollback_matters',(select count(*) from public.vb_matters where id='f1730000-0000-0000-0000-000000000001'),
 'mapping_tables_have_rls',(select bool_and(relrowsecurity) from pg_class where oid in('vb_private.legacy_test_mappings'::regclass,'vb_private.legacy_test_record_scopes'::regclass)),
 'free_member_received_no_grants',not exists(select 1 from vb_private.portal_test_onboarding o join vb_private.engagement_grants g on g.user_id=o.user_id where not exists(select 1 from vb_private.client_memberships old where old.user_id=o.user_id)),
 'legacy_cutover_enabled',exists(select 1 from vb_private.legacy_test_mappings where enforcement_enabled)
) as postcheck;
rollback;
