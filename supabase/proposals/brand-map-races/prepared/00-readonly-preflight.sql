-- NOT RUN. Read-only BCM Test compatibility/identity check; execute only after approval.
-- First verify browser URL is https://supabase.com/dashboard/project/imvkhicfmidzbzsbhkzs/sql/...
-- A database name such as postgres does NOT identify a Supabase project.
begin read only;
set local statement_timeout='30s';
select jsonb_build_object(
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
, 'race_prerequisites',jsonb_build_object('uspto_save_available',to_regprocedure('public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)') is not null,'auth_fixture_columns_available',not exists(select 1 from (values ('users','id'),('users','email'),('users','encrypted_password'),('identities','user_id'),('sessions','user_id')) required(tbl,col) where not exists(select 1 from information_schema.columns where table_schema='auth' and table_name=required.tbl and column_name=required.col)),'control_table_absent',to_regclass('vb_private.brand_map_race_runs') is null)
) as brand_map_readonly_preflight;
rollback;
