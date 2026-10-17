-- PREPARED ONLY. Test migration; assembled with 02 and 03 into one transaction.
begin;
-- BEGIN HOSTED GUARDS (local harness omits only this metadata block)
do $guard$ declare sig text; expected text; actual text; begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 for sig,expected in select * from jsonb_each_text('{"public.vb_watch_snapshot(uuid)":"e490907f92a9a783b3154fb69bf70724","public.vb_watch_save(uuid,integer,uuid[],boolean)":"b0d77e308ab93325ca98b764cbe081f7","public.vb_watch_run_due()":"7ea89fea7a03e5f904eb69d4e2e29ca7","vb_private.watch_access(uuid)":"7cd89c83d3cebb8b2533f697111dea3a","public.vb_close_test_engagement(uuid,text)":"51a8ca641d5a6c293fda260bdadf000d","vb_private.portal_scope_new_record()":"75b0ffa0820772cf472bffb680a24712","vb_private.portal_actor_scope(uuid,uuid,text)":"cbdeaf66a2009f9d07193e76e0c502d0","vb_private.portal_row_read(uuid,text,jsonb,text)":"789e3a51f913c78ed421c788743edd89"}'::jsonb) loop
  if md5(pg_get_functiondef(sig::regprocedure))<>expected then raise exception 'Changed function: %',sig; end if;
 end loop;
 for sig,expected in select * from jsonb_each_text('{"watch_settings":"d0d45ca2bd17ca463d8e94d6e9e04dda","watch_runs":"c9df625f7a91dcf038072eba894467f4"}'::jsonb) loop
  select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text,',' order by a.attnum)) into actual
  from pg_attribute a where a.attrelid=('vb_private.'||sig)::regclass and a.attnum>0 and not a.attisdropped;
  if actual is distinct from expected then raise exception 'Changed table: %',sig; end if;
 end loop;
 if (select count(*) from vb_private.legacy_test_mappings)<>4 or exists(select 1 from vb_private.legacy_test_mappings where not enforcement_enabled) then raise exception 'Expected reviewed Test cutover'; end if;
 if to_regclass('vb_private.watch_scope_settings') is not null then raise exception 'Watch migration already installed'; end if;
end $guard$;
-- END HOSTED GUARDS
select pg_advisory_xact_lock(73772131);
lock table public.vb_clients in access exclusive mode;
lock table vb_private.watch_settings,vb_private.watch_runs in share row exclusive mode;

create table vb_private.watch_scope_settings (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.vb_clients(id), engagement_id uuid not null,
 mark_ids uuid[] not null default '{}', enabled boolean not null default false,
 version integer not null default 0 check(version>=0), started_on date, next_run_at timestamptz,
 updated_at timestamptz not null default now(),
 foreign key(engagement_id,client_id) references public.vb_engagements(id,client_id),
 unique(client_id,engagement_id), unique(id,client_id),
 check(cardinality(mark_ids)<=10), check(not enabled or cardinality(mark_ids)>0)
);
alter table vb_private.watch_scope_settings enable row level security;
revoke all on vb_private.watch_scope_settings from public,anon,authenticated,service_role;

-- A migration may copy an established scope; it may never guess from a newer grant.
do $$ begin
 if exists(select 1 from vb_private.watch_settings s join vb_private.legacy_test_mappings m using(client_id)
 left join vb_private.legacy_test_record_scopes r on r.client_id=s.client_id and r.resource='vb_private.watch_settings' and r.record_key=jsonb_build_object('client_id',s.client_id)
 left join public.vb_engagements e on e.id=r.engagement_id and e.client_id=s.client_id
 where r.engagement_id is null or e.id is null
 or cardinality(s.mark_ids)<>(select count(distinct x) from unnest(s.mark_ids) x)
 or cardinality(s.mark_ids)>10 or coalesce(array_ndims(s.mark_ids),1)>1
 or exists(select 1 from unnest(s.mark_ids) x left join public.vb_marks mark on mark.id=x and mark.client_id=s.client_id
 left join vb_private.legacy_test_record_scopes mr on mr.resource='public.vb_marks' and mr.record_key=jsonb_build_object('id',x) and mr.client_id=s.client_id
 where mark.id is null or mr.engagement_id is distinct from r.engagement_id)) then
  raise exception 'Watch settings require explicit scope review';
 end if;
 if exists(select 1 from vb_private.watch_settings s join vb_private.legacy_test_mappings m using(client_id)
 join vb_private.legacy_test_record_scopes r on r.resource='vb_private.watch_settings' and r.record_key=jsonb_build_object('client_id',s.client_id)
 join public.vb_engagements e on e.id=r.engagement_id where s.enabled and e.status<>'active') then
  raise exception 'Closed Watch schedule requires review before migration';
 end if;
end $$;
insert into vb_private.watch_scope_settings(client_id,engagement_id,mark_ids,enabled,version,started_on,next_run_at,updated_at)
 select s.client_id,r.engagement_id,s.mark_ids,s.enabled,s.version,s.started_on,s.next_run_at,s.updated_at
 from vb_private.watch_settings s join vb_private.legacy_test_mappings m using(client_id)
 join vb_private.legacy_test_record_scopes r on r.client_id=s.client_id and r.resource='vb_private.watch_settings' and r.record_key=jsonb_build_object('client_id',s.client_id);

alter table vb_private.watch_runs add column configuration_id uuid;
alter table vb_private.watch_runs add foreign key(configuration_id,client_id) references vb_private.watch_scope_settings(id,client_id);
-- Backfill must preserve the existing run scope, including retained closed runs.
do $$ begin
 if exists(select 1 from vb_private.watch_runs w join vb_private.legacy_test_mappings m using(client_id)
 left join vb_private.legacy_test_record_scopes r on r.resource='vb_private.watch_runs' and r.record_key=jsonb_build_object('id',w.id) and r.client_id=w.client_id
 left join vb_private.watch_scope_settings s on s.client_id=w.client_id and s.engagement_id=r.engagement_id
 where s.id is null) then raise exception 'Watch history requires explicit scope review'; end if;
end $$;
do $$ begin
 if exists(select 1 from vb_private.watch_findings f join vb_private.legacy_test_mappings m using(client_id)
 left join vb_private.legacy_test_record_scopes r on r.resource='vb_private.watch_findings' and r.record_key=jsonb_build_object('id',f.id) and r.client_id=f.client_id
 left join vb_private.legacy_test_record_scopes mr on mr.resource='public.vb_marks' and mr.record_key=jsonb_build_object('id',f.mark_id) and mr.client_id=f.client_id
 left join vb_private.watch_scope_settings s on s.client_id=f.client_id and s.engagement_id=r.engagement_id
 where r.engagement_id is null or r.engagement_id is distinct from mr.engagement_id or s.id is null) then raise exception 'Watch findings require explicit scope review'; end if;
end $$;
-- The original trigger validates UPDATE against the old ledger and keeps its scope.
update vb_private.watch_runs w set configuration_id=s.id
 from vb_private.legacy_test_record_scopes r join vb_private.watch_scope_settings s on s.client_id=r.client_id and s.engagement_id=r.engagement_id
 where r.resource='vb_private.watch_runs' and r.record_key=jsonb_build_object('id',w.id) and w.client_id=r.client_id;

-- New scoped runs derive their scope from an immutable configuration, not a singleton binding.
drop trigger zz_portal_scope on vb_private.watch_runs;
create trigger zz_portal_scope after insert or update on vb_private.watch_runs for each row
 when (new.configuration_id is null) execute function vb_private.portal_scope_new_record('trademark_watch','id');
create index watch_scope_due on vb_private.watch_scope_settings(next_run_at) where enabled;
create index watch_runs_configuration on vb_private.watch_runs(configuration_id,checked_at desc);
create trigger portal_lifecycle_audit after insert or update on vb_private.watch_scope_settings for each row execute function vb_private.audit_portal_lifecycle();

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

-- Generated by tools/prepare-watch-compatibility.mjs; do not edit.
CREATE OR REPLACE FUNCTION public.vb_watch_snapshot(target_client uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare staff boolean; s jsonb; f jsonb; r jsonb;
begin
 if exists(select 1 from vb_private.legacy_test_mappings where client_id=target_client and enforcement_enabled) then return vb_private.watch_scoped_snapshot(target_client); end if;
 perform vb_private.watch_access(target_client); staff:=vb_private.is_staff();
 select to_jsonb(t) into s from vb_private.watch_settings t where client_id=target_client and vb_private.portal_row_read(client_id,'vb_private.watch_settings',jsonb_build_object('client_id',client_id),'trademark_watch');
 select coalesce(jsonb_agg(v order by v->>'first_seen_at' desc),'[]') into f from (
 select case when staff then jsonb_build_object('id',id,'mark_id',mark_id,'serial',serial,'evidence',evidence,'reason',reason,'version',version,'review_status',review_status,'private_note',private_note,'publication',publication,'first_seen_at',first_seen_at)
 else publication||jsonb_build_object('id',id,'mark_id',mark_id,'serial',serial,'first_seen_at',first_seen_at) end v
 from vb_private.watch_findings where client_id=target_client and vb_private.portal_row_read(client_id,'vb_private.watch_findings',jsonb_build_object('id',id),'trademark_watch') and (staff or (publication is not null and exists(select 1 from public.vb_marks m where m.id=mark_id and m.client_id=target_client and m.archived_at is null)))
 order by first_seen_at desc limit 200
 ) rows;
 select coalesce(jsonb_agg(to_jsonb(t) order by checked_at desc),'[]') into r from (
 select id,checked_at,coverage_from,coverage_to,status,missing_dates,settings_version from vb_private.watch_runs where client_id=target_client and vb_private.portal_row_read(client_id,'vb_private.watch_runs',jsonb_build_object('id',id),'trademark_watch') order by checked_at desc limit 20
 ) t;
 return jsonb_build_object('settings',coalesce(s,jsonb_build_object('client_id',target_client,'version',0,'mark_ids','[]'::jsonb,'enabled',false)),
 'ready',(select enabled from vb_private.watch_config),'latest_source_date',(select max(data_date) from vb_private.watch_files where completed_at is not null),
 'findings',f,'runs',r,'staff',staff,'limit',200);
end $function$;
CREATE OR REPLACE FUNCTION public.vb_watch_save(target_client uuid, expected_version integer, selected_marks uuid[], monitoring boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s vb_private.watch_settings; enabled_before boolean;
begin
 if exists(select 1 from vb_private.legacy_test_mappings where client_id=target_client) then perform vb_private.watch_scope_access(target_client); raise exception 'Refresh Watch and choose a configuration' using errcode='22023'; end if;
 perform vb_private.watch_access(target_client);
 -- Client lock serializes first save and concurrent updates and mark ownership changes.
 perform 1 from public.vb_clients where id=target_client for update;
 insert into vb_private.watch_settings(client_id) values(target_client) on conflict do nothing;
 select * into s from vb_private.watch_settings where client_id=target_client for update;
 if s.version<>expected_version then raise exception 'Watch settings changed' using errcode='40001'; end if;
 if selected_marks is null or cardinality(selected_marks)>10 or cardinality(selected_marks)<>(select count(distinct x) from unnest(selected_marks) x) then raise exception 'Choose up to ten marks' using errcode='22023'; end if;
 if (select count(*) from public.vb_marks where client_id=target_client and id=any(selected_marks) and mark_type='word' and archived_at is null and vb_private.portal_same_service_scope(target_client,'public.vb_marks',jsonb_build_object('id',id),'trademark_watch'))<>cardinality(selected_marks) then raise exception 'Word mark unavailable' using errcode='22023'; end if;
 if monitoring and (cardinality(selected_marks)=0 or not (select enabled from vb_private.watch_config)) then raise exception 'Monitoring is not ready' using errcode='22023'; end if;
 enabled_before:=s.enabled;
 update vb_private.watch_settings set mark_ids=selected_marks,enabled=monitoring,version=version+1,updated_at=now(),
 started_on=case when monitoring then coalesce(started_on,current_date) else started_on end,
 next_run_at=case when not monitoring then null when not enabled_before or selected_marks is distinct from s.mark_ids then now() else next_run_at end
 where client_id=target_client returning * into s;
 return to_jsonb(s);
end $function$;
CREATE OR REPLACE FUNCTION public.vb_watch_run_due()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; ending date; missing date[]; a record; finding_evidence jsonb; why text; count_new integer; processed integer:=0; old vb_private.watch_findings;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Watch worker required' using errcode='42501'; end if;
 if not (select enabled from vb_private.watch_config) then raise exception 'Watch checks disabled'; end if;
 -- Serialize ingestion completion and checks; no matching partly committed files.
 perform pg_advisory_xact_lock(73772131);
 select max(data_date) into ending from vb_private.watch_files where completed_at is not null;
 for s in select q.* from vb_private.watch_due_configurations() q join public.vb_clients c on c.id=q.client_id
 order by q.next_run_at,q.client_id,q.configuration_id nulls first limit 1 for update of c skip locked loop
 -- Re-read eligibility after taking the same client lock used by saves and closure.
 select q.* into s from vb_private.watch_due_configurations() q where q.client_id=s.client_id and q.configuration_id is not distinct from s.configuration_id;
 if not found then continue; end if;
 count_new:=0;
 select array_agg(x::date) into missing from generate_series(coalesce(ending,current_date-1)-6,coalesce(ending,current_date-1),'1 day') x
 where not exists(select 1 from vb_private.watch_files where completed_at is not null and data_date=x::date);
 if ending is null or ending<current_date-2 or missing is not null then
 insert into vb_private.watch_runs(client_id,configuration_id,coverage_from,coverage_to,status,missing_dates,settings_version)
 values(s.client_id,s.configuration_id,coalesce(ending,current_date-1)-6,ending,'incomplete',coalesce(missing,'{}'),s.version);
 -- Retry tomorrow without pretending the weekly check completed.
 perform vb_private.watch_advance_configuration(s.client_id,s.configuration_id,now()+interval '1 day');
 continue;
 end if;
 -- Withdraw outdated approved copies before rematching, including a name that no longer matches.
 for old in select f.* from vb_private.watch_findings f join public.vb_marks m on m.id=f.mark_id
 join vb_private.watch_applications p on p.serial=f.serial where f.client_id=s.client_id and (s.engagement_id is null or vb_private.watch_scope_mark(s.client_id,s.engagement_id,m.id)) and
 (f.evidence->>'name' is distinct from p.name or f.evidence->>'monitored_name' is distinct from m.name
 or f.evidence->>'filing_date' is distinct from p.filing_date::text
 or f.evidence->'goods' is distinct from p.goods or f.evidence->'classes' is distinct from p.classes
 or f.evidence->'owners' is distinct from p.owners or f.evidence->>'status_code' is distinct from p.status_code)
 for update of f loop
 insert into vb_private.watch_review_history(finding_id,previous,action) values(old.id,to_jsonb(old),'source_changed');
 select jsonb_build_object('name',p.name,'monitored_name',m.name,'filing_date',p.filing_date,'goods',p.goods,'classes',p.classes,'owners',p.owners,'status_code',p.status_code,
 'source_file',w.filename,'source_date',w.data_date,'source_revision',w.revision,'checked_at',now()),
 coalesce(vb_private.watch_reason(m.name,p.name),'Name no longer meets the automatic matching rule; re-review required')
 into finding_evidence,why from public.vb_marks m cross join vb_private.watch_applications p join vb_private.watch_files w on w.id=p.file_id
 where m.id=old.mark_id and p.serial=old.serial;
 update vb_private.watch_findings set evidence=finding_evidence,reason=why,version=version+1,publication=null,review_status='unreviewed',updated_at=now() where id=old.id;
 end loop;
 for a in select m.id mark_id,m.name monitored_name,p.* from public.vb_marks m cross join vb_private.watch_applications p
 where m.client_id=s.client_id and (s.engagement_id is null or vb_private.watch_scope_mark(s.client_id,s.engagement_id,m.id)) and m.id=any(s.mark_ids) and m.mark_type='word' and m.archived_at is null
 and p.filing_date>=greatest(s.started_on-30,ending-30) and p.filing_date<=ending
 and p.serial is distinct from m.application_number
 and m.name !~ '[^ -~]' and p.name !~ '[^ -~]'
 and (p.name_key=vb_private.watch_normalize(m.name) or
 (length(vb_private.watch_normalize(m.name)) between 5 and 80 and
 abs(length(p.name_key)-length(vb_private.watch_normalize(m.name)))<=2)) loop
 why:=vb_private.watch_reason(a.monitored_name,a.name); if why is null then continue; end if;
 finding_evidence:=jsonb_build_object('name',a.name,'monitored_name',a.monitored_name,'filing_date',a.filing_date,'goods',a.goods,'classes',a.classes,'owners',a.owners,'status_code',a.status_code,
 'source_file',(select filename from vb_private.watch_files where id=a.file_id),'source_date',(select data_date from vb_private.watch_files where id=a.file_id),
 'source_revision',(select revision from vb_private.watch_files where id=a.file_id),'checked_at',now());
 select * into old from vb_private.watch_findings where client_id=s.client_id and mark_id=a.mark_id and serial=a.serial for update;
 if not found then
 insert into vb_private.watch_findings(client_id,mark_id,serial,evidence,reason) values(s.client_id,a.mark_id,a.serial,finding_evidence,why); count_new:=count_new+1;
 elsif (old.evidence-'checked_at'-'source_file'-'source_date'-'source_revision') is distinct from (finding_evidence-'checked_at'-'source_file'-'source_date'-'source_revision') or old.reason<>why then
 insert into vb_private.watch_review_history(finding_id,previous,action) values(old.id,to_jsonb(old),'source_changed');
 update vb_private.watch_findings set evidence=finding_evidence,reason=why,version=version+1,review_status='unreviewed',publication=null,updated_at=now() where id=old.id;
 end if;
 end loop;
 insert into vb_private.watch_runs(client_id,configuration_id,coverage_from,coverage_to,status,finding_count,settings_version) values(s.client_id,s.configuration_id,ending-6,ending,'completed',count_new,s.version);
 perform vb_private.watch_advance_configuration(s.client_id,s.configuration_id,now()+interval '7 days');
 processed:=processed+1;
 end loop;
 return jsonb_build_object('completed_clients',processed,'pending',exists(select 1 from vb_private.watch_due_configurations()));
end $function$;

commit;
