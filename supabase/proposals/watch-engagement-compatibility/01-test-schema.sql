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
