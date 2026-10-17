-- Included in the single Test transaction after 01.
create function vb_private.watch_scope_active(eid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from vb_private.engagement_grants g where g.engagement_id=eid and vb_private.portal_actor_scope(eid,g.user_id,'trademark_watch'));
$$;
create function vb_private.watch_scope_access(cid uuid) returns void
language plpgsql stable security definer set search_path='' as $$ begin
 if not exists(select 1 from public.vb_clients c join vb_private.legacy_test_mappings m on m.client_id=c.id and m.enforcement_enabled
 where c.id=cid and c.portal_enabled and c.archived_at is null
 and (vb_private.is_staff() or exists(select 1 from public.vb_engagements e where e.client_id=cid and vb_private.portal_actor_scope(e.id,auth.uid(),'trademark_watch')))) then
  raise exception 'Watch workspace unavailable' using errcode='42501';
 end if;
end $$;
create function vb_private.watch_scope_mark(cid uuid,eid uuid,mark uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vb_marks m join vb_private.legacy_test_record_scopes r
 on r.resource='public.vb_marks' and r.record_key=jsonb_build_object('id',m.id) and r.client_id=m.client_id
 where m.id=mark and m.client_id=cid and r.engagement_id=eid and m.mark_type='word' and m.archived_at is null);
$$;
create function vb_private.watch_configuration_guard() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.vb_clients where id=new.client_id for update;
 if tg_op='UPDATE' and (new.id,new.client_id,new.engagement_id) is distinct from (old.id,old.client_id,old.engagement_id) then
  raise exception 'Watch configuration identity is immutable' using errcode='42501';
 end if;
 if not exists(select 1 from vb_private.legacy_test_mappings where client_id=new.client_id and enforcement_enabled) then raise exception 'Scoped Watch requires converted client' using errcode='42501'; end if;
 if auth.role()='authenticated' and not vb_private.is_staff() and not vb_private.portal_actor_scope(new.engagement_id,auth.uid(),'trademark_watch') then raise exception 'Watch access ended' using errcode='42501'; end if;
 if new.enabled and not vb_private.watch_scope_active(new.engagement_id) then raise exception 'Watch access ended' using errcode='42501'; end if;
 return new;
end $$;
create trigger watch_configuration_guard before insert or update on vb_private.watch_scope_settings for each row execute function vb_private.watch_configuration_guard();

-- An old RPC already waiting on the migration lock must fail, not write a retired
-- singleton after its settings were copied. Protected staff closure may only pause it.
create function vb_private.watch_legacy_write_guard() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from vb_private.legacy_test_mappings where client_id=new.client_id)
 and auth.role() in ('authenticated','service_role') then
  if tg_op='UPDATE' and vb_private.is_staff() and not new.enabled and new.next_run_at is null
  and to_jsonb(new)-array['enabled','next_run_at','version','updated_at']=to_jsonb(old)-array['enabled','next_run_at','version','updated_at'] then return new; end if;
  raise exception 'Refresh Watch and choose a configuration' using errcode='42501';
 end if;
 return new;
end $$;
create trigger watch_legacy_write_guard before insert or update on vb_private.watch_settings for each row execute function vb_private.watch_legacy_write_guard();

create function vb_private.watch_run_configuration_guard() returns trigger
language plpgsql security definer set search_path='' as $$ declare s vb_private.watch_scope_settings; begin
 if tg_op='UPDATE' and (new.id,new.client_id,new.configuration_id) is distinct from (old.id,old.client_id,old.configuration_id) then raise exception 'Watch run identity is immutable' using errcode='42501'; end if;
 if new.configuration_id is null then
  if exists(select 1 from vb_private.legacy_test_mappings where client_id=new.client_id) then raise exception 'Scoped Watch configuration required' using errcode='42501'; end if;
  return new;
 end if;
 select * into s from vb_private.watch_scope_settings where id=new.configuration_id and client_id=new.client_id;
 if not found or not vb_private.watch_scope_active(s.engagement_id) then raise exception 'Watch configuration unavailable' using errcode='42501'; end if;
 if auth.role()='authenticated' and not vb_private.is_staff() then raise exception 'Watch worker required' using errcode='42501'; end if;
 return new;
end $$;
create trigger watch_run_configuration_guard before insert or update on vb_private.watch_runs for each row execute function vb_private.watch_run_configuration_guard();

create function vb_private.watch_close_scope() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 -- Existing protected closure owns the client lock before changing engagement status.
 if old.status='active' and new.status<>'active' then
  update vb_private.watch_scope_settings set enabled=false,next_run_at=null,version=version+1,updated_at=now()
  where engagement_id=new.id;
 end if;
 return new;
end $$;
create trigger watch_close_scope after update of status on public.vb_engagements for each row execute function vb_private.watch_close_scope();

create function vb_private.watch_scoped_snapshot(cid uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare staff boolean; configs jsonb; findings jsonb; runs jsonb;
begin
 perform vb_private.watch_scope_access(cid); staff:=vb_private.is_staff();
 select coalesce(jsonb_agg(jsonb_build_object('scope_id',e.id,'label',e.title,'active',e.status='active',
 'settings',coalesce(to_jsonb(s),jsonb_build_object('id',null,'client_id',cid,'engagement_id',e.id,'version',0,'mark_ids','[]'::jsonb,'enabled',false)),
 'available_mark_ids',coalesce((select jsonb_agg(m.id order by m.id) from public.vb_marks m where m.client_id=cid and vb_private.watch_scope_mark(cid,e.id,m.id)),'[]'::jsonb)) order by e.created_at,e.id),'[]'::jsonb)
 into configs from public.vb_engagements e left join vb_private.watch_scope_settings s on s.engagement_id=e.id and s.client_id=e.client_id
 where e.client_id=cid and ((staff and (e.status='active' or s.id is not null)) or vb_private.portal_actor_scope(e.id,auth.uid(),'trademark_watch'));
 select coalesce(jsonb_agg(v order by v->>'first_seen_at' desc),'[]'::jsonb) into findings from (
 select case when staff then jsonb_build_object('id',f.id,'mark_id',f.mark_id,'serial',f.serial,'evidence',f.evidence,'reason',f.reason,'version',f.version,'review_status',f.review_status,'private_note',f.private_note,'publication',f.publication,'first_seen_at',f.first_seen_at)
 else f.publication||jsonb_build_object('id',f.id,'mark_id',f.mark_id,'serial',f.serial,'first_seen_at',f.first_seen_at) end v
 from vb_private.watch_findings f where f.client_id=cid
 and vb_private.portal_row_read(f.client_id,'vb_private.watch_findings',jsonb_build_object('id',f.id),'trademark_watch')
 and (staff or (f.publication is not null and exists(select 1 from public.vb_marks m where m.id=f.mark_id and m.client_id=cid and m.archived_at is null
 and vb_private.portal_row_read(m.client_id,'public.vb_marks',jsonb_build_object('id',m.id),'trademark_watch'))))
 order by f.first_seen_at desc,f.id limit 200) q;
 select coalesce(jsonb_agg(to_jsonb(q) order by checked_at desc),'[]'::jsonb) into runs from (
 select r.id,r.configuration_id,r.checked_at,r.coverage_from,r.coverage_to,r.status,r.missing_dates,r.settings_version
 from vb_private.watch_runs r join vb_private.watch_scope_settings s on s.id=r.configuration_id and s.client_id=r.client_id
 where r.client_id=cid and (staff or vb_private.portal_actor_scope(s.engagement_id,auth.uid(),'trademark_watch'))
 order by r.checked_at desc,r.id limit 20) q;
 return jsonb_build_object('scoped',true,'configurations',configs,'findings',findings,'runs',runs,'staff',staff,'limit',200,
 'ready',(select enabled from vb_private.watch_config),'latest_source_date',(select max(data_date) from vb_private.watch_files where completed_at is not null));
end $$;

create function public.vb_watch_save_scoped(target_client uuid,target_engagement uuid,expected_configuration uuid,expected_version integer,selected_marks uuid[],monitoring boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s vb_private.watch_scope_settings; enabled_before boolean; other_marks integer;
begin
 -- Every mutation and closure uses the same legal-client lock; recheck grants afterwards.
 perform vb_private.watch_scope_access(target_client);
 perform 1 from public.vb_clients where id=target_client for update;
 perform vb_private.watch_scope_access(target_client);
 if not exists(select 1 from public.vb_engagements e where e.id=target_engagement and e.client_id=target_client and e.status='active'
 and (vb_private.is_staff() or vb_private.portal_actor_scope(e.id,auth.uid(),'trademark_watch'))) then raise exception 'Watch configuration unavailable' using errcode='42501'; end if;
 if expected_version is null or monitoring is null or selected_marks is null or cardinality(selected_marks)>10 or coalesce(array_ndims(selected_marks),1)>1
 or cardinality(selected_marks)<>(select count(distinct x) from unnest(selected_marks) x)
 or exists(select 1 from unnest(selected_marks) x where not vb_private.watch_scope_mark(target_client,target_engagement,x)) then raise exception 'Word mark selection unavailable' using errcode='22023'; end if;
 select * into s from vb_private.watch_scope_settings where client_id=target_client and engagement_id=target_engagement for update;
 if found then
  if s.id is distinct from expected_configuration or s.version<>expected_version then raise exception 'Watch settings changed' using errcode='40001'; end if;
 else
  if expected_configuration is not null or expected_version<>0 then raise exception 'Watch settings changed' using errcode='40001'; end if;
 end if;
 select coalesce(sum(cardinality(c.mark_ids)),0) into other_marks from vb_private.watch_scope_settings c join public.vb_engagements e on e.id=c.engagement_id
 where c.client_id=target_client and c.engagement_id<>target_engagement and e.status='active';
 if other_marks+cardinality(selected_marks)>10 then raise exception 'Selection cannot be saved; contact your attorney' using errcode='22023'; end if;
 if monitoring and (cardinality(selected_marks)=0 or not (select enabled from vb_private.watch_config)) then raise exception 'Monitoring is not ready' using errcode='22023'; end if;
 if s.id is null then
  insert into vb_private.watch_scope_settings(client_id,engagement_id) values(target_client,target_engagement) returning * into s;
 end if;
 enabled_before:=s.enabled;
 update vb_private.watch_scope_settings set mark_ids=selected_marks,enabled=monitoring,version=version+1,updated_at=now(),
 started_on=case when monitoring then coalesce(started_on,current_date) else started_on end,
 next_run_at=case when not monitoring then null when not enabled_before or selected_marks is distinct from s.mark_ids then now() else next_run_at end
 where id=s.id returning * into s;
 return to_jsonb(s);
end $$;

-- No private table/helper access, including service_role bypassing the intended RPC.
revoke all on function vb_private.watch_scope_active(uuid),vb_private.watch_scope_access(uuid),vb_private.watch_scope_mark(uuid,uuid,uuid),vb_private.watch_configuration_guard(),vb_private.watch_legacy_write_guard(),vb_private.watch_run_configuration_guard(),vb_private.watch_close_scope(),vb_private.watch_scoped_snapshot(uuid) from public,anon,authenticated,service_role;
revoke all on function public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean) from public,anon,authenticated,service_role;
grant execute on function public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean) to authenticated;
