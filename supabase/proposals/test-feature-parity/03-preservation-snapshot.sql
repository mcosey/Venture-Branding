-- Temporary, session-only comparison helper. Returns hashes/counts, never row contents.
-- Application rows and schema/permissions are compared before/after the inner rollback.
-- Auth comparison covers user IDs only; credentials are not inspected.
-- Sequence counters, operational statistics and concurrent work are not a data backup.
create function pg_temp.parity_snapshot() returns jsonb language plpgsql as $snapshot$
declare r record; total bigint; digest text; data jsonb:='{}'; schema_digest text; auth_digest text;
begin
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in('public','vb_private') and c.relkind in('r','p') order by n.nspname,c.relname loop
  execute format('select count(*),md5(coalesce(string_agg(h,'''' order by h),'''')) from (select md5(to_jsonb(t)::text) h from %I.%I t) rows',r.nspname,r.relname) into total,digest;
  data:=data||jsonb_build_object(r.nspname||'.'||r.relname,jsonb_build_object('count',total,'hash',digest));
 end loop;
 select md5(coalesce(string_agg(item,'' order by item),'')) into schema_digest from (
  select jsonb_build_array('schema',n.nspname,n.nspacl)::text item from pg_namespace n where n.nspname in('public','vb_private')
  union all select jsonb_build_array('relation',n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl,c.reloptions)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private')
  union all select jsonb_build_array('column',n.nspname,c.relname,a.attname,a.attnum,a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,a.attacl,pg_get_expr(d.adbin,d.adrelid))::text from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_array('constraint',n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid))::text from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private')
  union all select jsonb_build_array('index',n.nspname,c.relname,pg_get_indexdef(i.indexrelid),i.indisvalid,i.indisready)::text from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private')
  union all select jsonb_build_array('policy',n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,p.polroles,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))::text from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private')
  union all select jsonb_build_array('trigger',n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid))::text from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private') and not t.tgisinternal
  union all select jsonb_build_array('function',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),md5(p.prosrc),p.prosecdef,p.proconfig,p.proacl,p.prorettype)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','vb_private')
 ) metadata;
 select md5(coalesce(string_agg(id::text,'' order by id),'')) into auth_digest from auth.users;
 return jsonb_build_object('application_rows',data,'schema_permissions_hash',schema_digest,'auth_user_ids_hash',auth_digest);
end $snapshot$;
