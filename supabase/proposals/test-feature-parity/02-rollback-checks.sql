-- PREPARED ONLY. Temporary synthetic SQL identities/records, always rolled back.
-- No Auth API, real accounts, email, files or network calls.
begin;
-- BEGIN HOSTED IDENTITY GUARD
 do $$ begin if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Expected BCM Test'; end if; end $$;
-- END HOSTED IDENTITY GUARD
create temporary table parity_results(label text,passed boolean);
grant select,insert on parity_results to authenticated,anon;
create function pg_temp.check_it(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'Parity assertion failed: %',label; end if;
 insert into parity_results values(label,true);
end $$;
create function pg_temp.expect_error(statement text,expected text,label text) returns void language plpgsql as $$
declare caught boolean:=false;
begin
 begin execute statement; exception when others then
  if sqlstate<>expected then raise exception 'Unexpected error category for %: %',label,sqlstate; end if;
  caught:=true;
 end;
 perform pg_temp.check_it(caught,label);
end $$;
-- Fail rather than touching an existing record at the reserved fixture identifiers.
do $$ begin
 if exists(select 1 from auth.users where id::text like 'df180001-%') or exists(select 1 from public.vb_clients where id::text like 'df180002-%') then raise exception 'Fixture identifiers already exist; stop'; end if;
end $$;
insert into auth.users(id,email) values
 ('df180001-0000-0000-0000-000000000001','parity-a@example.test'),
 ('df180001-0000-0000-0000-000000000002','parity-b@example.test'),
 ('df180001-0000-0000-0000-000000000003','parity-staff@example.test'),
 ('df180001-0000-0000-0000-000000000004','parity-member@example.test');
insert into vb_private.portal_accounts(user_id) select id from auth.users where id::text like 'df180001-%';
insert into vb_private.staff_members(user_id) values('df180001-0000-0000-0000-000000000003');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 ('df180002-0000-0000-0000-000000000001','Fictional parity company','business','Original A',true),
 ('df180002-0000-0000-0000-000000000002','Fictional parity individual','individual','Original B',true);
insert into public.vb_engagements(id,client_id,title,status,activated_at) values
 ('df180003-0000-0000-0000-000000000001','df180002-0000-0000-0000-000000000001','Fictional parity A','active',now()),
 ('df180003-0000-0000-0000-000000000002','df180002-0000-0000-0000-000000000002','Fictional parity B','active',now());
insert into public.vb_matters(id,engagement_id,title) values
 ('df180004-0000-0000-0000-000000000001','df180003-0000-0000-0000-000000000001','Scope A'),
 ('df180004-0000-0000-0000-000000000002','df180003-0000-0000-0000-000000000002','Scope B');
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values
 ('df180003-0000-0000-0000-000000000001','df180001-0000-0000-0000-000000000001','active',now()),
 ('df180003-0000-0000-0000-000000000002','df180001-0000-0000-0000-000000000002','active',now());
insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled)
 select e.client_id,e.id,m.id,'Fictional Test mapping — October 16, 2026',true from public.vb_engagements e join public.vb_matters m on m.engagement_id=e.id where e.id::text like 'df180003-%';
-- The installed trigger includes ALL Client features. Never insert a tier or
-- silently repair missing setup in a test: verify the automatic rows instead.
do $$ begin
 if (select count(*) from vb_private.engagement_services where engagement_id::text like 'df180003-%' and enabled
  and service=any(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest']))<>16 then
  raise exception 'Expected all Client features for both fixture engagements';
 end if;
end $$;
insert into vb_private.portal_service_bindings(client_id,service,engagement_id,matter_id)
 select e.client_id,'portfolio',e.id,m.id from public.vb_engagements e join public.vb_matters m on m.engagement_id=e.id where e.id::text like 'df180003-%';
create temporary table parity_context(stamp timestamptz,mark_id uuid,details jsonb);
insert into parity_context values((select updated_at from public.vb_clients where id='df180002-0000-0000-0000-000000000001'),null,
 '{"name":"SYNTHETIC PARITY","mark_type":"word","status":"pending","application_number":"01991801","record_owner":"Fictional parity company","source_checked_at":"2026-10-18T00:00:00Z"}');
grant select,update on parity_context to authenticated;
select pg_temp.check_it(not has_function_privilege('anon','public.vb_update_my_contact(uuid,timestamptz,text,text)','execute'),'anonymous contact denied');
select pg_temp.check_it(not has_function_privilege('anon','public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)','execute'),'anonymous import denied');
select set_config('request.jwt.claims','{"sub":"df180001-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.check_it((public.vb_update_my_contact('df180002-0000-0000-0000-000000000001',(select stamp from parity_context),'Updated A','a@example.test')).contact_name='Updated A','own contact saved');
select pg_temp.expect_error($q$select public.vb_update_my_contact('df180002-0000-0000-0000-000000000001','2000-01-01','Stale','a@example.test')$q$,'40001','stale contact rejected');
select pg_temp.expect_error($q$select public.vb_update_my_contact('df180002-0000-0000-0000-000000000001',(select updated_at from public.vb_clients where id='df180002-0000-0000-0000-000000000001'),'Bad','not-an-email')$q$,'22023','invalid contact rejected');
select pg_temp.expect_error($q$select public.vb_update_my_contact('df180002-0000-0000-0000-000000000002',now(),'Foreign','b@example.test')$q$,'42501','other legal client denied');
select pg_temp.expect_error($q$select public.vb_save_uspto_mark('df180002-0000-0000-0000-000000000001',null,null,(select details from parity_context))$q$,'42501','client import denied');
reset role;
select pg_temp.check_it((select contact_name='Original B' from public.vb_clients where id='df180002-0000-0000-0000-000000000002'),'other legal client unchanged');
select pg_temp.check_it((select name='Fictional parity company' and portal_enabled and archived_at is null from public.vb_clients where id='df180002-0000-0000-0000-000000000001'),'contact cannot alter identity or access');
select set_config('request.jwt.claims','{"sub":"df180001-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.vb_update_my_contact('df180002-0000-0000-0000-000000000001',now(),'Member','member@example.test')$q$,'42501','Member contact denied');
reset role;
select set_config('request.jwt.claims','{"sub":"df180001-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.vb_save_uspto_mark('df180002-0000-0000-0000-000000000001',null,null,(select details from parity_context))$q$,'42501','staff without MFA import denied');
reset role;
select set_config('request.jwt.claims','{"sub":"df180001-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
update parity_context set mark_id=public.vb_save_uspto_mark('df180002-0000-0000-0000-000000000001',null,null,details);
select pg_temp.check_it((select mark_id is not null from parity_context),'MFA staff import saved');
select pg_temp.expect_error($q$select public.vb_save_uspto_mark('df180002-0000-0000-0000-000000000001',null,null,(select details from parity_context))$q$,'23505','duplicate import rejected');
select pg_temp.expect_error($q$select public.vb_save_uspto_mark('df180002-0000-0000-0000-000000000001',(select mark_id from parity_context),'2000-01-01',(select details from parity_context))$q$,'40001','stale import rejected');
select pg_temp.expect_error($q$select public.vb_save_uspto_mark('df180002-0000-0000-0000-000000000002',(select mark_id from parity_context),now(),(select details from parity_context))$q$,'40001','import cannot move legal clients');
reset role;
select pg_temp.check_it(exists(select 1 from vb_private.legacy_test_record_scopes where resource='public.vb_marks' and record_key=jsonb_build_object('id',(select mark_id from parity_context)) and engagement_id='df180003-0000-0000-0000-000000000001'),'import retains explicit engagement scope');
update public.vb_engagements set status='closed',closed_at=now() where id='df180003-0000-0000-0000-000000000001';
select set_config('request.jwt.claims','{"sub":"df180001-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.vb_update_my_contact('df180002-0000-0000-0000-000000000001',now(),'Closed','closed@example.test')$q$,'42501','closed engagement contact denied');
reset role;
select pg_temp.check_it((select count(*)=1 from public.vb_marks where id=(select mark_id from parity_context)),'closure retains original mark');
select count(*) as assertions,bool_and(passed) as all_passed from parity_results;
rollback;
