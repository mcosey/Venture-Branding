-- Prepared only. Verify exact BCM Test SQL editor independently; no production work.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
set local idle_in_transaction_session_timeout='30s';
set local application_name='bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-B-withdraw';
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_login_target$ begin
 if false is not true then raise exception 'Prepared copy blocked: separate live testing approval required'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_TEST_CLUSTER_PIN__' then raise exception 'Unexpected Test target'; end if;
end $bm_login_target$;
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
 if not exists(select 1 from auth.users where id='__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid and email='bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-a@example.invalid' and email_confirmed_at is not null and coalesce(encrypted_password,'')<>'') then raise exception 'Disposable confirmed account A differs'; end if;
if not exists(select 1 from auth.users where id='__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid and email='bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-b@example.invalid' and email_confirmed_at is not null and coalesce(encrypted_password,'')<>'') then raise exception 'Disposable confirmed account B differs'; end if;
 if exists(select 1 from vb_private.staff_members where user_id in ('__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid,'__OBSERVED_AUTH_USER_ID_REQUIRED__'::uuid)) then raise exception 'Test accounts must have no staff access'; end if;
end $bm_login_accounts$;
do $bm_login_withdraw$ declare r jsonb; begin
 select payload into strict r from vb_private.brand_map_signin_runs where run_id='48f4a9e1-f24f-47a3-83b6-7b8a3830180b'::uuid for update;
 if r->>'B_disabled' is distinct from 'false' or r->>'data_cleaned' is distinct from 'false' then raise exception 'Action already performed or cleanup started'; end if;
 if not exists(select 1 from public.vb_clients where id='f8705f4f-4414-4cec-9f00-66afb50e52c5'::uuid and name='bm-login-48f4a9e1-f24f-47a3-83b6-7b8a3830180b-B' and portal_enabled and archived_at is null) then raise exception 'Fixture client changed'; end if;
 update public.vb_clients set portal_enabled=false where id='f8705f4f-4414-4cec-9f00-66afb50e52c5'::uuid and portal_enabled;
 if not found then raise exception 'Expected fixture access absent'; end if;
 update vb_private.brand_map_signin_runs set payload=jsonb_set(payload,array['B_disabled'],'true'::jsonb) where run_id='48f4a9e1-f24f-47a3-83b6-7b8a3830180b'::uuid;
end $bm_login_withdraw$;
select jsonb_build_object('status','FIXTURE_ACCESS_WITHDRAWN','run_id','48f4a9e1-f24f-47a3-83b6-7b8a3830180b','actor','B') as brand_map_signin_access;
commit;
