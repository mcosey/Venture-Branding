-- Metadata and aggregate fixture absence only. No account progress contents.
select
 (select md5(prosrc)='42457d8a4c15ce7d91fca4f731241192' from pg_proc where oid='public.vb_save_member_progress(uuid,text,jsonb,timestamptz)'::regprocedure) as expected_save_body,
 (select prosecdef and proconfig=array['search_path=""'] from pg_proc where oid='public.vb_save_member_progress(uuid,text,jsonb,timestamptz)'::regprocedure) as protected_function_settings,
 has_function_privilege('authenticated','public.vb_save_member_progress(uuid,text,jsonb,timestamptz)','EXECUTE') as authenticated_can_save,
 not has_function_privilege('anon','public.vb_save_member_progress(uuid,text,jsonb,timestamptz)','EXECUTE') as anonymous_denied,
 not has_table_privilege('authenticated','public.vb_member_progress','INSERT') as direct_insert_denied,
 not has_any_column_privilege('authenticated','public.vb_member_progress','UPDATE') as direct_update_denied,
 (select relrowsecurity from pg_class where oid='public.vb_member_progress'::regclass) as row_security_enabled,
 not exists(select 1 from auth.users where id in ('f7310000-0000-4000-8000-000000000001','f7310000-0000-4000-8000-000000000002')) as fictional_accounts_absent,
 not exists(select 1 from public.vb_member_companies where id in ('f7320000-0000-4000-8000-000000000001','f7320000-0000-4000-8000-000000000002')) as fictional_companies_absent;
