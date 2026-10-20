-- READ ONLY. Save metadata; do not call application functions or read client rows.
begin transaction read only;
select jsonb_build_object('database_id',(select system_identifier::text from pg_control_system()),
 'functions',(select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'source_hash',md5(p.prosrc))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('vb_update_my_contact','vb_save_uspto_mark')) or (n.nspname='vb_private' and p.proname in('is_staff','is_client_member','portal_scope_new_record','portal_actor_scope','portal_row_read'))),
 'columns',(select jsonb_agg(jsonb_build_object('table',table_name,'name',column_name,'type',data_type)) from information_schema.columns where table_schema='public' and table_name in('vb_clients','vb_marks')),
 'mark_indexes',(select jsonb_agg(jsonb_build_object('name',indexname,'definition',indexdef)) from pg_indexes where schemaname='public' and tablename='vb_marks')) as metadata;
commit;
