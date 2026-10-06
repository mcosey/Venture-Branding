begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values('a6000000-0000-0000-0000-000000000001','contact-test@example.com');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
('b6000000-0000-0000-0000-000000000001','Contact fixture','business','Original',true),
('b6000000-0000-0000-0000-000000000002','Other fixture','business','Other',true);
insert into vb_private.client_memberships(client_id,user_id) values('b6000000-0000-0000-0000-000000000001','a6000000-0000-0000-0000-000000000001');
set local role anon;
select throws_ok($$select public.vb_update_my_contact(null,null,'Name',null)$$,'42501',null,'Anonymous denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select public.vb_update_my_contact('b6000000-0000-0000-0000-000000000002',null,'Name',null)$$,'42501',null,'Other client denied');
select throws_ok($$select public.vb_update_my_contact('b6000000-0000-0000-0000-000000000001',null,'Name',null)$$,'40001',null,'Missing version denied');
select throws_ok($$select public.vb_update_my_contact('b6000000-0000-0000-0000-000000000001',now(),'','invalid')$$,'22023',null,'Invalid details denied');
select lives_ok($$select public.vb_update_my_contact('b6000000-0000-0000-0000-000000000001',(select updated_at from public.vb_clients where id='b6000000-0000-0000-0000-000000000001'),'Updated','contact@example.com')$$,'Own contact save succeeds');
select is((select contact_name from public.vb_clients where id='b6000000-0000-0000-0000-000000000001'),'Updated','Contact saved');
select is((select name from public.vb_clients where id='b6000000-0000-0000-0000-000000000001'),'Contact fixture','Legal name unchanged');
update public.vb_clients set name='Not allowed' where id='b6000000-0000-0000-0000-000000000001';
select is((select name from public.vb_clients where id='b6000000-0000-0000-0000-000000000001'),'Contact fixture','Direct legal-name write blocked');
reset role;
select ok(exists(select 1 from vb_private.audit_events where record_id='b6000000-0000-0000-0000-000000000001' and operation='UPDATE' and actor_id='a6000000-0000-0000-0000-000000000001'),'Contact update audited');
update public.vb_clients set archived_at=now() where id='b6000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($$select public.vb_update_my_contact('b6000000-0000-0000-0000-000000000001',now(),'Name',null)$$,'42501',null,'Archived client denied');
select * from finish();
rollback;
