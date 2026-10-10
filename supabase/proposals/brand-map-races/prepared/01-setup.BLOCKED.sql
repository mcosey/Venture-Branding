-- PREPARED, NOT EXECUTED. Exact project imvkhicfmidzbzsbhkzs; verify dashboard URL independently.
-- No account login, invitation or production work. Original local guards unchanged.
begin isolation level read committed;
set local lock_timeout='20s';
set local statement_timeout='25s';
set local idle_in_transaction_session_timeout='25s';
set local application_name='bm-race-813aabca-setup';
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_target$ begin
 if false is not true then raise exception 'Prepared copy blocked: execution approval is required.'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_TEST_CLUSTER_PIN__' then raise exception 'Unexpected Test target/executor'; end if;
end $bm_target$;
set local lock_timeout='3s';
set local statement_timeout='30s';
create function pg_temp.brand_map_preservation_snapshot() returns jsonb
language plpgsql set search_path='' as $bm_snapshot$
declare result jsonb:='{}'::jsonb; relation record; row_count bigint; row_digest text; bytes bigint; filter_sql text; row_sql text; ignored text[];
begin
 select coalesce(array_agg(v),'{}'::text[]) into ignored from jsonb_array_elements_text(coalesce(nullif(current_setting('vb_brand_map.snapshot_ignored_dates',true),''),'[]')::jsonb) v;
 if not ignored <@ array['filing_date','registration_date','uspto_status_date']::text[] then raise exception 'Unowned preservation normalization'; end if;
 for relation in select n.nspname,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users'))
 and c.relname not in ('brand_map_race_runs','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links') order by n.nspname,c.relname loop
  filter_sql:=format('not (coalesce(to_jsonb(t)->>''client_id''=%L,false) or (%L=''public'' and %L=''vb_clients'' and to_jsonb(t)->>''id''=%L) or (%L=''auth'' and %L=''users'' and to_jsonb(t)->>''id'' in (%L,%L)) or (%L=''vb_private'' and (coalesce(to_jsonb(t)->>''user_id'' in (%L,%L),false) or coalesce(to_jsonb(t)->>''actor_id'' in (%L,%L),false))))',
   '2ba5b51e-62d8-48db-915f-b273e84736bb',relation.nspname,relation.relname,'2ba5b51e-62d8-48db-915f-b273e84736bb',relation.nspname,relation.relname,'7da00277-4ee2-4719-bfa4-43e77f4fb6ed','eb1493cf-c9fe-4956-a57e-0ce120c55c02',relation.nspname,'7da00277-4ee2-4719-bfa4-43e77f4fb6ed','eb1493cf-c9fe-4956-a57e-0ce120c55c02','7da00277-4ee2-4719-bfa4-43e77f4fb6ed','eb1493cf-c9fe-4956-a57e-0ce120c55c02');
  row_sql:=case when relation.nspname='public' and relation.relname='vb_marks' then format('(to_jsonb(t)-%L::text[])',ignored) else 'to_jsonb(t)' end;
  execute format('select count(*),coalesce(sum(octet_length(%s::text)),0) from %I.%I t where %s',row_sql,relation.nspname,relation.relname,filter_sql) into row_count,bytes;
  if row_count>10000 or bytes>16777216 then raise exception 'Preservation snapshot exceeds reviewed test limits'; end if;
  execute format('select encode(sha256(convert_to(coalesce(string_agg(%s::text,E''\n'' order by %s::text),''''),''UTF8'')),''hex'') from %I.%I t where %s',row_sql,row_sql,relation.nspname,relation.relname,filter_sql) into row_digest;
  result:=result||jsonb_build_object(relation.nspname||'.'||relation.relname,jsonb_build_object('count',row_count,'digest',row_digest));
 end loop;
 return result;
end $bm_snapshot$;
revoke all on function pg_temp.brand_map_preservation_snapshot() from public,anon,authenticated,service_role;

do $bm_setup_guard$ declare pre jsonb; begin
 if (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata) is distinct from '__FRESH_TEST_SCHEMA_PIN__' then raise exception 'Test schema changed since preflight'; end if;
 pre:=(select jsonb_build_object(
  'operator_expected_project', 'imvkhicfmidzbzsbhkzs',
  'identity_is_cluster_wide_not_a_project_ref', true,
  'database_identity', (select system_identifier::text from pg_control_system()),
  'database_name', current_database(),
  'executor_role', current_user,
  'server_version', current_setting('server_version_num'),
  'schema_digest', (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata),
  'missing_columns', (select coalesce(jsonb_agg(table_name||'.'||column_name),'[]'::jsonb) from (values ('auth.users','id'),
('auth.users','email'),
('public.vb_clients','id'),
('public.vb_clients','name'),
('public.vb_clients','client_type'),
('public.vb_clients','contact_name'),
('public.vb_clients','portal_enabled'),
('public.vb_clients','archived_at'),
('public.vb_clients','created_at'),
('public.vb_clients','updated_at'),
('public.vb_marks','id'),
('public.vb_marks','client_id'),
('public.vb_marks','name'),
('public.vb_marks','mark_type'),
('public.vb_marks','status'),
('public.vb_marks','uspto_status_text'),
('public.vb_marks','application_number'),
('public.vb_marks','registration_number'),
('public.vb_marks','record_owner'),
('public.vb_marks','source'),
('public.vb_marks','source_checked_at'),
('public.vb_marks','filing_date'),
('public.vb_marks','registration_date'),
('public.vb_marks','uspto_status_date'),
('public.vb_marks','created_at'),
('public.vb_marks','updated_at'),
('public.vb_marks','archived_at'),
('public.vb_service_preferences','client_id'),
('public.vb_service_preferences','service'),
('public.vb_bcm_settings','client_id'),
('public.vb_bcm_scans','client_id'),
('vb_private.staff_members','user_id'),
('vb_private.staff_members','active'),
('vb_private.client_memberships','client_id'),
('vb_private.client_memberships','user_id'),
('vb_private.client_memberships','active'),
('vb_private.audit_events','id'),
('vb_private.audit_events','client_id'),
('vb_private.audit_events','record_id'),
('vb_private.audit_events','table_name'),
('vb_private.audit_events','actor_id'),
('vb_private.audit_events','previous_data'),
('vb_private.audit_events','current_data')) required(table_name,column_name) where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.table_name) and attname=required.column_name and attnum>0 and not attisdropped)),
  'missing_functions', (select coalesce(jsonb_agg(signature),'[]'::jsonb) from (values ('auth.uid()'),('auth.jwt()'),('vb_private.is_staff()'),('vb_private.is_client_member(uuid)'),('vb_private.audit_record()')) required(signature) where to_regprocedure(signature) is null),
  'brand_map_collisions', (select coalesce(jsonb_agg(name),'[]'::jsonb) from (
  select n.nspname||'.'||c.relname name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private') and (c.relname like 'vb_brand_%' or c.relname='vb_marks_id_client_unique')
  union all select n.nspname||'.'||p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='vb_private' and p.proname like 'brand_map_%') or (n.nspname='public' and p.proname in ('vb_read_brand_map','vb_save_brand_asset','vb_set_brand_parent','vb_confirm_brand_relationship','vb_review_brand_legal_link'))
  union all select 'constraint:'||conname from pg_constraint where conrelid=to_regclass('public.vb_marks') and conname='vb_marks_id_client_unique'
) collisions),
  'pgtap_supported', exists(select 1 from pg_available_extensions where name='pgtap'),
  'extensions_schema_exists', to_regnamespace('extensions') is not null,
  'prerequisite_state', (select jsonb_build_object('missing_columns',(select coalesce(jsonb_agg(table_name||'.'||column_name),'[]'::jsonb) from (values ('auth.users','id'),
('auth.users','email'),
('public.vb_clients','id'),
('public.vb_clients','name'),
('public.vb_clients','client_type'),
('public.vb_clients','contact_name'),
('public.vb_clients','portal_enabled'),
('public.vb_clients','archived_at'),
('public.vb_clients','created_at'),
('public.vb_clients','updated_at'),
('public.vb_marks','id'),
('public.vb_marks','client_id'),
('public.vb_marks','name'),
('public.vb_marks','mark_type'),
('public.vb_marks','status'),
('public.vb_marks','uspto_status_text'),
('public.vb_marks','application_number'),
('public.vb_marks','registration_number'),
('public.vb_marks','record_owner'),
('public.vb_marks','source'),
('public.vb_marks','source_checked_at'),
('public.vb_marks','filing_date'),
('public.vb_marks','registration_date'),
('public.vb_marks','uspto_status_date'),
('public.vb_marks','created_at'),
('public.vb_marks','updated_at'),
('public.vb_marks','archived_at'),
('public.vb_service_preferences','client_id'),
('public.vb_service_preferences','service'),
('public.vb_bcm_settings','client_id'),
('public.vb_bcm_scans','client_id'),
('vb_private.staff_members','user_id'),
('vb_private.staff_members','active'),
('vb_private.client_memberships','client_id'),
('vb_private.client_memberships','user_id'),
('vb_private.client_memberships','active'),
('vb_private.audit_events','id'),
('vb_private.audit_events','client_id'),
('vb_private.audit_events','record_id'),
('vb_private.audit_events','table_name'),
('vb_private.audit_events','actor_id'),
('vb_private.audit_events','previous_data'),
('vb_private.audit_events','current_data')) required(table_name,column_name) where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.table_name) and attname=required.column_name and attnum>0 and not attisdropped)),'extensions',(select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e))),
  'pgtap_available', exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgtap' and n.nspname='extensions'),
  'client_and_mark_rls', coalesce((select bool_and(relrowsecurity) and count(*)=2 from pg_class where oid in (to_regclass('public.vb_clients'),to_regclass('public.vb_marks'))),false)
));
 if not (pre->'missing_columns' <@ '["public.vb_marks.filing_date","public.vb_marks.registration_date","public.vb_marks.uspto_status_date"]'::jsonb) or pre->'missing_functions'<>'[]'::jsonb or pre->'brand_map_collisions'<>'[]'::jsonb or pre->>'client_and_mark_rls'<>'true' or to_regclass('vb_private.brand_map_race_runs') is not null then raise exception 'Missing dependencies or preexisting draft objects'; end if;
 if to_regprocedure('public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)') is null then raise exception 'Existing compatible USPTO save path required'; end if;
 if exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname in ('filing_date','registration_date','uspto_status_date') and not attisdropped and atttypid<>'date'::regtype) then raise exception 'Unexpected date column type'; end if;
 if exists(select 1 from auth.users where id in ('7da00277-4ee2-4719-bfa4-43e77f4fb6ed'::uuid,'eb1493cf-c9fe-4956-a57e-0ce120c55c02'::uuid) or email in ('bm-race-813aabca-15c9-45f8-8f3b-06a582182bc4-client@example.invalid','bm-race-813aabca-15c9-45f8-8f3b-06a582182bc4-staff@example.invalid')) or exists(select 1 from public.vb_clients where id='2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid) or exists(select 1 from public.vb_marks where id in ('e618603b-0870-444b-b05c-002ec03d3497'::uuid,'a9ae4510-128c-4782-b5b7-e7b8b2fcea6c'::uuid,'c02015f4-14e3-4f15-9292-09774decc262'::uuid,'fb750360-1320-4bea-8e2a-f323f2176593'::uuid,'2b2bb3c7-56ae-4b22-8696-254abdc9bc81'::uuid,'c491758e-0988-491a-bf15-0e9d497ce306'::uuid)) then raise exception 'Fixture identity collision'; end if;
 perform set_config('vb_brand_map.baseline_schema',(select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata),true);
 perform set_config('vb_brand_map.snapshot_ignored_dates','[]',true);
 perform set_config('vb_brand_map.baseline_rows',pg_temp.brand_map_preservation_snapshot()::text,true);
 perform set_config('vb_brand_map.baseline_extensions',(select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e)::text,true);
 perform set_config('vb_brand_map.added_dates',(select coalesce(jsonb_agg(name),'[]'::jsonb)::text from unnest(array['filing_date','registration_date','uspto_status_date']) name where not exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname=name and not attisdropped)),true);
end $bm_setup_guard$;
do $bm_dates$ declare col text; begin
 for col in select jsonb_array_elements_text(current_setting('vb_brand_map.added_dates')::jsonb) loop execute format('alter table public.vb_marks add column %I date',col); end loop;
end $bm_dates$;
alter table public.vb_marks add constraint vb_marks_id_client_unique unique (id, client_id);
create table public.vb_brand_assets (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  name text not null check (name = btrim(name) and length(name) between 1 and 200),
  kind text not null check (kind in ('master_brand','product','feature','service','sub_brand','logo','slogan','website','not_specified')),
  description text not null default '' check (length(description) <= 2000),
  business_use text not null check (business_use in ('planned','in_use','inactive','not_specified')),
  version bigint not null default 1 check (version > 0),
  identity_revision bigint not null default 1 check (identity_revision > 0),
  source_kind text not null check (source_kind in ('manual_client','manual_staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);
create table public.vb_brand_relationships (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  child_asset_id uuid not null unique,
  parent_asset_id uuid,
  state text check (state in ('proposed','confirmed')),
  version bigint not null default 1 check (version > 0),
  confirmed_by uuid,
  confirmed_by_role text check (confirmed_by_role in ('client','staff')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (child_asset_id, client_id) references public.vb_brand_assets(id, client_id),
  foreign key (parent_asset_id, client_id) references public.vb_brand_assets(id, client_id),
  check (parent_asset_id is distinct from child_asset_id),
  check ((parent_asset_id is null and state is null) or
         (parent_asset_id is not null and state is not null)),
  check ((state = 'confirmed' and confirmed_by is not null and confirmed_by_role is not null and confirmed_at is not null) or
         (state is distinct from 'confirmed' and confirmed_by is null and confirmed_by_role is null and confirmed_at is null))
);
create index vb_brand_relationship_parent_idx on public.vb_brand_relationships(client_id, parent_asset_id);
create table public.vb_brand_legal_links (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  asset_id uuid not null unique,
  mark_id uuid,
  version bigint not null default 1 check (version > 0),
  reviewed_asset_identity_revision bigint,
  reviewed_mark_fingerprint text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (asset_id, client_id) references public.vb_brand_assets(id, client_id),
  foreign key (mark_id, client_id) references public.vb_marks(id, client_id),
  check ((mark_id is null and reviewed_asset_identity_revision is null and reviewed_mark_fingerprint is null and reviewed_by is null and reviewed_at is null) or
         (mark_id is not null and reviewed_asset_identity_revision is not null and reviewed_asset_identity_revision > 0 and reviewed_mark_fingerprint is not null and reviewed_by is not null and reviewed_at is not null))
);
create index vb_brand_link_mark_idx on public.vb_brand_legal_links(client_id, mark_id);
-- Server-owned provenance, slot identity and ownership cannot be reassigned.
create function vb_private.brand_map_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.client_id is distinct from old.client_id or new.created_at is distinct from old.created_at then
    raise exception 'Brand Map record identity is immutable' using errcode = '23514';
  end if;
  if tg_table_name = 'vb_brand_assets' then
    if new.source_kind is distinct from old.source_kind then
      raise exception 'Brand Map source is immutable' using errcode = '23514';
    end if;
    new.identity_revision := old.identity_revision + case
      when row(new.name,new.kind,btrim(new.description)) is distinct from row(old.name,old.kind,btrim(old.description)) then 1 else 0 end;
  elsif tg_table_name = 'vb_brand_relationships' then
    if new.child_asset_id is distinct from old.child_asset_id then
      raise exception 'Brand Map slot is immutable' using errcode = '23514';
    end if;
  elsif new.asset_id is distinct from old.asset_id then
    raise exception 'Brand Map slot is immutable' using errcode = '23514';
  end if;
  new.version := old.version + 1;
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;
-- Every asset has an existing relationship and legal slot from its creation.
-- Locking these rows detects stale snapshots even at REPEATABLE READ.
create function vb_private.brand_map_initialize_slots() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.vb_brand_relationships(client_id,child_asset_id) values(new.client_id,new.id);
  insert into public.vb_brand_legal_links(client_id,asset_id) values(new.client_id,new.id);
  return new;
end;
$$;
create trigger vb_brand_asset_touch before update on public.vb_brand_assets for each row execute function vb_private.brand_map_touch();
create trigger vb_brand_relationship_touch before update on public.vb_brand_relationships for each row execute function vb_private.brand_map_touch();
create trigger vb_brand_link_touch before update on public.vb_brand_legal_links for each row execute function vb_private.brand_map_touch();
create trigger vb_brand_asset_slots after insert on public.vb_brand_assets for each row execute function vb_private.brand_map_initialize_slots();
create trigger vb_brand_asset_audit after insert or update on public.vb_brand_assets for each row execute function vb_private.audit_record();
create trigger vb_brand_relationship_audit after insert or update on public.vb_brand_relationships for each row execute function vb_private.audit_record();
create trigger vb_brand_link_audit after insert or update on public.vb_brand_legal_links for each row execute function vb_private.audit_record();
create function vb_private.brand_map_can_read(target_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.vb_clients c where c.id = target_client and c.archived_at is null)
    and (vb_private.is_staff() or vb_private.is_client_member(target_client));
$$;
-- All writes acquire locks in this order: client, caller authorization, asset,
-- current slot, ancestor slots or mark. Hold permission locks until commit.
create function vb_private.brand_map_lock_write(target_client uuid, staff_only boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); portal_is_enabled boolean; active_role boolean;
begin
  if caller is null then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select c.portal_enabled into portal_is_enabled from public.vb_clients c
    where c.id = target_client and c.archived_at is null for update;
  if not found then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select s.active into active_role from vb_private.staff_members s where s.user_id = caller for share;
  if found then
    if active_role and vb_private.is_staff() then return 'staff'; end if;
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  if staff_only or not portal_is_enabled then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select m.active into active_role from vb_private.client_memberships m
    where m.client_id = target_client and m.user_id = caller for share;
  if not found or not active_role or not vb_private.is_client_member(target_client) then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  return 'client';
end;
$$;
create function vb_private.brand_map_mark_fingerprint(mark_row public.vb_marks) returns text
language sql immutable set search_path = '' as $$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array((mark_row).client_id,(mark_row).name,(mark_row).mark_type,(mark_row).record_owner)::text, 'UTF8')), 'hex');
$$;
create function public.vb_read_brand_map(target_client uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not vb_private.brand_map_can_read(target_client) then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'client_id', target_client,
    'assets', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',a.id,'client_id',a.client_id,'name',a.name,'kind',a.kind,'description',a.description,
      'business_use',a.business_use,'version',a.version,'identity_revision',a.identity_revision,
      'source_kind',a.source_kind,'created_at',a.created_at,'updated_at',a.updated_at) order by a.created_at,a.id)
      from public.vb_brand_assets a where a.client_id = target_client), '[]'::jsonb),
    'relationships', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',r.id,'child_asset_id',r.child_asset_id,'parent_asset_id',r.parent_asset_id,
      'state',r.state,'version',r.version,'confirmed_by_role',r.confirmed_by_role,'confirmed_at',r.confirmed_at)
      order by r.child_asset_id) from public.vb_brand_relationships r where r.client_id = target_client), '[]'::jsonb),
    'legal_links', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',l.id,'asset_id',l.asset_id,'mark_id',l.mark_id,'version',l.version,'reviewed_at',l.reviewed_at,
      'reviewed_by_role',case when l.mark_id is not null then 'staff' else null end,
      'review_state',case when l.mark_id is null then 'not_linked'
        when m.id is null or m.archived_at is not null or l.reviewed_asset_identity_revision <> a.identity_revision
          or l.reviewed_mark_fingerprint is distinct from vb_private.brand_map_mark_fingerprint(m)
          then 'needs_attorney_review' else 'current' end,
      'linked_record_available',m.id is not null and m.archived_at is null,
      'linked_record_status',case when m.archived_at is null then m.status else null end)
      order by l.asset_id) from public.vb_brand_legal_links l
      join public.vb_brand_assets a on a.id = l.asset_id and a.client_id = l.client_id
      left join public.vb_marks m on m.id = l.mark_id and m.client_id = l.client_id
      where l.client_id = target_client), '[]'::jsonb),
    'marks', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',m.id,'client_id',m.client_id,'name',m.name,'mark_type',m.mark_type,'status',m.status,
      'uspto_status_text',m.uspto_status_text,'application_number',m.application_number,
      'registration_number',m.registration_number,'record_owner',m.record_owner,'source',m.source,
      'source_checked_at',m.source_checked_at,'filing_date',m.filing_date,
      'registration_date',m.registration_date,'uspto_status_date',m.uspto_status_date,'updated_at',m.updated_at)
      order by m.created_at,m.id) from public.vb_marks m where m.client_id = target_client and m.archived_at is null), '[]'::jsonb),
    'counts', pg_catalog.jsonb_build_object(
      'assets',(select count(*) from public.vb_brand_assets a where a.client_id = target_client),
      'legal_records',(select count(*) from public.vb_marks m where m.client_id = target_client and m.archived_at is null),
      'linked_legal_records',(select count(distinct l.mark_id) from public.vb_brand_legal_links l
        join public.vb_marks m on m.id = l.mark_id and m.client_id = l.client_id
        where l.client_id = target_client and m.archived_at is null))) into result;
  return result;
end;
$$;
-- Complete business form, not a permissive arbitrary-property patch.
-- Creation uses target_asset NULL and expected_version NULL.
create function public.vb_save_brand_asset(target_client uuid, target_asset uuid, expected_version bigint, details jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor_role text; saved public.vb_brand_assets; old_asset public.vb_brand_assets;
begin
  actor_role := vb_private.brand_map_lock_write(target_client);
  if details is null or pg_catalog.jsonb_typeof(details) is distinct from 'object' then
    raise exception 'Invalid Brand Map business fields.' using errcode = '22023';
  end if;
  if exists(select 1 from pg_catalog.jsonb_object_keys(details) k
      where k not in ('name','kind','description','business_use'))
    or not (details ?& array['name','kind','description','business_use'])
    or exists(select 1 from pg_catalog.jsonb_each(details) p where pg_catalog.jsonb_typeof(p.value) <> 'string')
    or length(btrim(details->>'name')) not between 1 and 200
    or length(details->>'description') > 2000
    or details->>'kind' not in ('master_brand','product','feature','service','sub_brand','logo','slogan','website','not_specified')
    or details->>'business_use' not in ('planned','in_use','inactive','not_specified') then
    raise exception 'Invalid Brand Map business fields.' using errcode = '22023';
  end if;
  if target_asset is null then
    if expected_version is not null then raise exception 'Invalid Brand Map version.' using errcode = '22023'; end if;
    insert into public.vb_brand_assets(client_id,name,kind,description,business_use,source_kind)
      values(target_client,btrim(details->>'name'),details->>'kind',btrim(details->>'description'),details->>'business_use','manual_' || actor_role)
      returning * into saved;
  else
    select * into old_asset from public.vb_brand_assets a where a.id = target_asset and a.client_id = target_client for update;
    if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
    if expected_version is null or old_asset.version <> expected_version then
      raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
    end if;
    update public.vb_brand_assets set name=btrim(details->>'name'),kind=details->>'kind',
      description=btrim(details->>'description'),business_use=details->>'business_use'
      where id=target_asset and client_id=target_client returning * into saved;
  end if;
  return pg_catalog.jsonb_build_object('id',saved.id,'version',saved.version,'identity_revision',saved.identity_revision);
end;
$$;
create function public.vb_set_brand_parent(target_client uuid, target_child uuid, target_parent uuid, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare slot public.vb_brand_relationships; cursor_id uuid := target_parent; next_id uuid; visited uuid[] := array[]::uuid[];
begin
  perform vb_private.brand_map_lock_write(target_client);
  perform 1 from public.vb_brand_assets a where a.id = target_child and a.client_id = target_client for update;
  if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  if target_parent is not null then
    perform 1 from public.vb_brand_assets a where a.id = target_parent and a.client_id = target_client for update;
    if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  end if;
  select * into slot from public.vb_brand_relationships r where r.child_asset_id=target_child and r.client_id=target_client for update;
  if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
  if expected_version is null or slot.version <> expected_version then
    raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
  end if;
  while cursor_id is not null loop
    if cursor_id = target_child or cursor_id = any(visited) then
      raise exception 'A Brand Map relationship cannot form a cycle.' using errcode = '22023';
    end if;
    visited := pg_catalog.array_append(visited,cursor_id);
    select r.parent_asset_id into next_id from public.vb_brand_relationships r
      where r.child_asset_id=cursor_id and r.client_id=target_client for update;
    if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
    cursor_id := next_id;
  end loop;
  update public.vb_brand_relationships set parent_asset_id=target_parent,
    state=case when target_parent is null then null else 'proposed' end,
    confirmed_by=null,confirmed_by_role=null,confirmed_at=null
    where id=slot.id returning * into slot;
  return pg_catalog.jsonb_build_object('id',slot.id,'version',slot.version,'state',slot.state);
end;
$$;
create function public.vb_confirm_brand_relationship(target_client uuid, target_child uuid, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor_role text; slot public.vb_brand_relationships;
begin
  actor_role := vb_private.brand_map_lock_write(target_client);
  perform 1 from public.vb_brand_assets a where a.id=target_child and a.client_id=target_client for update;
  if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  select * into slot from public.vb_brand_relationships r where r.child_asset_id=target_child and r.client_id=target_client for update;
  if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
  if expected_version is null or slot.version <> expected_version then
    raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
  end if;
  if slot.parent_asset_id is null then raise exception 'Choose a parent before confirming.' using errcode = '22023'; end if;
  update public.vb_brand_relationships set state='confirmed',confirmed_by=auth.uid(),
    confirmed_by_role=actor_role,confirmed_at=pg_catalog.clock_timestamp() where id=slot.id returning * into slot;
  return pg_catalog.jsonb_build_object('id',slot.id,'version',slot.version,'state',slot.state);
end;
$$;
-- expected_asset_identity and expected_mark_identity bind staff review to what
-- the staff member actually viewed. NULL mark + NULL fingerprint clears a link.
-- Fingerprint input is the four permitted identity fields, not a browser hash.
create function public.vb_review_brand_legal_link(target_client uuid, target_asset uuid, target_mark uuid,
  expected_version bigint, expected_asset_identity bigint, expected_mark_identity jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare asset public.vb_brand_assets; mark_row public.vb_marks; slot public.vb_brand_legal_links; identity_fields jsonb;
begin
  perform vb_private.brand_map_lock_write(target_client,true);
  select * into asset from public.vb_brand_assets a where a.id=target_asset and a.client_id=target_client for update;
  if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  select * into slot from public.vb_brand_legal_links l where l.asset_id=target_asset and l.client_id=target_client for update;
  if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
  if expected_version is null or slot.version <> expected_version or expected_asset_identity is null or asset.identity_revision <> expected_asset_identity then
    raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
  end if;
  if target_mark is not null then
    select * into mark_row from public.vb_marks m where m.id=target_mark and m.client_id=target_client and m.archived_at is null for update;
    if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
    identity_fields := pg_catalog.jsonb_build_object('client_id',mark_row.client_id,'name',mark_row.name,'mark_type',mark_row.mark_type,'record_owner',mark_row.record_owner);
    if expected_mark_identity is null or expected_mark_identity is distinct from identity_fields then
      raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
    end if;
  elsif expected_mark_identity is not null then
    raise exception 'Invalid Brand Map legal-link fields.' using errcode = '22023';
  end if;
  update public.vb_brand_legal_links set mark_id=target_mark,
    reviewed_asset_identity_revision=case when target_mark is not null then asset.identity_revision end,
    reviewed_mark_fingerprint=case when target_mark is not null then vb_private.brand_map_mark_fingerprint(mark_row) end,
    reviewed_by=case when target_mark is not null then auth.uid() end,
    reviewed_at=case when target_mark is not null then pg_catalog.clock_timestamp() end
    where id=slot.id returning * into slot;
  return pg_catalog.jsonb_build_object('id',slot.id,'version',slot.version);
end;
$$;
alter table public.vb_brand_assets enable row level security;
alter table public.vb_brand_relationships enable row level security;
alter table public.vb_brand_legal_links enable row level security;
-- Defense in depth if SELECT grants are mistakenly added later. Raw SELECT is
-- currently denied; these policies do not authorize exposing actor columns.
create policy brand_assets_workspace_read on public.vb_brand_assets for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));
create policy brand_relationship_workspace_read on public.vb_brand_relationships for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));
create policy brand_link_workspace_read on public.vb_brand_legal_links for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));
revoke all on public.vb_brand_assets, public.vb_brand_relationships, public.vb_brand_legal_links from public, anon, authenticated, service_role;
revoke all on function vb_private.brand_map_touch(), vb_private.brand_map_initialize_slots(),
  vb_private.brand_map_can_read(uuid), vb_private.brand_map_lock_write(uuid,boolean),
  vb_private.brand_map_mark_fingerprint(public.vb_marks) from public, anon, authenticated, service_role;
revoke all on function public.vb_read_brand_map(uuid), public.vb_save_brand_asset(uuid,uuid,bigint,jsonb),
  public.vb_set_brand_parent(uuid,uuid,uuid,bigint), public.vb_confirm_brand_relationship(uuid,uuid,bigint),
  public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.vb_read_brand_map(uuid), public.vb_save_brand_asset(uuid,uuid,bigint,jsonb),
  public.vb_set_brand_parent(uuid,uuid,uuid,bigint), public.vb_confirm_brand_relationship(uuid,uuid,bigint),
  public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb) to authenticated;
create table vb_private.brand_map_race_runs(run_id uuid primary key,payload jsonb not null);
alter table vb_private.brand_map_race_runs enable row level security;
revoke all on vb_private.brand_map_race_runs from public,anon,authenticated,service_role;
insert into auth.users(id,email) values ('7da00277-4ee2-4719-bfa4-43e77f4fb6ed'::uuid,'bm-race-813aabca-15c9-45f8-8f3b-06a582182bc4-client@example.invalid'),('eb1493cf-c9fe-4956-a57e-0ce120c55c02'::uuid,'bm-race-813aabca-15c9-45f8-8f3b-06a582182bc4-staff@example.invalid');
insert into vb_private.staff_members(user_id) values('eb1493cf-c9fe-4956-a57e-0ce120c55c02'::uuid);
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values('2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Brand Map race 813aabca-15c9-45f8-8f3b-06a582182bc4','business','Synthetic concurrency fixture',true);
insert into vb_private.client_memberships(client_id,user_id) values('2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'7da00277-4ee2-4719-bfa4-43e77f4fb6ed'::uuid);
insert into public.vb_brand_assets(id,client_id,name,kind,business_use,source_kind) values
('fd142b5a-a3f6-4101-893e-05800cce7fc1'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 0','product','in_use','manual_client'),
('18e6f562-5e21-4a31-800c-f85cc497b3b9'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 1','product','in_use','manual_client'),
('2a59ad79-aa74-491e-ac99-7ac76d283af6'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 2','product','in_use','manual_client'),
('ca9f9ade-0e14-4a07-9f57-6438bb7ad404'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 3','product','in_use','manual_client'),
('8b8e7f07-63b5-49a6-a2e8-31e968d47368'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 4','product','in_use','manual_client'),
('feb8d9ed-965f-45bd-a627-ab4bcc9d15bc'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 5','product','in_use','manual_client'),
('c4ac0364-cd70-41c2-b7d2-d8572a0b2778'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 6','product','in_use','manual_client'),
('6253e2f6-8784-4f3c-b4e4-94a6113d2c51'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 7','product','in_use','manual_client'),
('5519344a-caea-4e91-85c1-0cfe55e96d12'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 8','product','in_use','manual_client'),
('daab1bd9-0221-4873-ae93-30d2d31bd93e'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 9','product','in_use','manual_client'),
('bc121fa5-9fc1-489b-a8ac-d83229919457'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 10','product','in_use','manual_client'),
('0d223c64-ad77-47ce-ac74-f55fef505cd6'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 11','product','in_use','manual_client'),
('73460f11-21b7-4069-a536-89d9562a5307'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 12','product','in_use','manual_client'),
('8a050ee3-e296-4fb7-8a55-85e9237ea2db'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrent asset 13','product','in_use','manual_client');
insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner) values
('e618603b-0870-444b-b05c-002ec03d3497'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrency legal mark','word','inactive','Test owner'),
('a9ae4510-128c-4782-b5b7-e7b8b2fcea6c'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrency legal mark','word','inactive','Test owner'),
('c02015f4-14e3-4f15-9292-09774decc262'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Status refresh mark','word','inactive','Test owner'),
('fb750360-1320-4bea-8e2a-f323f2176593'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrency legal mark','word','inactive','Test owner'),
('2b2bb3c7-56ae-4b22-8696-254abdc9bc81'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Concurrency legal mark','word','inactive','Test owner'),
('c491758e-0988-491a-bf15-0e9d497ce306'::uuid,'2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid,'Status refresh mark','word','inactive','Test owner');
insert into vb_private.brand_map_race_runs(run_id,payload) select '813aabca-15c9-45f8-8f3b-06a582182bc4'::uuid,jsonb_build_object('fixture_manifest','{"prepared_only":true,"project":"imvkhicfmidzbzsbhkzs","run_id":"813aabca-15c9-45f8-8f3b-06a582182bc4","label":"bm-race-813aabca","namespace":135506621,"client_id":"2ba5b51e-62d8-48db-915f-b273e84736bb","user_id":"7da00277-4ee2-4719-bfa4-43e77f4fb6ed","staff_id":"eb1493cf-c9fe-4956-a57e-0ce120c55c02","cases":[{"index":1,"id":"read-committed/cycle","isolation":"read committed","scenario":"cycle","assets":["fd142b5a-a3f6-4101-893e-05800cce7fc1","18e6f562-5e21-4a31-800c-f85cc497b3b9"],"mark_id":null,"application_number":"90000001","expected_code":"22023"},{"index":2,"id":"read-committed/stale-edit","isolation":"read committed","scenario":"stale-edit","assets":["2a59ad79-aa74-491e-ac99-7ac76d283af6"],"mark_id":null,"application_number":"90000002","expected_code":"40001"},{"index":3,"id":"read-committed/membership-revocation","isolation":"read committed","scenario":"membership-revocation","assets":["ca9f9ade-0e14-4a07-9f57-6438bb7ad404"],"mark_id":null,"application_number":"90000003","expected_code":"42501"},{"index":4,"id":"read-committed/direct-mark-update","isolation":"read committed","scenario":"direct-mark-update","assets":["8b8e7f07-63b5-49a6-a2e8-31e968d47368"],"mark_id":"e618603b-0870-444b-b05c-002ec03d3497","application_number":"90000004","expected_code":"40001"},{"index":5,"id":"read-committed/uspto-import","isolation":"read committed","scenario":"uspto-import","assets":["feb8d9ed-965f-45bd-a627-ab4bcc9d15bc"],"mark_id":"a9ae4510-128c-4782-b5b7-e7b8b2fcea6c","application_number":"90000005","expected_code":"40001"},{"index":6,"id":"read-committed/review-and-status-refresh","isolation":"read committed","scenario":"review-and-status-refresh","assets":["c4ac0364-cd70-41c2-b7d2-d8572a0b2778"],"mark_id":"c02015f4-14e3-4f15-9292-09774decc262","application_number":"90000006","expected_code":"00000"},{"index":7,"id":"repeatable-read/cycle","isolation":"repeatable read","scenario":"cycle","assets":["6253e2f6-8784-4f3c-b4e4-94a6113d2c51","5519344a-caea-4e91-85c1-0cfe55e96d12"],"mark_id":null,"application_number":"90000007","expected_code":"40001"},{"index":8,"id":"repeatable-read/stale-edit","isolation":"repeatable read","scenario":"stale-edit","assets":["daab1bd9-0221-4873-ae93-30d2d31bd93e"],"mark_id":null,"application_number":"90000008","expected_code":"40001"},{"index":9,"id":"repeatable-read/membership-revocation","isolation":"repeatable read","scenario":"membership-revocation","assets":["bc121fa5-9fc1-489b-a8ac-d83229919457"],"mark_id":null,"application_number":"90000009","expected_code":"40001"},{"index":10,"id":"repeatable-read/direct-mark-update","isolation":"repeatable read","scenario":"direct-mark-update","assets":["0d223c64-ad77-47ce-ac74-f55fef505cd6"],"mark_id":"fb750360-1320-4bea-8e2a-f323f2176593","application_number":"90000010","expected_code":"40001"},{"index":11,"id":"repeatable-read/uspto-import","isolation":"repeatable read","scenario":"uspto-import","assets":["73460f11-21b7-4069-a536-89d9562a5307"],"mark_id":"2b2bb3c7-56ae-4b22-8696-254abdc9bc81","application_number":"90000011","expected_code":"40001"},{"index":12,"id":"repeatable-read/review-and-status-refresh","isolation":"repeatable read","scenario":"review-and-status-refresh","assets":["8a050ee3-e296-4fb7-8a55-85e9237ea2db"],"mark_id":"c491758e-0988-491a-bf15-0e9d497ce306","application_number":"90000012","expected_code":"00000"}]}'::jsonb,'draft_hash','21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3','baseline_schema',current_setting('vb_brand_map.baseline_schema'),'baseline_rows',current_setting('vb_brand_map.baseline_rows')::jsonb,'baseline_extensions',current_setting('vb_brand_map.baseline_extensions')::jsonb,'added_dates',current_setting('vb_brand_map.added_dates')::jsonb,'installed_schema',(select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata),'completed','{}'::jsonb,'overlap','{}'::jsonb);
drop function pg_temp.brand_map_preservation_snapshot();
select jsonb_build_object('status','TEMPORARY_SETUP_CREATED','run_id','813aabca-15c9-45f8-8f3b-06a582182bc4','assets',14,'marks',6,'real_logins_created',0) as brand_map_setup;
commit;
