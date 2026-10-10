-- Prepared only. Verify exact BCM Test SQL editor independently; no production work.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
set local idle_in_transaction_session_timeout='30s';
set local application_name='bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-cleanup-objects';
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_login_target$ begin
 if false is not true then raise exception 'Prepared copy blocked: separate live testing approval required'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_TEST_CLUSTER_PIN__' then raise exception 'Unexpected Test target'; end if;
end $bm_login_target$;
do $bm_login_locks$ declare r record; begin
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) order by n.nspname,c.relname loop execute format('lock table %I.%I in share row exclusive mode',r.nspname,r.relname); end loop;
end $bm_login_locks$;
do $bm_login_run$ declare r jsonb; begin
 select payload into strict r from vb_private.brand_map_signin_runs where run_id='48f4a9e1-f24f-47a3-83b6-7b8a3830180b'::uuid;
 if (select count(*) from vb_private.brand_map_signin_runs)<>1 or r->'manifest' is distinct from '{"prepared_only":true,"project":"imvkhicfmidzbzsbhkzs","run_id":"48f4a9e1-f24f-47a3-83b6-7b8a3830180b","label":"bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b","users":{"A":{"id":null,"email":"bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-a@example.invalid"},"B":{"id":null,"email":"bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-b@example.invalid"}},"clients":{"A":"f48f02ef-462c-45b8-8be1-42e73e61fcea","B":"f8705f4f-4414-4cec-9f00-66afb50e52c5","C":"d56bf0ab-92c2-4295-99f6-ea7147b6fda8"},"assets":{"A":["26c8f326-1726-48a8-a199-2b1053cf9c5c","f548d5be-2ce3-4da9-9ef9-75d71d01a8a4"],"B":["7296daed-a666-4248-922b-a496571d1939"]},"marks":{"A":["55838fe8-b3cc-45c6-a16a-0ad6dc3bea36","b97f6481-1cd7-47ff-b865-050db0648347"],"B":["c65f08c8-a7fc-40e6-9bf2-04a5f784a8d4"]},"unknown_client":"e40bc983-9710-4fb0-8eeb-376ab48b6c2f"}'::jsonb or r->>'draft_hash' is distinct from '21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3' or (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
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
) metadata) is distinct from r->>'installed_schema' then raise exception 'Ownership/schema changed; stop'; end if;
end $bm_login_run$;
do $bm_login_accounts$ begin
 if exists(select 1 from auth.users where id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid) or email in ('bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-a@example.invalid','bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-b@example.invalid')) then raise exception 'Remove disposable accounts through supported Auth administration first'; end if;
end $bm_login_accounts$;
create function pg_temp.brand_map_signin_snapshot() returns jsonb language plpgsql set search_path='' as $bm_login_snapshot$
declare result jsonb:='{}'::jsonb; r record; filter_sql text; row_sql text; cnt bigint; bytes bigint; dig text; ignored text[];
begin
 select coalesce(array_agg(v),'{}'::text[]) into ignored from jsonb_array_elements_text(coalesce(nullif(current_setting('vb_brand_map.signin_ignored_dates',true),''),'[]')::jsonb) v;
 if not ignored <@ array['filing_date','registration_date','uspto_status_date']::text[] then raise exception 'Unexpected normalization'; end if;
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) and c.relname not in ('brand_map_signin_runs','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links') order by n.nspname,c.relname loop
  filter_sql:=format('not (coalesce(to_jsonb(t)->>''client_id'' in (%L,%L,%L),false) or (%L=''public'' and %L=''vb_clients'' and to_jsonb(t)->>''id'' in (%L,%L,%L)) or (%L=''auth'' and %L=''users'' and to_jsonb(t)->>''id'' in (%L,%L)))','f48f02ef-462c-45b8-8be1-42e73e61fcea','f8705f4f-4414-4cec-9f00-66afb50e52c5','d56bf0ab-92c2-4295-99f6-ea7147b6fda8',r.nspname,r.relname,'f48f02ef-462c-45b8-8be1-42e73e61fcea','f8705f4f-4414-4cec-9f00-66afb50e52c5','d56bf0ab-92c2-4295-99f6-ea7147b6fda8',r.nspname,r.relname,'__OBSERVED_AUTH_USER_ID_REQUIRED__','__OBSERVED_AUTH_USER_ID_REQUIRED__');
  row_sql:=case when r.nspname='public' and r.relname='vb_marks' then format('(to_jsonb(t)-%L::text[])',ignored) else 'to_jsonb(t)' end;
  execute format('select count(*),coalesce(sum(octet_length(%s::text)),0) from %I.%I t where %s',row_sql,r.nspname,r.relname,filter_sql) into cnt,bytes;
  if cnt>10000 or bytes>16777216 then raise exception 'Snapshot beyond reviewed bounds'; end if;
  execute format('select encode(sha256(convert_to(coalesce(string_agg(%s::text,E''\n'' order by %s::text),''''),''UTF8'')),''hex'') from %I.%I t where %s',row_sql,row_sql,r.nspname,r.relname,filter_sql) into dig;
  result:=result||jsonb_build_object(r.nspname||'.'||r.relname,jsonb_build_object('count',cnt,'digest',dig));
 end loop;return result;
end $bm_login_snapshot$;
do $bm_login_objects_guard$ declare r jsonb; col text; used boolean; begin
 select payload into strict r from vb_private.brand_map_signin_runs where run_id='48f4a9e1-f24f-47a3-83b6-7b8a3830180b'::uuid for update;
 if r->>'data_cleaned' is distinct from 'true' then raise exception 'Fixture cleanup must finish first'; end if;
 if exists(select 1 from public.vb_clients where id in ('f48f02ef-462c-45b8-8be1-42e73e61fcea'::uuid,'f8705f4f-4414-4cec-9f00-66afb50e52c5'::uuid,'d56bf0ab-92c2-4295-99f6-ea7147b6fda8'::uuid)) or exists(select 1 from public.vb_marks where id in ('55838fe8-b3cc-45c6-a16a-0ad6dc3bea36'::uuid,'b97f6481-1cd7-47ff-b865-050db0648347'::uuid,'c65f08c8-a7fc-40e6-9bf2-04a5f784a8d4'::uuid)) or exists(select 1 from vb_private.client_memberships where client_id in ('f48f02ef-462c-45b8-8be1-42e73e61fcea'::uuid,'f8705f4f-4414-4cec-9f00-66afb50e52c5'::uuid,'d56bf0ab-92c2-4295-99f6-ea7147b6fda8'::uuid) or user_id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid)) or exists(select 1 from vb_private.audit_events where client_id in ('f48f02ef-462c-45b8-8be1-42e73e61fcea'::uuid,'f8705f4f-4414-4cec-9f00-66afb50e52c5'::uuid,'d56bf0ab-92c2-4295-99f6-ea7147b6fda8'::uuid) or actor_id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid)) or exists(select 1 from public.vb_service_preferences where client_id in ('f48f02ef-462c-45b8-8be1-42e73e61fcea'::uuid,'f8705f4f-4414-4cec-9f00-66afb50e52c5'::uuid,'d56bf0ab-92c2-4295-99f6-ea7147b6fda8'::uuid)) or exists(select 1 from public.vb_brand_assets) or exists(select 1 from public.vb_brand_relationships) or exists(select 1 from public.vb_brand_legal_links) then raise exception 'Fixtures or foreign Brand Map records remain'; end if;
 if exists(select 1 from auth.identities where user_id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid)) or exists(select 1 from auth.sessions where user_id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid)) or exists(select 1 from auth.mfa_factors where user_id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid)) then raise exception 'Supported Auth removal incomplete'; end if;
 if exists(select 1 from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and application_name like 'bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-%' and state<>'idle') then raise exception 'Run SQL batch active'; end if;
 perform set_config('vb_brand_map.signin_ignored_dates',(r->'added_dates')::text,true);
 if pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' then raise exception 'Parallel records changed'; end if;
 for col in select jsonb_array_elements_text(r->'added_dates') loop
  if col not in ('filing_date','registration_date','uspto_status_date') then raise exception 'Unowned date'; end if;
  execute format('select exists(select 1 from public.vb_marks where %I is not null)',col) into used;if used then raise exception 'Temporary date field adopted'; end if;
 end loop;
 perform set_config('vb_brand_map.signin_cleanup_manifest',r::text,true);
end $bm_login_objects_guard$;
drop function public.vb_read_brand_map(uuid);
drop function public.vb_save_brand_asset(uuid,uuid,bigint,jsonb);
drop function public.vb_set_brand_parent(uuid,uuid,uuid,bigint);
drop function public.vb_confirm_brand_relationship(uuid,uuid,bigint);
drop function public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb);
drop table public.vb_brand_legal_links;
drop table public.vb_brand_relationships;
drop table public.vb_brand_assets;
drop function vb_private.brand_map_touch();
drop function vb_private.brand_map_initialize_slots();
drop function vb_private.brand_map_can_read(uuid);
drop function vb_private.brand_map_lock_write(uuid,boolean);
drop function vb_private.brand_map_mark_fingerprint(public.vb_marks);
alter table public.vb_marks drop constraint vb_marks_id_client_unique;
do $bm_login_remove_dates$ declare col text;begin for col in select jsonb_array_elements_text(current_setting('vb_brand_map.signin_cleanup_manifest')::jsonb->'added_dates') loop execute format('alter table public.vb_marks drop column %I',col);end loop;end $bm_login_remove_dates$;
drop table vb_private.brand_map_signin_runs;
do $bm_login_restored$ declare r jsonb:=current_setting('vb_brand_map.signin_cleanup_manifest')::jsonb;begin
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
) metadata) is distinct from r->>'baseline_schema' or (select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e) is distinct from r->'baseline_extensions' or pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' then raise exception 'Restoration failed; rollback';end if;
end $bm_login_restored$;
drop function pg_temp.brand_map_signin_snapshot();
select jsonb_build_object('status','OBJECTS_CLEANED','run_id','48f4a9e1-f24f-47a3-83b6-7b8a3830180b','preexisting_rows_and_schema_preserved',true,'audit_sequence_gaps_possible',true,'baseline_rows',current_setting('vb_brand_map.signin_cleanup_manifest')::jsonb->'baseline_rows') as brand_map_signin_cleanup;
commit;
