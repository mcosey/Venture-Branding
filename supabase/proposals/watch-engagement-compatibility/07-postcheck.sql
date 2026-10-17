-- Read-only after approved application; run 06 again and compare every field too.
begin read only;
select jsonb_build_object(
 'is_test',(select system_identifier::text from pg_control_system())='7692130048193495360',
 'converted_legacy_settings_excluded_from_queue',not exists(select 1 from vb_private.watch_due_configurations() q join vb_private.legacy_test_mappings m using(client_id) where q.configuration_id is null),
 'copied_values_preserved',not exists(select 1 from vb_private.watch_settings old join vb_private.legacy_test_mappings m using(client_id)
 left join vb_private.watch_scope_settings n on n.client_id=old.client_id and n.engagement_id=vb_private.portal_record_engagement('vb_private.watch_settings',jsonb_build_object('client_id',old.client_id))
 where n.id is null or to_jsonb(n)-array['id','engagement_id'] is distinct from to_jsonb(old)),
 'runs_have_configuration',not exists(select 1 from vb_private.watch_runs r join vb_private.legacy_test_mappings m using(client_id) where r.configuration_id is null),
 'runs_preserve_original_scope',not exists(select 1 from vb_private.watch_runs r join vb_private.legacy_test_record_scopes l on l.resource='vb_private.watch_runs' and l.record_key=jsonb_build_object('id',r.id)
 join vb_private.watch_scope_settings s on s.id=r.configuration_id where s.client_id<>l.client_id or s.engagement_id<>l.engagement_id),
 'raw_configuration_denied',not has_table_privilege('authenticated','vb_private.watch_scope_settings','select'),
 'anonymous_save_denied',not has_function_privilege('anon','public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)','execute'),
 'no_scenario_clients',not exists(select 1 from public.vb_clients where name in('ROLLBACK WATCH COMPANY','ROLLBACK WATCH PERSON')),
 'no_scenario_applications',not exists(select 1 from vb_private.watch_applications where serial in('99170201','99170202')),
 'rpc_fingerprints',(select jsonb_object_agg(p,md5(pg_get_functiondef(p::regprocedure))) from unnest(array['public.vb_watch_snapshot(uuid)','public.vb_watch_save(uuid,integer,uuid[],boolean)','public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)','public.vb_watch_run_due()']) p)
) as watch_postcheck;
rollback;
