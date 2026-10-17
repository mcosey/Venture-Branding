-- READ ONLY. Review in Production project omvkwiosonatswocbdgx only.
-- No source records, account identifiers, notes or secrets are returned.
-- This is an inspection, not permission to install or replace existing objects.
begin read only;
select jsonb_build_object(
 'expected_dashboard_project','omvkwiosonatswocbdgx',
 'cluster',(select system_identifier::text from pg_control_system()),
 'private_schema_present',to_regnamespace('vb_private') is not null,
 'clients_present',to_regclass('public.vb_clients') is not null,
 'marks_present',to_regclass('public.vb_marks') is not null,
 'staff_helper_present',to_regprocedure('vb_private.is_staff()') is not null,
 'membership_helper_present',to_regprocedure('vb_private.is_client_member(uuid)') is not null,
 'session_role_present',to_regprocedure('public.vb_session_role()') is not null,
 'watch_relations',coalesce((select jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where (n.nspname='vb_private' and c.relname like 'watch\_%' escape '\')
      or (n.nspname='public' and c.relname like 'vb_watch\_%' escape '\')),'[]'::jsonb),
 'watch_functions',coalesce((select jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where (n.nspname='vb_private' and p.proname like 'watch\_%' escape '\')
      or (n.nspname='public' and p.proname like 'vb_watch\_%' escape '\')),'[]'::jsonb),
 'required_columns',coalesce((select jsonb_object_agg(required.label,exists(
   select 1 from information_schema.columns c where c.table_schema='public'
     and c.table_name=required.tab and c.column_name=required.col))
   from (values ('vb_clients.id','vb_clients','id'),('vb_clients.archived_at','vb_clients','archived_at'),
     ('vb_clients.portal_enabled','vb_clients','portal_enabled'),('vb_marks.id','vb_marks','id'),
     ('vb_marks.client_id','vb_marks','client_id'),('vb_marks.name','vb_marks','name'),
     ('vb_marks.mark_type','vb_marks','mark_type'),('vb_marks.archived_at','vb_marks','archived_at'),
     ('vb_marks.application_number','vb_marks','application_number')) required(label,tab,col)),'{}'::jsonb)
) as watch_preflight;
rollback;
