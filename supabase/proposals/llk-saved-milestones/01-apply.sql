-- Main Venture Branding only. Prepared, not applied.
-- Extend the existing checked save operation; retain its owner-only authorization,
-- payload validation, revision checks, advisory lock, ACL and SECURITY DEFINER setup.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $guard$ begin
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216'
 then raise exception 'Expected main Venture Branding'; end if;
 if (select md5(prosrc) from pg_proc where oid='public.vb_save_member_progress(uuid,text,jsonb,timestamptz)'::regprocedure)
 is distinct from 'e7fac3bb8be1d7fc7479e22c2409c6bd' then raise exception 'Reviewed progress function changed'; end if;
 if exists(select 1 from auth.users where id in ('f7310000-0000-4000-8000-000000000001','f7310000-0000-4000-8000-000000000002'))
 or exists(select 1 from public.vb_member_companies where id in ('f7320000-0000-4000-8000-000000000001','f7320000-0000-4000-8000-000000000002'))
 then raise exception 'Reserved rollback fixture IDs already exist'; end if;
end $guard$;

-- Fingerprints stay inside the transaction. No private row values are returned.
create function pg_temp.llk_snapshot() returns jsonb language plpgsql as $snapshot$
declare resource text; digest text; result jsonb:='{}'::jsonb;
begin
 foreach resource in array array['public.vb_member_companies','public.vb_member_progress','vb_private.portal_accounts','vb_private.portal_lifecycle_events','vb_private.audit_events'] loop
  execute format('select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,''[]'')) from %s t',resource::regclass) into digest;
  result:=result||jsonb_build_object(resource,digest);
 end loop;
 return result||jsonb_build_object(
 'auth_ids',(select md5(coalesce(jsonb_agg(id order by id)::text,'[]')) from auth.users),
 'functions',(select md5(coalesce(jsonb_agg(jsonb_build_array(p.oid,case when p.oid='public.vb_save_member_progress(uuid,text,jsonb,timestamptz)'::regprocedure then null else p.prosrc end,p.proowner,p.proacl,p.prosecdef,p.proconfig) order by p.oid)::text,'[]')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','vb_private')),
 'tables',(select md5(coalesce(jsonb_agg(jsonb_build_array(c.oid,c.relowner,c.relrowsecurity,c.relforcerowsecurity,c.relacl) order by c.oid)::text,'[]')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private') and c.relkind in('r','p')),
 'policies',(select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.oid)::text,'[]')) from pg_policy p));
end $snapshot$;
create temporary table llk_before as select pg_temp.llk_snapshot() as value;

-- Change exactly the milestone allowlist in the freshly inspected installed body.
-- CREATE OR REPLACE preserves the function identity, owner and existing grants.
do $update$ declare definition text; begin
 definition:=pg_get_functiondef('public.vb_save_member_progress(uuid,text,jsonb,timestamptz)'::regprocedure);
 execute replace(definition,$old$('entity','founders','governance','equity','consents')$old$,$new$('entity','founders','governance','equity','consents','considerations','trademarks')$new$);
 if (select md5(prosrc) from pg_proc where oid='public.vb_save_member_progress(uuid,text,jsonb,timestamptz)'::regprocedure)
 is distinct from '42457d8a4c15ce7d91fca4f731241192' then raise exception 'Unexpected progress function change'; end if;
end $update$;

-- BEGIN ROLLBACK FIXTURES
savepoint llk_fixtures;
create temporary table llk_results(label text,passed boolean) on commit drop;
create temporary table llk_revisions(milestone text primary key,value timestamptz) on commit drop;
grant select,insert,update on llk_results,llk_revisions to authenticated,anon;
create function pg_temp.llk_check(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into llk_results values(label,true);
end $$;
create function pg_temp.llk_denied(command text,code text,label text) returns void language plpgsql as $$
declare actual text; begin
 begin execute command; exception when others then
  get stacked diagnostics actual=returned_sqlstate;
  if actual<>code then raise exception 'FAIL: %, expected %, got %',label,code,actual; end if;
  insert into llk_results values(label,true);return;
 end;
 raise exception 'FAIL: unexpectedly allowed: %',label;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('f7310000-0000-4000-8000-000000000001','llk-saving-one@example.test',now()),
 ('f7310000-0000-4000-8000-000000000002','llk-saving-two@example.test',now());
insert into vb_private.portal_accounts(user_id) values
 ('f7310000-0000-4000-8000-000000000001'),('f7310000-0000-4000-8000-000000000002');
insert into public.vb_member_companies(id,owner_id,name) values
 ('f7320000-0000-4000-8000-000000000001','f7310000-0000-4000-8000-000000000001','FICTIONAL LLK saving check one'),
 ('f7320000-0000-4000-8000-000000000002','f7310000-0000-4000-8000-000000000002','FICTIONAL LLK saving check two');
insert into public.vb_member_progress(company_id,milestone_id,progress) values
 ('f7320000-0000-4000-8000-000000000002','trademarks','{"version":1,"tasks":[true,false,false,false,false,false],"notes":""}'),
 ('f7320000-0000-4000-8000-000000000002','considerations','{"version":1,"tasks":[true,false],"notes":""}');
set local role anon;
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[true],"notes":""}',null)$x$,'42501','Anonymous cannot save Trademark Protection');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[true],"notes":""}',null)$x$,'42501','Anonymous cannot save Vibe Coding');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f7310000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
insert into llk_revisions select 'trademarks',public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[true,false,false,false,false,false],"notes":""}',null);
insert into llk_revisions select 'considerations',public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[true,false],"notes":""}',null);
select pg_temp.llk_check((select progress->'tasks'='[true,false,false,false,false,false]'::jsonb from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='trademarks'),'Owner Trademark Protection checkmark is saved');
select pg_temp.llk_check((select progress->'tasks'='[true,false]'::jsonb from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='considerations'),'Owner Vibe Coding checkmark is saved');
select pg_temp.llk_check((select count(*)=0 from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000002'),'Another account progress remains unreadable');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000002','trademarks','{"version":1,"tasks":[false],"notes":""}',null)$x$,'42501','Cannot change another account Trademark Protection');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000002','considerations','{"version":1,"tasks":[false],"notes":""}',null)$x$,'42501','Cannot change another account Vibe Coding');
select pg_temp.llk_denied($x$update public.vb_member_progress set progress='{}'$x$,'42501','Direct writes cannot bypass revision checks');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','unknown','{"version":1,"tasks":[true],"notes":""}',null)$x$,'22023','Unregistered milestone is rejected');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":["true"],"notes":""}',null)$x$,'22023','Nonboolean completion is rejected');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations',jsonb_build_object('version',1,'tasks',jsonb_build_array(true),'notes',repeat('x',3001)),null)$x$,'22023','Oversized notes are rejected');
select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[true,true,false,false,false,false],"notes":""}',(select value from llk_revisions where milestone='trademarks'));
select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[true,true],"notes":""}',(select value from llk_revisions where milestone='considerations'));
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[false],"notes":""}',(select value from llk_revisions where milestone='trademarks'))$x$,'40001','Stale Trademark Protection write is rejected');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[false],"notes":""}',(select value from llk_revisions where milestone='considerations'))$x$,'40001','Stale Vibe Coding write is rejected');
select pg_temp.llk_check(public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[true,true,false,false,false,false],"notes":""}',(select value from llk_revisions where milestone='trademarks'))=(select updated_at from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='trademarks'),'Trademark Protection identical retry is safe');
select pg_temp.llk_check(public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[true,true],"notes":""}',(select value from llk_revisions where milestone='considerations'))=(select updated_at from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='considerations'),'Vibe Coding identical retry is safe');
select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[false,false,false,false,false,false],"notes":""}',(select updated_at from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='trademarks'));
select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[false,false],"notes":""}',(select updated_at from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='considerations'));
select pg_temp.llk_check((select progress->'tasks'='[false,false,false,false,false,false]'::jsonb from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='trademarks'),'Trademark Protection can be unchecked');
select pg_temp.llk_check((select progress->'tasks'='[false,false]'::jsonb from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='considerations'),'Vibe Coding can be unchecked');
select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','entity','{"version":1,"tasks":[true],"notes":"Existing path"}',null);
select pg_temp.llk_check((select progress->>'notes'='Existing path' from public.vb_member_progress where company_id='f7320000-0000-4000-8000-000000000001' and milestone_id='entity'),'Formation saving remains supported');
reset role;
update vb_private.portal_accounts set status='suspended' where user_id='f7310000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','trademarks','{"version":1,"tasks":[true],"notes":""}',null)$x$,'42501','Suspended account cannot save Trademark Protection');
select pg_temp.llk_denied($x$select public.vb_save_member_progress('f7320000-0000-4000-8000-000000000001','considerations','{"version":1,"tasks":[true],"notes":""}',null)$x$,'42501','Suspended account cannot save Vibe Coding');
reset role;
do $checks$ begin if (select count(*) from llk_results)<>20 or (select bool_and(passed) from llk_results) is distinct from true then raise exception 'Incomplete saving checks'; end if; end $checks$;
select count(*) as passed_checks,bool_and(passed) as all_passed from llk_results;
rollback to savepoint llk_fixtures;
-- END ROLLBACK FIXTURES

do $preservation$ begin
 if pg_temp.llk_snapshot() is distinct from (select value from llk_before)
 then raise exception 'Existing data or permissions changed'; end if;
end $preservation$;
select true as saved_milestones_enabled,true as existing_data_preserved,true as permissions_preserved,true as fictional_fixtures_rolled_back;
commit;
