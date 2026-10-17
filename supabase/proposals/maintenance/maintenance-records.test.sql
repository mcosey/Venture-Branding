-- PREPARED, NOT RUN. Apply draft in an approved isolated test database first.
-- Fixtures are fictional and rolled back. No emails or external calls.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
 ('ae100000-0000-0000-0000-000000000001','maintenance-client-one@example.invalid'),
 ('ae100000-0000-0000-0000-000000000002','maintenance-client-two@example.invalid'),
 ('ae100000-0000-0000-0000-000000000003','maintenance-staff@example.invalid'),
 ('ae100000-0000-0000-0000-000000000004','maintenance-unassigned@example.invalid');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 ('be100000-0000-0000-0000-000000000001','Maintenance One','business','One',true),
 ('be100000-0000-0000-0000-000000000002','Maintenance Two','business','Two',true);
insert into public.vb_marks(id,client_id,name,mark_type,status) values
 ('ce100000-0000-0000-0000-000000000001','be100000-0000-0000-0000-000000000001','Example One','word','registered'),
 ('ce100000-0000-0000-0000-000000000002','be100000-0000-0000-0000-000000000002','Example Two','word','registered'),
 ('ce100000-0000-0000-0000-000000000003','be100000-0000-0000-0000-000000000001','Example Other Mark','word','registered');
insert into vb_private.client_memberships(client_id,user_id) values
 ('be100000-0000-0000-0000-000000000001','ae100000-0000-0000-0000-000000000001'),
 ('be100000-0000-0000-0000-000000000002','ae100000-0000-0000-0000-000000000002');
insert into vb_private.staff_members(user_id) values('ae100000-0000-0000-0000-000000000003');
insert into vb_private.maintenance_drafts(id,client_id,mark_id,description,window_start,window_end,deadline,next_step,status,verification_source,created_by,updated_by) values
 ('de100000-0000-0000-0000-000000000001','be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','Example filing','2026-10-01','2027-03-31','2027-03-31','Discuss use.','Upcoming','PRIVATE SOURCE','ae100000-0000-0000-0000-000000000003','ae100000-0000-0000-0000-000000000003');
create function pg_temp.maintenance_details() returns jsonb language sql as $$
 select '{"description":"Revised filing","windowStart":"2026-10-01","windowEnd":"2027-03-31","deadline":"2027-03-01","nextStep":"Discuss new use.","status":"Needs attention","source":"PRIVATE SOURCE"}'::jsonb;
$$;
set local role anon;
select throws_ok($$select * from public.vb_maintenance_publications$$,'42501',null,'Anonymous cannot read publications');
select throws_ok($$select public.vb_list_maintenance_drafts(null,null)$$,'42501',null,'Anonymous cannot call staff listing');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_maintenance_publications),0,'Unpublished draft is invisible');
select throws_ok($$select * from vb_private.maintenance_drafts$$,'42501',null,'Client cannot read private drafts');
select throws_ok($$select public.vb_list_maintenance_drafts('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001')$$,'42501',null,'Client cannot use attorney listing');
select throws_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001',null,0,pg_temp.maintenance_details())$$,'42501',null,'Client cannot save drafts');
select throws_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',1,true)$$,'42501',null,'Client cannot publish');
select throws_ok($$select public.vb_withdraw_maintenance(null,null,null,1)$$,'42501',null,'Client cannot withdraw');
select throws_ok($$update public.vb_maintenance_publications set status='Completed'$$,'42501',null,'Direct publication updates denied');
select throws_ok($$select vb_private.maintenance_record('de100000-0000-0000-0000-000000000001')$$,'42501',null,'Private projection helper denied');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select public.vb_list_maintenance_drafts('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001')$$,'42501',null,'Staff needs MFA');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select lives_ok($$select public.vb_list_maintenance_drafts('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001')$$,'MFA staff can list drafts');
select throws_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000002',null,0,pg_temp.maintenance_details())$$,'42501',null,'Wrong-client mark rejected');
select throws_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000003','de100000-0000-0000-0000-000000000001',1,pg_temp.maintenance_details())$$,'42501',null,'Existing entry cannot change mark');
select throws_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',1,pg_temp.maintenance_details()||'{"verified_by":"forged"}')$$,'22023',null,'Unknown fields rejected');
select throws_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',1,pg_temp.maintenance_details()||'{"deadline":"2027-02-30"}')$$,'22023',null,'Invalid date rejected');
select throws_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',1,false)$$,'22023',null,'Verification required');
select lives_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',1,true)$$,'Verified publication succeeds');
select lives_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',2,pg_temp.maintenance_details())$$,'New revision saved privately');
select is((select description from public.vb_maintenance_publications where id='de100000-0000-0000-0000-000000000001'),'Example filing','Prior published version retained');
select throws_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',2,true)$$,'40001',null,'Stale publish rejected');
select lives_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',3,true)$$,'New revision published');
select throws_ok($$select public.vb_save_maintenance_draft('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',3,pg_temp.maintenance_details())$$,'40001',null,'Stale save rejected');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_maintenance_publications),0,'Other client cannot see publication');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_maintenance_publications),0,'Unassigned account cannot see publication');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_maintenance_publications),1,'Own client sees published row');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='vb_maintenance_publications' and column_name in ('verification_source','source','created_by','updated_by')),'Private fields absent from public table');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select lives_ok($$select public.vb_withdraw_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',4)$$,'Withdrawal retains record');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_maintenance_publications),0,'Withdrawn row hidden from client');
reset role;
select is((select count(*)::integer from vb_private.maintenance_drafts),1,'Withdrawal retains private draft');
select ok(exists(select 1 from vb_private.audit_events where table_name='vb_maintenance_publications' and record_id='de100000-0000-0000-0000-000000000001' and operation='UPDATE'),'Publication and withdrawal audited');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select lives_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',5,true)$$,'Withdrawn record can be verified and republished');
reset role;
update public.vb_clients set portal_enabled=false where id='be100000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_maintenance_publications),0,'Disabled client cannot read');
reset role;
update public.vb_clients set portal_enabled=true where id='be100000-0000-0000-0000-000000000001';
update public.vb_marks set archived_at=now() where id='ce100000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*)::integer from public.vb_maintenance_publications),0,'Archived mark cannot appear to client');
select set_config('request.jwt.claims','{"sub":"ae100000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select throws_ok($$select public.vb_publish_maintenance('be100000-0000-0000-0000-000000000001','ce100000-0000-0000-0000-000000000001','de100000-0000-0000-0000-000000000001',6,true)$$,'42501',null,'Archived mark cannot be republished');
reset role;
select throws_ok($$update vb_private.maintenance_drafts set mark_id='ce100000-0000-0000-0000-000000000003' where id='de100000-0000-0000-0000-000000000001'$$,'23514',null,'Database rejects reassignment');
select * from finish();
rollback;
