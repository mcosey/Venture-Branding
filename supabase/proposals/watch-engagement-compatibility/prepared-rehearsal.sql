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

savepoint watch_compatibility_checks;
-- SQL-only synthetic scenarios; include inside a transaction ending in ROLLBACK.
-- Uses existing Test identities; creates no Auth account and invokes no external worker/email.
create temporary table watch_compat_results(label text primary key) on commit drop;
create function pg_temp.wc_assert(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into watch_compat_results values(label);
end $$;
create function pg_temp.wc_denied(command text,expected text,label text) returns void language plpgsql as $$ declare actual text:='00000'; begin
 begin execute command; exception when others then get stacked diagnostics actual=returned_sqlstate; end;
 perform pg_temp.wc_assert(actual=expected,label||' ['||actual||']');
end $$;
create temporary table wc_ids(k text primary key,id uuid not null) on commit drop;
insert into wc_ids values
 ('a',(select id from auth.users where lower(email)='mithrilzeppelin117@gmail.com')),
 ('b',(select id from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com')),
 ('staff',(select user_id from vb_private.staff_members where active order by user_id limit 1)),
 ('outsider',gen_random_uuid()),('client',gen_random_uuid()),('person',gen_random_uuid()),
 ('ea',gen_random_uuid()),('eb',gen_random_uuid()),('ep',gen_random_uuid()),
 ('ma',gen_random_uuid()),('mb',gen_random_uuid()),('mp',gen_random_uuid()),
 ('mark_a',gen_random_uuid()),('mark_b',gen_random_uuid()),('mark_p',gen_random_uuid()),
 ('finding_a',gen_random_uuid()),('finding_b',gen_random_uuid());
create function pg_temp.wc_id(key text) returns uuid language sql stable as $$select id from wc_ids where k=key$$;
create function pg_temp.wc_actor(key text,assurance text default 'aal1') returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.wc_id(key),'role','authenticated','aal',assurance)::text,true)::text::void;
$$;
-- Grant only temporary assertion/context access to the roles exercised below.
grant select on wc_ids to authenticated,service_role,anon;
grant select,insert on watch_compat_results to authenticated,service_role,anon;
do $$ begin execute format('grant usage on schema %I to authenticated,service_role,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema())); end $$;
select pg_temp.wc_assert((select count(distinct id)=3 from wc_ids where k in('a','b','staff')),'Existing distinct Test identities available');
select set_config('request.jwt.claims','{}',true);
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 (pg_temp.wc_id('client'),'ROLLBACK WATCH COMPANY','business','Synthetic',true),
 (pg_temp.wc_id('person'),'ROLLBACK WATCH PERSON','individual','Synthetic',true);
insert into public.vb_engagements(id,client_id,title,status,activated_at) values
 (pg_temp.wc_id('ea'),pg_temp.wc_id('client'),'Synthetic Watch A','active',now()),
 (pg_temp.wc_id('eb'),pg_temp.wc_id('client'),'Synthetic Watch B','active',now()),
 (pg_temp.wc_id('ep'),pg_temp.wc_id('person'),'Synthetic Personal Watch','active',now());
insert into public.vb_matters(id,engagement_id,title) values
 (pg_temp.wc_id('ma'),pg_temp.wc_id('ea'),'Synthetic A'),(pg_temp.wc_id('mb'),pg_temp.wc_id('eb'),'Synthetic B'),(pg_temp.wc_id('mp'),pg_temp.wc_id('ep'),'Synthetic Personal');
insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled) values
 (pg_temp.wc_id('client'),pg_temp.wc_id('ea'),pg_temp.wc_id('ma'),'Fictional Test mapping — October 16, 2026',true),
 (pg_temp.wc_id('person'),pg_temp.wc_id('ep'),pg_temp.wc_id('mp'),'Fictional Test mapping — October 16, 2026',true);
insert into vb_private.engagement_services(engagement_id,service,enabled)
 select e.id,s,true from public.vb_engagements e cross join unnest(array['portfolio','trademark_watch']) s where e.id in(pg_temp.wc_id('ea'),pg_temp.wc_id('eb'),pg_temp.wc_id('ep')) on conflict do nothing;
insert into vb_private.portal_service_bindings(client_id,service,engagement_id,matter_id)
 select m.client_id,s,m.engagement_id,m.matter_id from vb_private.legacy_test_mappings m cross join unnest(array['portfolio','trademark_watch']) s where m.client_id in(pg_temp.wc_id('client'),pg_temp.wc_id('person'));
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values
 (pg_temp.wc_id('ea'),pg_temp.wc_id('a'),'active',now()),(pg_temp.wc_id('eb'),pg_temp.wc_id('b'),'active',now()),(pg_temp.wc_id('ep'),pg_temp.wc_id('a'),'active',now());
insert into public.vb_marks(id,client_id,name,mark_type,status) values
 (pg_temp.wc_id('mark_a'),pg_temp.wc_id('client'),'ROLLBACK NEO ALPHA','word','not_filed'),
 (pg_temp.wc_id('mark_b'),pg_temp.wc_id('client'),'ROLLBACK NEO BETA','word','not_filed'),
 (pg_temp.wc_id('mark_p'),pg_temp.wc_id('person'),'ROLLBACK PERSONAL','word','not_filed');
update vb_private.legacy_test_record_scopes set engagement_id=pg_temp.wc_id('eb'),matter_id=pg_temp.wc_id('mb') where resource='public.vb_marks' and record_key=jsonb_build_object('id',pg_temp.wc_id('mark_b'));
update vb_private.watch_config set enabled=true;
select pg_temp.wc_assert(not has_table_privilege('authenticated','vb_private.watch_scope_settings','select'),'Raw scoped settings denied');
select pg_temp.wc_assert(not has_table_privilege('authenticated','vb_private.watch_scope_settings','update'),'Direct scoped settings edits denied');
select pg_temp.wc_assert(not has_function_privilege('anon','public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)','execute'),'Anonymous scoped save denied');
select pg_temp.wc_assert(not has_function_privilege('service_role','public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)','execute'),'Worker has no client-save RPC grant');
select pg_temp.wc_assert(not has_function_privilege('authenticated','vb_private.watch_scope_active(uuid)','execute'),'Private worker helper denied');
set local role anon;
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Anonymous snapshot execution denied');
reset role;
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations')=1,'Returning B opens empty setup despite old A binding');
select pg_temp.wc_assert(position(pg_temp.wc_id('ea')::text in public.vb_watch_snapshot(pg_temp.wc_id('client'))::text)=0,'B snapshot hides A identity');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('eb'),null,0,array[pg_temp.wc_id('mark_b')],false);
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'version')::integer=1,'B first save creates independent configuration');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],false)','40001','Repeated first save cannot overwrite configuration');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''ea''),null,0,array[pg_temp.wc_id(''mark_a'')],false)','42501','B cannot forge A target');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''person''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],false)','42501','Company access does not imply personal-client access');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_a''),pg_temp.wc_id(''mark_b'')],false)','22023','Mixed-scope selection rejected atomically');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,null,array[pg_temp.wc_id(''mark_b'')],false)','22023','Null version rejected');
select pg_temp.wc_denied('select public.vb_watch_save(pg_temp.wc_id(''client''),0,array[pg_temp.wc_id(''mark_b'')],false)','22023','Old singleton API cannot modify converted client');
select pg_temp.wc_denied('select public.vb_watch_run_due()','42501','Client cannot execute worker RPC');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),pg_temp.wc_id(''outsider''),1,array[pg_temp.wc_id(''mark_b'')],false)','40001','Forged configuration identity rejected');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,1,array[pg_temp.wc_id(''mark_b'')],null)','22023','Null monitoring rejected');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,1,array[pg_temp.wc_id(''mark_b''),pg_temp.wc_id(''mark_b'')],false)','22023','Duplicate selected marks rejected');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),(public.vb_watch_snapshot(pg_temp.wc_id(''client''))->''configurations''->0->''settings''->>''id'')::uuid,1,''{}''::uuid[],true)','22023','Empty selection cannot start monitoring');
select pg_temp.wc_actor('a');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('ea'),null,0,array[pg_temp.wc_id('mark_a')],true);
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'enabled')::boolean,'Original A retains independent monitoring');
select public.vb_watch_save_scoped(pg_temp.wc_id('person'),pg_temp.wc_id('ep'),null,0,array[pg_temp.wc_id('mark_p')],false);
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('person'))->'configurations')=1,'Same login has a separate personal-client configuration');
select pg_temp.wc_actor('outsider');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Unregistered/Member identity cannot open Client Watch');
select pg_temp.wc_denied('select public.vb_watch_save(pg_temp.wc_id(''client''),0,''{}''::uuid[],false)','42501','Member old save API checks access before reporting configuration state');
select pg_temp.wc_actor('staff');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Staff snapshot requires MFA');
select pg_temp.wc_actor('staff','aal2');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations')=2,'MFA staff can review both configurations');
reset role;
select set_config('request.jwt.claims','{}',true);
insert into vb_private.watch_findings(id,client_id,mark_id,serial,evidence,reason,private_note) values
 (pg_temp.wc_id('finding_a'),pg_temp.wc_id('client'),pg_temp.wc_id('mark_a'),'99170101','{"name":"Synthetic A"}','Synthetic A','NEVER EXPOSE A'),
 (pg_temp.wc_id('finding_b'),pg_temp.wc_id('client'),pg_temp.wc_id('mark_b'),'99170102','{"name":"Synthetic B"}','Synthetic B','NEVER EXPOSE B');
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_watch_review(pg_temp.wc_id('client'),pg_temp.wc_id('finding_b'),1,'approved','NEVER EXPOSE B','Approved synthetic B');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=1,'B sees its approved finding only');
select pg_temp.wc_assert(position('NEVER EXPOSE' in public.vb_watch_snapshot(pg_temp.wc_id('client'))::text)=0,'Private review notes excluded');
select pg_temp.wc_actor('staff','aal2');
select public.vb_watch_review(pg_temp.wc_id('client'),pg_temp.wc_id('finding_b'),2,'dismissed','NEVER EXPOSE B','');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=0,'Withdrawal removes approved client copy');
reset role;
select set_config('request.jwt.claims','{}',true);
-- Both grants on one account must not trigger a silent newest-configuration choice.
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values(pg_temp.wc_id('eb'),pg_temp.wc_id('a'),'active',now());
set local role authenticated;
select pg_temp.wc_actor('a');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations')=2,'Both active grants return both authorized configurations');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.engagement_grants set status='revoked' where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('a');
-- A revoked account cannot edit or schedule a retained configuration.
-- Ten marks across active configurations, not ten per configuration.
create temporary table wc_more_marks(id uuid primary key) on commit drop;
insert into wc_more_marks select gen_random_uuid() from generate_series(1,9);
insert into public.vb_marks(id,client_id,name,mark_type,status) select id,pg_temp.wc_id('client'),'ROLLBACK CAP '||row_number() over(),'word','not_filed' from wc_more_marks;
grant select on wc_more_marks to authenticated;
set local role authenticated;
select pg_temp.wc_actor('a');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('ea'),(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'id')::uuid,1,array(select id from wc_more_marks),false);
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'version')::integer=2,'Nine A plus one B preserves client-wide ten-mark cap');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''ea''),(public.vb_watch_snapshot(pg_temp.wc_id(''client''))->''configurations''->0->''settings''->>''id'')::uuid,2,array(select id from wc_more_marks union all select pg_temp.wc_id(''mark_a'')),false)','22023','Additional configuration cannot multiply ten-mark limit');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('ea'),(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'id')::uuid,2,array[pg_temp.wc_id('mark_a')],true);
select pg_temp.wc_actor('b');
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'version')::integer=1,'A updates never overwrite B');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('eb'),(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'id')::uuid,1,array[pg_temp.wc_id('mark_b')],true);
reset role;
select set_config('request.jwt.claims','{}',true);
-- Exercise actual matching SQL, not an external HTTP worker. Isolate due candidates only
-- inside this rollback transaction; do not persist schedule/source fixture changes.
select pg_advisory_xact_lock(73772131);
update vb_private.watch_scope_settings set next_run_at=now()+interval '1 year' where enabled and client_id<>pg_temp.wc_id('client');
update vb_private.watch_settings set next_run_at=now()+interval '1 year' where enabled;
insert into vb_private.watch_files(filename,revision,manifest_revision,data_date,expected,completed_at)
 select 'apc'||to_char(current_date-n,'YYMMDD')||'.zip',repeat('c',64),repeat('d',64),current_date-n,0,now() from generate_series(0,6) n
 on conflict(filename,revision) do update set completed_at=now();
insert into vb_private.watch_applications(serial,name,filing_date,goods,classes,owners,status_code,file_id) values
 ('99170201','ROLLBACK NEO ALPHA',current_date,'[]','[]','[]','630',(select id from vb_private.watch_files where data_date=current_date and revision=repeat('c',64))),
 ('99170202','ROLLBACK NEO BETA',current_date,'[]','[]','[]','630',(select id from vb_private.watch_files where data_date=current_date and revision=repeat('c',64)));
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=1,'Worker processes one bounded scoped configuration');
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=1,'Worker processes second scope independently');
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=0,'Unchanged due state does not run twice');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert((select count(*) from vb_private.watch_runs where client_id=pg_temp.wc_id('client'))=2,'Each scoped configuration has its own run');
select pg_temp.wc_assert((select count(*) from vb_private.watch_findings where client_id=pg_temp.wc_id('client') and serial in('99170201','99170202'))=2,'Matching preserves mark-specific findings');
select pg_temp.wc_denied('update vb_private.watch_scope_settings set engagement_id=pg_temp.wc_id(''eb'') where engagement_id=pg_temp.wc_id(''ea'')','42501','Configuration cannot be rebound');
select pg_temp.wc_denied('update vb_private.watch_runs set configuration_id=(select id from vb_private.watch_scope_settings where engagement_id=pg_temp.wc_id(''ea'')) where configuration_id=(select id from vb_private.watch_scope_settings where engagement_id=pg_temp.wc_id(''eb''))','42501','Run identity cannot be reassigned');

set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'runs')=1,'B history excludes A runs');
reset role;
select set_config('request.jwt.claims','{}',true);
-- Incomplete sources must not be reported as a completed weekly check.
create temporary table wc_source_restore as select id,completed_at from vb_private.watch_files where data_date=current_date-3;
update vb_private.watch_files set completed_at=null where data_date=current_date-3;
update vb_private.watch_scope_settings set next_run_at=now() where engagement_id=pg_temp.wc_id('eb');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=0,'Incomplete source never reports a completed check');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_runs r join vb_private.watch_scope_settings s on s.id=r.configuration_id where s.engagement_id=pg_temp.wc_id('eb') and r.status='incomplete'),'Incomplete attempt belongs to B configuration');
select pg_temp.wc_assert((select count(*) from vb_private.watch_findings where client_id=pg_temp.wc_id('client'))=4,'Incomplete check creates no fabricated findings');
update vb_private.watch_files f set completed_at=r.completed_at from wc_source_restore r where f.id=r.id;
-- A source revision withdraws only the affected scope's published evidence.
insert into wc_ids select 'worker_b',id from vb_private.watch_findings where client_id=pg_temp.wc_id('client') and serial='99170202';
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_watch_review(pg_temp.wc_id('client'),pg_temp.wc_id('worker_b'),1,'approved','NEVER EXPOSE WORKER B','Synthetic match reviewed');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=1,'Reviewed worker match is published to its authorized scope');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.watch_applications set name='ROLLBACK NEO BETA!' where serial='99170202';
update vb_private.watch_scope_settings set next_run_at=now() where engagement_id=pg_temp.wc_id('eb');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=1,'Revised source rechecks only its due scoped configuration');
reset role;
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=0,'Source revision withdraws the prior approved copy');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.watch_scope_settings set next_run_at=now() where engagement_id=pg_temp.wc_id('eb');
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'B is genuinely due before access revocation tests');
update vb_private.portal_accounts set status='suspended' where user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Suspended account cannot authorize a queued worker');
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Suspension blocks snapshot');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],true)','42501','Suspension blocks saving before touching settings');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.portal_accounts set status='active' where user_id=pg_temp.wc_id('b');
update vb_private.engagement_grants set status='revoked' where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Revoked last grant removes B from the queue');
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Revoked grant blocks snapshot');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.engagement_grants set status='invited',accepted_at=null where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Unaccepted grant cannot authorize the worker');
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Unaccepted grant blocks snapshot');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.engagement_grants set status='active',accepted_at=now() where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Restored accepted grant restores only B worker eligibility');
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_close_test_engagement(pg_temp.wc_id('ea'),'active');
select pg_temp.wc_actor('a');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Closed A cannot inherit B configuration');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'enabled')::boolean,'Closing A leaves B monitoring enabled');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'runs')=3,'Closing A preserves B history');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_scope_settings where engagement_id=pg_temp.wc_id('ea') and not enabled and next_run_at is null),'Closing A stops only its new scoped schedule');
select pg_temp.wc_assert((select count(*) from vb_private.watch_runs where client_id=pg_temp.wc_id('client'))=4,'Closed history retained');
select pg_temp.wc_assert((select count(*) from vb_private.watch_findings where client_id=pg_temp.wc_id('client'))=4,'Closed findings retained');
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_close_test_engagement(pg_temp.wc_id('eb'),'active');
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Final fixture closure removes Client Watch access');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],true)','42501','A late save cannot restart closed Watch');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where client_id=pg_temp.wc_id('client')),'Closed configurations cannot enter the worker queue');
select count(*) as passed_checks from watch_compat_results;

do $$ begin if (select count(*) from watch_compat_results)<>66 then raise exception 'Expected 66 Watch checks'; end if; end $$;
rollback to savepoint watch_compatibility_checks;
-- GENERATED adapted regression; hosted execution pending. Original source retained unchanged.
select set_config('request.jwt.claims','{}',true);
-- Prepared, NOT run. Real role/RLS/RPC/worker tests; all fixtures and lifecycle edits roll back.
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if (select count(*) from vb_private.legacy_test_mappings where enforcement_enabled)<>4 then raise exception 'Apply complete cutover before these checks'; end if;
end $$;
create temporary table enforcement_results(label text,passed boolean) on commit drop;
grant insert,select on enforcement_results to authenticated,anon,service_role;
create function pg_temp.expect(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into enforcement_results values(label,true);
end $$;
create function pg_temp.expect_error(command text,code text,label text) returns void language plpgsql as $$
declare actual text:='00000'; begin
 begin execute command; exception when others then get stacked diagnostics actual=returned_sqlstate; end;
 perform pg_temp.expect(actual=code,label||' ['||actual||']');
end $$;
create temporary table enforcement_context as
 select m.*,g.user_id as actor,(select user_id from vb_private.staff_members where active order by user_id limit 1) as staff,
 (select o.user_id from vb_private.portal_test_onboarding o where not exists(select 1 from vb_private.client_memberships old where old.user_id=o.user_id) limit 1) as member,
 (select id from public.vb_marks where client_id=m.client_id order by id limit 1) as mark_a
 from vb_private.legacy_test_mappings m join vb_private.engagement_grants g using(engagement_id)
 where m.client_id='b9100000-0000-0000-0000-000000000001';
grant select on enforcement_context to authenticated,service_role;
select pg_temp.expect((select count(*)=1 and bool_and(actor is not null and staff is not null and member is not null and mark_a is not null) from enforcement_context),'Existing fictional identities and original mark available');
-- Existing onboarding identities may now be Clients. Make only the selected Member
-- fixture grant-free inside this rollback transaction; preserve its private planning data.
update vb_private.engagement_grants set status='revoked' where user_id=(select member from enforcement_context);
-- Ready flags/budget are changed only in this uncommitted transaction to make the
-- reservation-current check meaningful. No dispatcher, HTTP worker or research is invoked.
update vb_private.bcm_scheduler_config set ready=true where singleton;
update vb_private.bcm_ai_config set ready=true,max_runs=greatest(max_runs,(select count(*)::integer+10 from public.vb_bcm_ai_runs)) where singleton;
select pg_temp.expect((select vb_private.bcm_ai_valid(c) from public.vb_bcm_settings c where c.client_id=(select client_id from enforcement_context)),'Existing fictional BCM settings valid for current-reservation test');
-- Isolate this user's lifecycle scenario without affecting any committed grant.
update vb_private.engagement_grants set status='revoked' where user_id=(select actor from enforcement_context) and engagement_id<>(select engagement_id from enforcement_context);
insert into public.vb_engagements(id,client_id,title,status,activated_at)
 select 'f1740000-0000-0000-0000-000000000001',client_id,'ROLLBACK — engagement B','active',now() from enforcement_context;
insert into public.vb_matters(id,engagement_id,title) values('f1750000-0000-0000-0000-000000000001','f1740000-0000-0000-0000-000000000001','ROLLBACK — matter B');
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at)
 select 'f1740000-0000-0000-0000-000000000001',actor,'active',now() from enforcement_context;
insert into vb_private.engagement_services select 'f1740000-0000-0000-0000-000000000001',service,true from vb_private.engagement_services where engagement_id=(select engagement_id from enforcement_context) on conflict(engagement_id,service) do nothing;
insert into public.vb_marks(id,client_id,name,mark_type,status)
 select 'f1760000-0000-0000-0000-000000000001',client_id,'ROLLBACK SCOPE B','word','not_filed' from enforcement_context;
-- Trusted fixture explicitly assigns B; normal record creation cannot self-select a scope.
update vb_private.legacy_test_record_scopes set engagement_id='f1740000-0000-0000-0000-000000000001',matter_id='f1750000-0000-0000-0000-000000000001'
 where resource='public.vb_marks' and record_key=jsonb_build_object('id','f1760000-0000-0000-0000-000000000001'::uuid);
insert into public.vb_evidence(id,client_id,mark_id,uploaded_by,kind,captured_on,notes,filename,mime_type,byte_size,content_sha256,object_path,uploaded_at)
 select 'f1770000-0000-0000-0000-000000000001'::uuid,client_id,mark_a,actor,'photo',current_date,'Synthetic A','scope-a.png','image/png',1,repeat('0',64),'rollback-scope/a.png',now() from enforcement_context
 union all select 'f1770000-0000-0000-0000-000000000002',client_id,'f1760000-0000-0000-0000-000000000001',actor,'photo',current_date,'Synthetic B','scope-b.png','image/png',1,repeat('0',64),'rollback-scope/b.png',now() from enforcement_context;
-- No file uploaded: transient metadata rows only, rolled back below.
insert into storage.objects(bucket_id,name,metadata) values('vb-evidence','rollback-scope/a.png','{"size":1,"mimetype":"image/png"}'),('vb-evidence','rollback-scope/b.png','{"size":1,"mimetype":"image/png"}');
insert into vb_private.maintenance_drafts(id,client_id,mark_id,description,window_start,window_end,deadline,next_step,status,verification_source,created_by,updated_by)
 select 'f1780000-0000-0000-0000-000000000001'::uuid,client_id,mark_a,'Synthetic A',current_date,current_date+10,current_date+10,'Test','Upcoming','Rollback fixture',staff,staff from enforcement_context
 union all select 'f1780000-0000-0000-0000-000000000002',client_id,'f1760000-0000-0000-0000-000000000001','Synthetic B',current_date,current_date+10,current_date+10,'Test','Upcoming','Rollback fixture',staff,staff from enforcement_context;
insert into public.vb_maintenance_publications(id,client_id,mark_id,description,window_start,window_end,deadline,next_step,status,draft_revision,verified_at)
 select 'f1780000-0000-0000-0000-000000000001'::uuid,client_id,mark_a,'Synthetic A',current_date,current_date+10,current_date+10,'Test','Upcoming',1,now() from enforcement_context
 union all select 'f1780000-0000-0000-0000-000000000002',client_id,'f1760000-0000-0000-0000-000000000001','Synthetic B',current_date,current_date+10,current_date+10,'Test','Upcoming',1,now() from enforcement_context;
insert into public.vb_inbox(id,recipient_id,client_id,kind,categories,frequency,period_start,source_items)
 select 'f1790000-0000-0000-0000-000000000001'::uuid,actor,client_id,'digest',array['use_history'],'weekly',now()-interval '1 week',jsonb_build_array(jsonb_build_object('source','use_history','id','f1770000-0000-0000-0000-000000000001')) from enforcement_context
 union all select 'f1790000-0000-0000-0000-000000000002',actor,client_id,'digest',array['use_history'],'weekly',now()-interval '1 week',jsonb_build_array(jsonb_build_object('source','use_history','id','f1770000-0000-0000-0000-000000000001'),jsonb_build_object('source','use_history','id','f1770000-0000-0000-0000-000000000002')) from enforcement_context;
update vb_private.legacy_test_record_scopes set engagement_id='f1740000-0000-0000-0000-000000000001',matter_id='f1750000-0000-0000-0000-000000000001'
 where resource='public.vb_inbox' and record_key=jsonb_build_object('id','f1790000-0000-0000-0000-000000000002'::uuid);
insert into public.vb_bcm_ai_runs(id,client_id,settings_version,requested_by,domain,status)
 select 'f17a0000-0000-0000-0000-000000000001',x.client_id,c.version,x.actor,vb_private.bcm_ai_domain(c.urls[1]),'running' from enforcement_context x join public.vb_bcm_settings c on c.client_id=x.client_id;
-- These settings exist only inside this rolled-back transaction; no external worker is called.
insert into vb_private.watch_settings(client_id,mark_ids,enabled,version,started_on,next_run_at)
 select client_id,array[mark_a],true,1,current_date,now() from enforcement_context
 on conflict(client_id) do update set enabled=true,next_run_at=now();
insert into vb_private.watch_scope_settings(client_id,engagement_id,mark_ids,enabled,version,started_on,next_run_at)
 select client_id,engagement_id,array[mark_a],true,1,current_date,now() from enforcement_context
 on conflict(client_id,engagement_id) do update set mark_ids=excluded.mark_ids,enabled=true,next_run_at=now();
insert into public.vb_bcm_schedules(client_id,enabled,revision,settings_version,authorized_by,started_at,next_run_at)
 select x.client_id,true,1,c.version,x.actor,now(),now() from enforcement_context x join public.vb_bcm_settings c on c.client_id=x.client_id
 on conflict(client_id) do update set enabled=true,settings_version=excluded.settings_version,authorized_by=excluded.authorized_by,next_run_at=now();
insert into public.vb_digest_preferences(user_id,client_id,categories,frequency,delivery,next_due_at)
 select actor,client_id,array['use_history'],'weekly','account',now() from enforcement_context
 on conflict(user_id,client_id) do update set next_due_at=now();
select pg_temp.expect((select engagement_id from vb_private.legacy_test_record_scopes where resource='public.vb_evidence' and record_key=jsonb_build_object('id','f1770000-0000-0000-0000-000000000002'::uuid))='f1740000-0000-0000-0000-000000000001','New evidence inherits its mark matter B');
select pg_temp.expect((select count(*) from vb_private.legacy_test_mappings where enforcement_enabled)=4,'All four reviewed clients use engagement enforcement');
set local role anon;
select pg_temp.expect_error('select * from public.vb_marks','42501','Anonymous cannot read marks');
select pg_temp.expect_error('select public.vb_close_test_engagement(null,''active'')','42501','Anonymous cannot close engagements');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='member','Free Member routing preserved');
select pg_temp.expect((select count(*) from public.vb_clients)=0,'Free Member sees no clients');
select pg_temp.expect((select count(*) from public.vb_marks)=0,'Free Member sees no marks');
select pg_temp.expect((select count(*) from public.vb_inbox)=0,'Free Member sees no client inbox');
select pg_temp.expect((select count(*) from public.vb_member_companies)>0,'Free Member company remains available');
select pg_temp.expect_error('select public.vb_bcm_ai_client_history(''b9100000-0000-0000-0000-000000000001'')','42501','Member direct BCM RPC denied');
select pg_temp.expect_error('select public.vb_watch_snapshot(''b9100000-0000-0000-0000-000000000001'')','42501','Member direct Watch RPC denied');
select pg_temp.expect_error('select * from vb_private.portal_service_bindings','42501','Member cannot inspect service bindings');
select pg_temp.expect_error('select public.vb_close_test_engagement(null,''active'')','42501','Member cannot close engagements');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='client','Accepted engagement routes Client');
select pg_temp.expect((select count(*) from public.vb_evidence where id::text like 'f1770000-%')=2,'Both active engagement evidence rows visible');
select pg_temp.expect((select count(*) from storage.objects where bucket_id='vb-evidence' and name like 'rollback-scope/%')=2,'Both active evidence objects readable');
select pg_temp.expect_error('update vb_private.legacy_test_record_scopes set engagement_id=null','42501','Client cannot reassign record scope');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.expect(public.vb_bcm_ai_run_is_current('f17a0000-0000-0000-0000-000000000001'),'Synthetic reservation is genuinely current before closure');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect_error('select public.vb_close_test_engagement((select engagement_id from enforcement_context),''active'')','42501','Staff closure requires MFA');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect_error('select public.vb_close_test_engagement((select engagement_id from enforcement_context),''closed'')','40001','Stale lifecycle update rejected');
select public.vb_close_test_engagement(engagement_id,'active') from enforcement_context;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='client','Same-client engagement B keeps Client routing');
select pg_temp.expect(not exists(select 1 from public.vb_marks where id=(select mark_a from enforcement_context)),'Closed A mark hidden despite active B');
select pg_temp.expect(exists(select 1 from public.vb_marks where id='f1760000-0000-0000-0000-000000000001'),'B mark remains visible');
select pg_temp.expect(not exists(select 1 from public.vb_evidence where id='f1770000-0000-0000-0000-000000000001'),'Closed A evidence metadata hidden');
select pg_temp.expect(exists(select 1 from public.vb_evidence where id='f1770000-0000-0000-0000-000000000002'),'B evidence remains visible');
select pg_temp.expect(not exists(select 1 from storage.objects where bucket_id='vb-evidence' and name='rollback-scope/a.png'),'Closed A evidence download authorization denied');
select pg_temp.expect(exists(select 1 from storage.objects where bucket_id='vb-evidence' and name='rollback-scope/b.png'),'B evidence download authorization preserved');
select pg_temp.expect(not exists(select 1 from public.vb_maintenance_publications where id='f1780000-0000-0000-0000-000000000001'),'Closed A maintenance hidden');
select pg_temp.expect(exists(select 1 from public.vb_maintenance_publications where id='f1780000-0000-0000-0000-000000000002'),'B maintenance preserved');
select pg_temp.expect(not exists(select 1 from public.vb_inbox where id='f1790000-0000-0000-0000-000000000001'),'Closed A saved message hidden');
select pg_temp.expect_error('select public.vb_open_inbox((select client_id from enforcement_context),''f1790000-0000-0000-0000-000000000001'')','42501','Closed A message direct RPC denied');
select pg_temp.expect(jsonb_array_length(public.vb_open_inbox((select client_id from enforcement_context),'f1790000-0000-0000-0000-000000000002')->'items')=1,'Mixed saved snapshot returns only authorized B content');
select pg_temp.expect_error('select public.vb_bcm_ai_client_history((select client_id from enforcement_context))','42501','Closed A BCM does not inherit B entitlement');
select pg_temp.expect(not exists(select 1 from jsonb_array_elements(public.vb_watch_snapshot((select client_id from enforcement_context))->'configurations') c where c->>'scope_id'=(select engagement_id::text from enforcement_context)),'Active B opens Watch without inheriting closed A configuration');
select pg_temp.expect_error('select public.vb_generate_digest_sample((select client_id from enforcement_context),1)','42501','Closed A digest generation denied');
select pg_temp.expect_error('select public.vb_reserve_evidence(''f1770000-0000-0000-0000-000000000003'',(select client_id from enforcement_context),(select mark_a from enforcement_context),''{}''::jsonb)','42501','Closed A upload reservation denied before validation');
reset role;
select pg_temp.expect((select count(*) from public.vb_engagements e join vb_private.legacy_test_mappings m on m.engagement_id=e.id where e.client_id<>(select client_id from enforcement_context) and e.status='active')=3,'Other three client engagements remain active');
select pg_temp.expect(not exists(select 1 from public.vb_bcm_schedules where client_id=(select client_id from enforcement_context) and enabled),'Closure disables its BCM schedule');
select pg_temp.expect(not exists(select 1 from vb_private.watch_settings where client_id=(select client_id from enforcement_context) and enabled),'Closure disables its retained legacy Watch schedule');
select pg_temp.expect(not exists(select 1 from vb_private.watch_scope_settings where engagement_id=(select engagement_id from enforcement_context) and enabled),'Closure disables its scoped Watch schedule');
select pg_temp.expect(not exists(select 1 from public.vb_digest_preferences where client_id=(select client_id from enforcement_context) and next_due_at <> 'infinity'::timestamptz),'Closure removes its future digest due times');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.expect(not public.vb_bcm_ai_run_is_current('f17a0000-0000-0000-0000-000000000001'),'In-flight AI reservation invalid after closure');
select pg_temp.expect(public.vb_finish_bcm_ai_run('f17a0000-0000-0000-0000-000000000001',null,false)='failed','Late AI completion cannot publish closed A work');
select pg_temp.expect_error('select public.vb_finish_evidence(''f1770000-0000-0000-0000-000000000001'',(select actor from enforcement_context))','42501','Late upload completion denied after closure');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(exists(select 1 from public.vb_marks where id=(select mark_a from enforcement_context)),'MFA attorney retains closed A mark');
select pg_temp.expect(exists(select 1 from public.vb_evidence where id='f1770000-0000-0000-0000-000000000001'),'MFA attorney retains closed A evidence');
reset role;
update vb_private.portal_accounts set status='suspended' where user_id=(select actor from enforcement_context);
select pg_temp.expect((select status from public.vb_engagements where id='f1740000-0000-0000-0000-000000000001')='active','Suspension does not terminate engagement B');
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='denied','Suspension blocks portal entry');
select pg_temp.expect(not exists(select 1 from public.vb_marks where id='f1760000-0000-0000-0000-000000000001'),'Suspension blocks direct B mark read');
reset role;
update vb_private.portal_accounts set status='active' where user_id=(select actor from enforcement_context);
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true) from enforcement_context;
set local role authenticated;
select public.vb_close_test_engagement('f1740000-0000-0000-0000-000000000001','active');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_account_access()='alumni','Final engagement closure produces Alumni');
select pg_temp.expect(public.vb_portal_entry()='member','Alumni routes to Member experience');
select pg_temp.expect(public.vb_session_role()='denied','Alumni cannot reuse old Client role');
select pg_temp.expect((select count(*) from public.vb_marks)=0,'Legacy membership cannot expose marks after final closure');
reset role;
select count(*) as passed_checks,bool_and(passed) as all_passed from enforcement_results;

do $$ begin if (select count(*) from enforcement_results)<>55 or not (select bool_and(passed) from enforcement_results) then raise exception 'Expected 55 passing enforcement checks'; end if; end $$;
select 66 as watch_checks, count(*) as enforcement_checks, bool_and(passed) as all_passed from enforcement_results;

rollback;
