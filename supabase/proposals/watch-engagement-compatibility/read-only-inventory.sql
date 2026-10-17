begin read only;
with actor as (select id from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com'), binding as (select * from vb_private.portal_service_bindings where client_id='b9100000-0000-0000-0000-000000000001' and service='trademark_watch')
select jsonb_build_object('is_test',(select system_identifier::text from pg_control_system())='7692130048193495360',
'binding',(select jsonb_build_object('engagement_id',engagement_id,'actor_has_access',vb_private.portal_actor_scope(engagement_id,(select id from actor),'trademark_watch')) from binding),
'active_grants',(select jsonb_agg(jsonb_build_object('engagement_id',e.id,'service_access',vb_private.portal_actor_scope(e.id,g.user_id,'trademark_watch'))) from public.vb_engagements e join vb_private.engagement_grants g on g.engagement_id=e.id where e.client_id='b9100000-0000-0000-0000-000000000001' and e.status='active' and g.user_id=(select id from actor)),
'settings',(select jsonb_build_object('version',version,'enabled',enabled,'selected_marks',cardinality(mark_ids),'scheduled',next_run_at is not null) from vb_private.watch_settings where client_id='b9100000-0000-0000-0000-000000000001'),
'scopes',(select jsonb_agg(jsonb_build_object('resource',resource,'engagement_id',engagement_id,'count',n)) from (select resource,engagement_id,count(*) n from vb_private.legacy_test_record_scopes where client_id='b9100000-0000-0000-0000-000000000001' and resource in ('vb_private.watch_settings','vb_private.watch_findings','vb_private.watch_runs') group by resource,engagement_id) x),
'definition_hashes',(select jsonb_object_agg(p,md5(pg_get_functiondef(p::regprocedure))) from unnest(array['vb_private.watch_access(uuid)','public.vb_watch_snapshot(uuid)','public.vb_watch_save(uuid,integer,uuid[],boolean)']) p)
) as watch_compatibility;
rollback;
