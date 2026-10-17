-- Included in the single Test transaction. Legacy clients retain their original settings.
create function vb_private.watch_due_configurations() returns table(
 client_id uuid,mark_ids uuid[],enabled boolean,version integer,started_on date,next_run_at timestamptz,configuration_id uuid,engagement_id uuid
) language sql stable security definer set search_path='' as $$
 select s.client_id,s.mark_ids,s.enabled,s.version,s.started_on,s.next_run_at,null::uuid,null::uuid
 from vb_private.watch_settings s join public.vb_clients c on c.id=s.client_id
 where not exists(select 1 from vb_private.legacy_test_mappings m where m.client_id=s.client_id)
 and s.enabled and s.next_run_at<=now() and c.portal_enabled and c.archived_at is null
 and vb_private.portal_worker_service(s.client_id,'trademark_watch')
 union all
 select s.client_id,s.mark_ids,s.enabled,s.version,s.started_on,s.next_run_at,s.id,s.engagement_id
 from vb_private.watch_scope_settings s join public.vb_clients c on c.id=s.client_id
 where s.enabled and s.next_run_at<=now() and c.portal_enabled and c.archived_at is null
 and vb_private.watch_scope_active(s.engagement_id)
 and cardinality(s.mark_ids)>0 and not exists(select 1 from unnest(s.mark_ids) mark where not vb_private.watch_scope_mark(s.client_id,s.engagement_id,mark));
$$;
create function vb_private.watch_advance_configuration(cid uuid,configuration uuid,next_check timestamptz) returns void
language plpgsql security definer set search_path='' as $$ begin
 if configuration is null then
  update vb_private.watch_settings set next_run_at=next_check where client_id=cid;
 else
  update vb_private.watch_scope_settings set next_run_at=next_check where id=configuration and client_id=cid;
 end if;
end $$;
revoke all on function vb_private.watch_due_configurations(),vb_private.watch_advance_configuration(uuid,uuid,timestamptz) from public,anon,authenticated,service_role;
