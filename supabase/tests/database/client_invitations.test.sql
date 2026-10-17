-- Disposable fixtures; no email sent; all changes rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
 ('a5000000-0000-0000-0000-000000000001','invite-staff@example.com',now()),
 ('a5000000-0000-0000-0000-000000000002','invite-existing@example.com',now());
insert into vb_private.staff_members(user_id) values('a5000000-0000-0000-0000-000000000001');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 ('b5000000-0000-0000-0000-000000000001','Invitation fixture','business','Fixture',true),
 ('b5000000-0000-0000-0000-000000000002','Other fixture','business','Fixture',true);
insert into vb_private.client_memberships(client_id,user_id) values('b5000000-0000-0000-0000-000000000002','a5000000-0000-0000-0000-000000000002');
set local role anon;
select throws_ok($$select public.vb_portal_access_status()$$,'42501',null,'Anonymous cannot read invitation status');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}',true);
select throws_ok($$select public.vb_portal_access_status()$$,'42501',null,'Client cannot read staff invitation status');
select throws_ok($$select public.vb_prepare_client_invite(null,'x@example.com',null)$$,'42501',null,'Client cannot prepare invitations');
select throws_ok($$select public.vb_set_portal_access(null,true,null)$$,'42501',null,'Client cannot enable access');
select throws_ok($$select public.vb_complete_client_invite(null,null,true)$$,'42501',null,'Client cannot grant memberships');
select set_config('request.jwt.claims','{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select public.vb_portal_access_status()$$,'42501',null,'Attorney status requires MFA');
select set_config('request.jwt.claims','{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
select is((select access_status from public.vb_portal_access_status() where client_id='b5000000-0000-0000-0000-000000000002'),'active','Existing confirmed account stays active');
select throws_ok($$select public.vb_complete_client_invite(null,null,true)$$,'42501',null,'Browser staff cannot invoke service-only completion');
select throws_ok($$select public.vb_prepare_client_invite('b5000000-0000-0000-0000-000000000001','invite-existing@example.com',(select updated_at from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'))$$,'P0001',null,'Existing other-client account rejected');
select throws_ok($$select public.vb_prepare_client_invite('b5000000-0000-0000-0000-000000000001','invite-staff@example.com',(select updated_at from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'))$$,'P0001',null,'Staff account rejected');
select set_config('test.invite_ticket',public.vb_prepare_client_invite('b5000000-0000-0000-0000-000000000001','invite-new@example.com',(select updated_at from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'))::text,true);
select is((select access_status from public.vb_portal_access_status() where client_id='b5000000-0000-0000-0000-000000000001'),'sending','Reservation visible as sending');
select throws_ok($$select public.vb_prepare_client_invite('b5000000-0000-0000-0000-000000000001','invite-new@example.com',(select updated_at from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'))$$,'P0001',null,'Duplicate send throttled');
reset role;
insert into auth.users(id,email,invited_at) values('a5000000-0000-0000-0000-000000000003','invite-new@example.com',now());
set local role service_role;
select throws_ok($$select public.vb_complete_client_invite(current_setting('test.invite_ticket')::uuid,'a5000000-0000-0000-0000-000000000002',true)$$,'P0001',null,'Wrong returned identity rejected');
select lives_ok($$select public.vb_complete_client_invite(current_setting('test.invite_ticket')::uuid,'a5000000-0000-0000-0000-000000000003',true)$$,'Matching invitation receives membership');
reset role;
select is((select count(*) from vb_private.client_memberships where user_id='a5000000-0000-0000-0000-000000000003'),1::bigint,'Exactly one client membership');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
select is((select access_status from public.vb_portal_access_status() where client_id='b5000000-0000-0000-0000-000000000001'),'pending','Unconfirmed account remains pending');
select lives_ok($$select public.vb_set_portal_access('b5000000-0000-0000-0000-000000000001',false,(select updated_at from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'))$$,'Disable portal access');
select set_config('request.jwt.claims','{"sub":"a5000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',true);
select is((select count(*) from public.vb_clients),0::bigint,'Disabled client sees no client records');
select set_config('request.jwt.claims','{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
select lives_ok($$select public.vb_set_portal_access('b5000000-0000-0000-0000-000000000001',true,(select updated_at from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'))$$,'Explicit re-enable');
update public.vb_clients set archived_at=now() where id='b5000000-0000-0000-0000-000000000001';
select is((select portal_enabled from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'),false,'Archive disables access');
update public.vb_clients set archived_at=null,portal_enabled=true where id='b5000000-0000-0000-0000-000000000001';
select is((select portal_enabled from public.vb_clients where id='b5000000-0000-0000-0000-000000000001'),false,'Restore cannot implicitly re-enable');
select * from finish();
rollback;
