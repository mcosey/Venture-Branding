-- Run only in a disposable Supabase test database. Everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id,email) values
('a0000000-0000-0000-0000-000000000001','client-a@example.com'),
('a0000000-0000-0000-0000-000000000002','client-b@example.com'),
('a0000000-0000-0000-0000-000000000003','staff@example.com'),
('a0000000-0000-0000-0000-000000000004','uninvited@example.com');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
('b0000000-0000-0000-0000-000000000001','Test A','business','A',true),
('b0000000-0000-0000-0000-000000000002','Test B','business','B',true);
insert into vb_private.client_memberships(client_id,user_id) values
('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001'),
('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002'),
-- Deliberate dual membership to test staff MFA cannot be bypassed.
('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003');
insert into vb_private.staff_members(user_id) values ('a0000000-0000-0000-0000-000000000003');
insert into public.vb_marks(id,client_id,name) values
('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Mark A'),
('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','Mark B');
insert into public.vb_client_references(client_id,clio_matter_reference) values
('b0000000-0000-0000-0000-000000000001','INTERNAL-ONLY');

set local role anon;
select throws_ok('select public.vb_session_role()','42501',null,'Anonymous callers cannot resolve a workspace role');
select throws_ok('select * from public.vb_clients','42501',null,'Signed-out users cannot read clients');
select throws_ok('select * from public.vb_marks','42501',null,'Signed-out users cannot read marks');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is(public.vb_session_role(),'client','Membership resolves the client role');
select throws_ok($$select public.vb_save_client(null,'{}'::jsonb,null)$$,'42501',null,'Client cannot call staff save function');
select is((select count(*) from public.vb_clients),1::bigint,'Client A sees only its client');
select is((select name from public.vb_marks),'Mark A','Client A sees only its mark');
select is((select count(*) from public.vb_marks where id='c0000000-0000-0000-0000-000000000002'),0::bigint,'Guessing another mark ID returns no data');
select is((select count(*) from public.vb_client_references),0::bigint,'Client cannot see internal integration references');
select is((select count(*) from vb_private.audit_events),0::bigint,'Client cannot see internal audit data');
select is((select count(*) from public.vb_service_preferences),5::bigint,'Client sees all five own preferences');
select lives_ok($$update public.vb_service_preferences set enabled=true where service='trademark_watch'$$,'Client may toggle own service');
select is((select enabled from public.vb_service_preferences where service='trademark_watch'),true,'Own toggle persisted');
with changed as (update public.vb_service_preferences set enabled=true where client_id='b0000000-0000-0000-0000-000000000002' returning *) select is((select count(*) from changed),0::bigint,'Cannot toggle another client service');
with changed as (update public.vb_marks set name='Tampered' returning *) select is((select count(*) from changed),0::bigint,'Client cannot edit mark fields');
with changed as (update public.vb_clients set portal_enabled=false returning *) select is((select count(*) from changed),0::bigint,'Client cannot change access');
select throws_ok($$insert into public.vb_marks(client_id,name) values ('b0000000-0000-0000-0000-000000000001','Unauthorized')$$,'42501',null,'Client cannot create marks');
select throws_ok($$update public.vb_service_preferences set client_id='b0000000-0000-0000-0000-000000000002'$$,'42501',null,'Client cannot reassign preferences');
select throws_ok($$insert into vb_private.staff_members(user_id) values ('a0000000-0000-0000-0000-000000000001')$$,'42501',null,'Client cannot provision staff');
select throws_ok($$insert into vb_private.client_memberships(client_id,user_id) values ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001')$$,'42501',null,'Client cannot join another workspace');
select throws_ok('delete from public.vb_marks','42501',null,'Client cannot delete marks');

select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select is((select name from public.vb_marks),'Mark B','Client B sees only B');
select is((select enabled from public.vb_service_preferences where service='trademark_watch'),false,'Client B preference was not changed');

select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2","user_metadata":{"role":"staff","client_id":"b0000000-0000-0000-0000-000000000001"}}',true);
select is(public.vb_session_role(),'denied','Editable metadata cannot forge workspace role');
select is((select count(*) from public.vb_clients),0::bigint,'Uninvited user cannot gain access through editable metadata');
select is((select count(*) from public.vb_marks),0::bigint,'Uninvited user sees no marks');
select throws_ok($$insert into public.vb_clients(name,client_type,contact_name) values ('Fake','business','Fake')$$,'42501',null,'Uninvited user cannot create clients');

select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',true);
select is(public.vb_session_role(),'denied','Staff role requires MFA even with client membership');
select throws_ok($$select public.vb_save_client(null,'{}'::jsonb,null)$$,'42501',null,'Non-MFA staff cannot call save function');
select is((select count(*) from public.vb_clients),0::bigint,'Staff without MFA cannot use a client membership to bypass MFA');
select throws_ok($$insert into public.vb_clients(name,client_type,contact_name) values ('Fake','business','Fake')$$,'42501',null,'Staff without MFA cannot create records');

select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select is((select count(*) from public.vb_clients where id in ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002')),2::bigint,'Authorized MFA staff sees both test clients');
select is(public.vb_session_role(),'staff','MFA staff role resolves from protected membership');
select lives_ok($$select public.vb_save_client('b0000000-0000-0000-0000-000000000001','{"name":"Test A","client_type":"business","contact_name":"Updated contact","portal_enabled":true,"clio_contact_reference":"CONTACT-A"}'::jsonb,(select updated_at from public.vb_clients where id='b0000000-0000-0000-0000-000000000001'))$$,'Staff saves client and references together');
select is((select clio_contact_reference from public.vb_client_references where client_id='b0000000-0000-0000-0000-000000000001'),'CONTACT-A','Related reference persisted');
select throws_ok($$select public.vb_save_client('b0000000-0000-0000-0000-000000000001','{}'::jsonb,'2000-01-01'::timestamptz)$$,'40001',null,'Stale client updates are rejected');
select lives_ok($$update public.vb_marks set name='Reviewed A' where id='c0000000-0000-0000-0000-000000000001'$$,'MFA staff can update a mark');
select is((select previous_data->>'name' from vb_private.audit_events where record_id='c0000000-0000-0000-0000-000000000001' and operation='UPDATE'),'Mark A','Mark history preserves previous value');
select is((select actor_id from vb_private.audit_events where record_id='c0000000-0000-0000-0000-000000000001' and operation='UPDATE'),'a0000000-0000-0000-0000-000000000003'::uuid,'History records the actor');
select throws_ok($$update public.vb_marks set client_id='b0000000-0000-0000-0000-000000000002' where id='c0000000-0000-0000-0000-000000000001'$$,'23514',null,'Mark ownership cannot silently change');
select throws_ok('update vb_private.audit_events set previous_data=null','42501',null,'Staff cannot rewrite history');
select lives_ok($$update public.vb_clients set archived_at=now() where id='b0000000-0000-0000-0000-000000000001'$$,'Staff can archive a client');
select throws_ok($$insert into public.vb_marks(client_id,name) values ('b0000000-0000-0000-0000-000000000001','Archived addition')$$,'42501',null,'No new marks for archived clients');

select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*) from public.vb_clients),0::bigint,'Archive immediately removes client access');
select is((select count(*) from public.vb_marks),0::bigint,'Archive removes mark access');
select is((select count(*) from public.vb_service_preferences),0::bigint,'Archive removes preference access');
reset role;
update public.vb_clients set archived_at=null, portal_enabled=false where id='b0000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*) from public.vb_clients),0::bigint,'Disabling portal blocks an otherwise active membership');
reset role;
update public.vb_clients set portal_enabled=true where id='b0000000-0000-0000-0000-000000000001';
update vb_private.client_memberships set active=false where user_id='a0000000-0000-0000-0000-000000000001';
set local role authenticated;
select is(public.vb_session_role(),'denied','Revoked membership loses routing role');
select is((select count(*) from public.vb_clients),0::bigint,'Membership revocation takes effect without refreshing the JWT');
reset role;
update vb_private.staff_members set active=false where user_id='a0000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select is(public.vb_session_role(),'denied','Disabled staff cannot enter either workspace');
select is((select count(*) from public.vb_clients),0::bigint,'Deactivated staff loses access despite a still-valid MFA claim');
reset role;
select * from finish();
rollback;
