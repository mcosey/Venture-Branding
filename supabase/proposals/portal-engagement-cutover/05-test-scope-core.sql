-- Prepared, NOT applied. Include with 06 in one transaction; Test only.
-- Runtime record scopes retain their original engagement after closure.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if (select count(*) from vb_private.legacy_test_mappings where not enforcement_enabled)<>4 then raise exception 'Expected four staged clients'; end if;
 if exists(select 1 from public.vb_engagements e join vb_private.legacy_test_mappings m on m.client_id=e.client_id where e.id<>m.engagement_id) then raise exception 'Additional engagement requires mapping review'; end if;
end $$;
do $$ begin
 if md5(pg_get_functiondef('public.vb_portal_entry()'::regprocedure))<>'c5293673376c0dd567670c36f42c622f' then raise exception 'Access definition changed: vb_portal_entry'; end if;
 if md5(pg_get_functiondef('public.vb_session_role()'::regprocedure))<>'24571728ae819f33e9709012e27158b4' then raise exception 'Access definition changed: vb_session_role'; end if;
 if md5(pg_get_functiondef('vb_private.is_client_member(uuid)'::regprocedure))<>'b2434a5fd62808c4938f5e2d22b18125' then raise exception 'Access definition changed: is_client_member'; end if;
end $$;
alter table vb_private.legacy_test_mappings drop constraint legacy_test_mappings_enforcement_enabled_check;
-- Remove the staging-only constraint that forced every record into the client's first matter.
do $$ declare constraint_name text; begin
 select conname into constraint_name from pg_constraint where conrelid='vb_private.legacy_test_record_scopes'::regclass and confrelid='vb_private.legacy_test_mappings'::regclass and contype='f';
 if constraint_name is null then raise exception 'Staging foreign key missing'; end if;
 execute format('alter table vb_private.legacy_test_record_scopes drop constraint %I',constraint_name);
end $$;
alter table vb_private.legacy_test_record_scopes
 add foreign key(engagement_id,client_id) references public.vb_engagements(id,client_id),
 add foreign key(matter_id,engagement_id) references public.vb_matters(id,engagement_id);
create table vb_private.portal_service_bindings (
 client_id uuid not null references public.vb_clients(id), service text not null,
 engagement_id uuid not null, matter_id uuid not null,
 primary key(client_id,service),
 foreign key(engagement_id,client_id) references public.vb_engagements(id,client_id),
 foreign key(matter_id,engagement_id) references public.vb_matters(id,engagement_id),
 foreign key(engagement_id,service) references vb_private.engagement_services(engagement_id,service)
);
alter table vb_private.portal_service_bindings enable row level security;
revoke all on vb_private.portal_service_bindings from public,anon,authenticated;
insert into vb_private.portal_service_bindings
 select m.client_id,s.service,m.engagement_id,m.matter_id from vb_private.legacy_test_mappings m join vb_private.engagement_services s using(engagement_id);
create trigger portal_lifecycle_audit after insert or update on vb_private.portal_service_bindings for each row execute function vb_private.audit_portal_lifecycle();
create trigger portal_lifecycle_audit after insert or update on vb_private.legacy_test_record_scopes for each row execute function vb_private.audit_portal_lifecycle();

create function vb_private.portal_actor_scope(eid uuid,actor uuid,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vb_engagements e
 join public.vb_clients c on c.id=e.client_id
 join vb_private.portal_accounts a on a.user_id=actor and a.status='active'
 join vb_private.engagement_grants g on g.engagement_id=e.id and g.user_id=actor and g.status='active' and g.accepted_at is not null
 join vb_private.engagement_services s on s.engagement_id=e.id and s.service=feature and s.enabled
 where e.id=eid and e.status='active' and c.portal_enabled and c.archived_at is null)
 and not exists(select 1 from vb_private.staff_members where user_id=actor);
$$;
create function vb_private.portal_service_actor(cid uuid,actor uuid,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from vb_private.legacy_test_mappings where client_id=cid)
 then exists(select 1 from vb_private.portal_service_bindings b where b.client_id=cid and b.service=feature and vb_private.portal_actor_scope(b.engagement_id,actor,feature))
 else exists(select 1 from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id where m.client_id=cid and m.user_id=actor and m.active and c.portal_enabled and c.archived_at is null)
 and not exists(select 1 from vb_private.staff_members where user_id=actor)
 and not exists(select 1 from vb_private.portal_accounts where user_id=actor and status<>'active') end;
$$;
create function vb_private.portal_record_actor(resource_name text,key_value jsonb,actor uuid,feature text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare cid uuid; eid uuid;
begin
 select engagement_id into eid from vb_private.legacy_test_record_scopes where resource=resource_name and record_key=key_value;
 if found then return vb_private.portal_actor_scope(eid,actor,feature); end if;
 -- Preserve an unrelated, unconverted legacy client. Missing mappings for converted clients deny.
 if resource_name not in ('public.vb_bcm_ai_observations','public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews','public.vb_bcm_ai_runs','public.vb_bcm_scans','public.vb_bcm_schedules','public.vb_bcm_settings','public.vb_client_references','public.vb_digest_preferences','public.vb_evidence','public.vb_filing_drafts','public.vb_inbox','public.vb_maintenance_publications','public.vb_marks','public.vb_service_preferences','vb_private.maintenance_drafts','vb_private.watch_findings','vb_private.watch_runs','vb_private.watch_settings') or key_value is null or key_value='{}'::jsonb then return false; end if;
 execute format('select client_id from %s t where to_jsonb(t) @> $1 limit 1',resource_name::regclass) into cid using key_value;
 if cid is null or exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) then return false; end if;
 return vb_private.portal_service_actor(cid,actor,feature);
end $$;
create function vb_private.portal_record_read(resource_name text,key_value jsonb,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select vb_private.is_staff() or vb_private.portal_record_actor(resource_name,key_value,auth.uid(),feature);
$$;
create function vb_private.portal_row_read(cid uuid,resource_name text,key_value jsonb,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select vb_private.is_staff() or case when exists(select 1 from vb_private.legacy_test_mappings where client_id=cid)
 then vb_private.portal_record_actor(resource_name,key_value,auth.uid(),feature) else vb_private.is_client_member(cid) end;
$$;
create function vb_private.portal_require_service(cid uuid,feature text) returns void
language plpgsql stable security definer set search_path='' as $$ begin
 if not vb_private.is_staff() and not vb_private.portal_service_actor(cid,auth.uid(),feature) then raise exception 'This service is unavailable for your engagements.' using errcode='42501'; end if;
end $$;
create function vb_private.portal_require_record(resource_name text,key_value jsonb,feature text,cid uuid default null) returns void
language plpgsql stable security definer set search_path='' as $$ begin
 if cid is not null and not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) then return; end if;
 if not vb_private.portal_record_read(resource_name,key_value,feature) then raise exception 'This record is unavailable for your engagements.' using errcode='42501'; end if;
end $$;
create function vb_private.portal_record_engagement(resource_name text,key_value jsonb) returns uuid
language sql stable security definer set search_path='' as $$
 select engagement_id from vb_private.legacy_test_record_scopes where resource=resource_name and record_key=key_value;
$$;
create function vb_private.portal_worker_service(cid uuid,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from vb_private.legacy_test_mappings where client_id=cid)
 then exists(select 1 from vb_private.portal_service_bindings b join vb_private.engagement_grants g on g.engagement_id=b.engagement_id where b.client_id=cid and b.service=feature and vb_private.portal_actor_scope(b.engagement_id,g.user_id,feature))
 else exists(select 1 from vb_private.client_memberships m where m.client_id=cid and vb_private.portal_service_actor(cid,m.user_id,feature)) end;
$$;
create function vb_private.portal_same_service_scope(cid uuid,resource_name text,key_value jsonb,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) or exists(select 1 from vb_private.portal_service_bindings b join vb_private.legacy_test_record_scopes r on r.engagement_id=b.engagement_id and r.client_id=b.client_id where b.client_id=cid and b.service=feature and r.resource=resource_name and r.record_key=key_value);
$$;

-- Metadata-only enforcement: original legal rows and timestamps are not rewritten.
-- TG_ARGV: service (or preference), primary-key columns separated by comma.
create function vb_private.portal_scope_new_record() returns trigger
language plpgsql security definer set search_path='' as $$
declare resource_name text:=tg_table_schema||'.'||tg_table_name; payload jsonb:=to_jsonb(new); key_value jsonb; old_key jsonb;
 cid uuid:=new.client_id; feature text:=tg_argv[0]; parent_id uuid; eid uuid; mid uuid; previous_scope vb_private.legacy_test_record_scopes;
begin
 if not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) then
  if tg_op='UPDATE' and exists(select 1 from vb_private.legacy_test_mappings where client_id=old.client_id) then raise exception 'Legal-client ownership is immutable'; end if;
  return new;
 end if;
 select jsonb_object_agg(key,value) into key_value from jsonb_each(payload) where key=any(string_to_array(tg_argv[1],','));
 if tg_op='UPDATE' then
  select jsonb_object_agg(key,value) into old_key from jsonb_each(to_jsonb(old)) where key=any(string_to_array(tg_argv[1],','));
  if old.client_id is distinct from cid or key_value is distinct from old_key then raise exception 'Record identity and legal-client ownership are immutable'; end if;
  select * into previous_scope from vb_private.legacy_test_record_scopes where resource=resource_name and record_key=old_key;
  if feature='preference' then feature:=case payload->>'service' when 'specimen_capture' then 'use_history' else payload->>'service' end; end if;
  if previous_scope.engagement_id is null then raise exception 'Unmapped record requires administrative review'; end if;
  if not vb_private.is_staff() and auth.role()='authenticated' and not vb_private.portal_actor_scope(previous_scope.engagement_id,auth.uid(),feature) then raise exception 'Record access ended' using errcode='42501'; end if;
  if auth.role()='service_role' and not exists(select 1 from vb_private.engagement_grants g where g.engagement_id=previous_scope.engagement_id and vb_private.portal_actor_scope(g.engagement_id,g.user_id,feature)) then
   if payload->>'status' in ('failed','discarded') and payload-array['status','finished_at']=to_jsonb(old)-array['status','finished_at'] then return new; end if;
   raise exception 'Worker scope ended' using errcode='42501';
  end if;
  if (to_jsonb(old)->'mark_id') is distinct from (payload->'mark_id') or (to_jsonb(old)->'finding_id') is distinct from (payload->'finding_id') then raise exception 'Record parent scope is immutable'; end if;
  return new;
 end if;
 if feature='preference' then feature:=case payload->>'service' when 'specimen_capture' then 'use_history' else payload->>'service' end; end if;
 if payload ? 'mark_id' and nullif(payload->>'mark_id','') is not null then
  parent_id:=(payload->>'mark_id')::uuid;
  select r.engagement_id,r.matter_id into eid,mid from vb_private.legacy_test_record_scopes r where r.resource='public.vb_marks' and r.record_key=jsonb_build_object('id',parent_id) and r.client_id=cid;
 elsif resource_name in ('public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews') then
  parent_id:=(payload->>'finding_id')::uuid;
  select r.engagement_id,r.matter_id into eid,mid from vb_private.legacy_test_record_scopes r where r.resource='public.vb_bcm_ai_observations' and r.record_key=jsonb_build_object('id',parent_id) and r.client_id=cid;
 else
  select b.engagement_id,b.matter_id into eid,mid from vb_private.portal_service_bindings b where b.client_id=cid and b.service=feature;
 end if;
 if auth.role()='authenticated' and not vb_private.is_staff() and not vb_private.portal_actor_scope(eid,auth.uid(),feature) then raise exception 'Record access unavailable' using errcode='42501'; end if;
 if auth.role()='service_role' and not exists(select 1 from vb_private.engagement_grants g where g.engagement_id=eid and vb_private.portal_actor_scope(eid,g.user_id,feature)) then raise exception 'Worker scope unavailable' using errcode='42501'; end if;
 if eid is null then raise exception 'An explicit legal matter/service binding is required'; end if;
 insert into vb_private.legacy_test_record_scopes(resource,record_key,client_id,engagement_id,matter_id,source_fingerprint)
 values(resource_name,key_value,cid,eid,mid,md5(payload::text));
 return new;
end $$;

-- Active engagement replaces membership for mapped clients; no permissive legacy OR.
create or replace function vb_private.is_client_member(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from vb_private.legacy_test_mappings where client_id=target)
 then exists(select 1 from public.vb_engagements e where e.client_id=target and vb_private.can_access_engagement(e.id))
 else exists(select 1 from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id where m.client_id=target and m.user_id=auth.uid() and m.active and c.portal_enabled and c.archived_at is null)
 and not exists(select 1 from vb_private.portal_accounts where user_id=auth.uid() and status<>'active') end
 and not exists(select 1 from vb_private.staff_members where user_id=auth.uid());
$$;
create or replace function public.vb_session_role() returns text
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from vb_private.staff_members where user_id=auth.uid()) then case when vb_private.is_staff() then 'staff' else 'denied' end
 when exists(select 1 from public.vb_clients c where vb_private.is_client_member(c.id)) then 'client' else 'denied' end;
$$;

-- No public record deletion or account provisioning is introduced.
create function public.vb_close_test_engagement(target_engagement uuid,expected_status text) returns void
language plpgsql security definer set search_path='' as $$
declare cid uuid; current_status text;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 select client_id into cid from public.vb_engagements where id=target_engagement;
 if cid is null or not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) then raise exception 'Test engagement unavailable'; end if;
 perform 1 from public.vb_clients where id=cid for update;
 select status into current_status from public.vb_engagements where id=target_engagement for update;
 if current_status is distinct from expected_status or current_status<>'active' then raise exception 'Engagement changed; reload first' using errcode='40001'; end if;
 update public.vb_engagements set status='closed',closed_at=clock_timestamp() where id=target_engagement;
 update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,last_status='access_unavailable',updated_at=now()
 where client_id=cid and vb_private.portal_record_engagement('public.vb_bcm_schedules',jsonb_build_object('client_id',cid))=target_engagement;
 update vb_private.watch_settings set enabled=false,next_run_at=null,version=version+1,updated_at=now()
 where client_id=cid and vb_private.portal_record_engagement('vb_private.watch_settings',jsonb_build_object('client_id',cid))=target_engagement;
 update public.vb_digest_preferences d set next_due_at='infinity'::timestamptz
 where d.client_id=cid and vb_private.portal_record_engagement('public.vb_digest_preferences',jsonb_build_object('user_id',d.user_id,'client_id',cid))=target_engagement;
 update public.vb_bcm_ai_runs r set status='failed',finished_at=now() where r.client_id=cid and r.status='running' and vb_private.portal_record_engagement('public.vb_bcm_ai_runs',jsonb_build_object('id',r.id))=target_engagement;
 update public.vb_bcm_scans r set status='failed',finished_at=now() where r.client_id=cid and r.status='running' and vb_private.portal_record_engagement('public.vb_bcm_scans',jsonb_build_object('id',r.id))=target_engagement;
end $$;
revoke all on function vb_private.portal_actor_scope(uuid,uuid,text),vb_private.portal_service_actor(uuid,uuid,text),vb_private.portal_record_actor(text,jsonb,uuid,text),vb_private.portal_record_read(text,jsonb,text),vb_private.portal_require_service(uuid,text),vb_private.portal_require_record(text,jsonb,text,uuid),vb_private.portal_row_read(uuid,text,jsonb,text),vb_private.portal_record_engagement(text,jsonb),vb_private.portal_worker_service(uuid,text),vb_private.portal_same_service_scope(uuid,text,jsonb,text),vb_private.portal_scope_new_record(),public.vb_close_test_engagement(uuid,text) from public,anon,authenticated;
grant execute on function vb_private.portal_record_read(text,jsonb,text),vb_private.portal_row_read(uuid,text,jsonb,text) to authenticated;
grant execute on function public.vb_close_test_engagement(uuid,text) to authenticated;
-- 06 installs all row policies/RPC/worker checks before the transaction is committed.
