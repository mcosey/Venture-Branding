-- Run after the BCM migration. All fixtures are rolled back; no real clients touched.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create function pg_temp.bcm_details() returns jsonb language sql as $$
 select '{"urls":["https://example.com/products"],"exclusions":["/account"],"access_mode":"public","frequency":"weekly","categories":["product_names","logos"]}'::jsonb;
$$;
insert into auth.users(id,email) values
 ('a8000000-0000-0000-0000-000000000001','bcm-one@example.com'),
 ('a8000000-0000-0000-0000-000000000002','bcm-two@example.com'),
 ('a8000000-0000-0000-0000-000000000003','bcm-staff@example.com'),
 ('a8000000-0000-0000-0000-000000000004','bcm-unassigned@example.com');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 ('b8000000-0000-0000-0000-000000000001','BCM One','business','One',true),
 ('b8000000-0000-0000-0000-000000000002','BCM Two','business','Two',true);
insert into vb_private.client_memberships(client_id,user_id) values
 ('b8000000-0000-0000-0000-000000000001','a8000000-0000-0000-0000-000000000001'),
 ('b8000000-0000-0000-0000-000000000002','a8000000-0000-0000-0000-000000000002');
insert into vb_private.staff_members(user_id) values('a8000000-0000-0000-0000-000000000003');
set local role anon;
select throws_ok($$select * from public.vb_bcm_settings$$,'42501',null,'Anonymous read denied');
select throws_ok($$select public.vb_save_bcm_settings(null,0,null,true)$$,'42501',null,'Anonymous save denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000002',0,pg_temp.bcm_details(),true)$$,'Second client creates settings');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_settings),0,'Other client settings hidden');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000002',1,pg_temp.bcm_details(),true)$$,'42501',null,'Cross-client save denied');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details(),false)$$,'22023',null,'Permission confirmation required');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details()||'{"password":"secret"}',true)$$,'22023',null,'Secret/unknown fields rejected');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details()||'{"urls":["https://example.com?token=secret"]}',true)$$,'22023',null,'Query strings rejected');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details()||'{"urls":["https://user:pass@example.com/"]}',true)$$,'22023',null,'URL credentials rejected');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details()||'{"categories":["unknown"]}',true)$$,'22023',null,'Unknown category rejected');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details()||'{"urls":[null]}',true)$$,'22023',null,'Non-string URL rejected');
select lives_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details(),true)$$,'Own initial save succeeds');
select is((select count(*)::integer from public.vb_bcm_settings),1,'Only own row readable');
select is((select version from public.vb_bcm_settings),1,'First revision recorded');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',0,pg_temp.bcm_details(),true)$$,'40001',null,'Duplicate initial save conflicts');
select lives_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',1,pg_temp.bcm_details()||'{"frequency":"monthly"}',true)$$,'Own versioned update succeeds');
select is((select version from public.vb_bcm_settings),2,'Revision advances');
select is((select frequency from public.vb_bcm_settings),'monthly','New settings readable');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',1,pg_temp.bcm_details(),true)$$,'40001',null,'Stale update blocked');
select throws_ok($$update public.vb_bcm_settings set frequency='weekly'$$,'42501',null,'Direct table update denied');
select throws_ok($$delete from public.vb_bcm_settings$$,'42501',null,'Direct delete denied');
select throws_ok($$insert into public.vb_bcm_settings(client_id) values('b8000000-0000-0000-0000-000000000001')$$,'42501',null,'Direct insert denied');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_settings),0,'Unassigned user sees no settings');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',2,pg_temp.bcm_details(),true)$$,'42501',null,'Unassigned save denied');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_settings),0,'Staff without MFA cannot read');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select is((select count(*)::integer from public.vb_bcm_settings where client_id in ('b8000000-0000-0000-0000-000000000001','b8000000-0000-0000-0000-000000000002')),2,'Staff with MFA can review settings');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',2,pg_temp.bcm_details(),true)$$,'42501',null,'Client settings RPC does not grant staff write access');
reset role;
select ok(exists(select 1 from vb_private.audit_events where table_name='vb_bcm_settings' and client_id='b8000000-0000-0000-0000-000000000001' and operation='UPDATE'),'Save audited');
update public.vb_clients set portal_enabled=false where id='b8000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_settings),0,'Disabled client cannot read');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',2,pg_temp.bcm_details(),true)$$,'42501',null,'Disabled client cannot save');
reset role;
update public.vb_clients set portal_enabled=true,archived_at=now() where id='b8000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*)::integer from public.vb_bcm_settings),0,'Archived client cannot read');
select throws_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',2,pg_temp.bcm_details(),true)$$,'42501',null,'Archived client cannot save');
select * from finish();
rollback;
