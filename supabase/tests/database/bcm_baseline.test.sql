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

insert into public.vb_bcm_settings(client_id,urls,access_mode,frequency,categories,authorized_by) values
 ('b8000000-0000-0000-0000-000000000001',array['https://cotivate.com/'],'public','weekly',array['product_names'],'a8000000-0000-0000-0000-000000000001');
set local role anon;
select throws_ok($$select * from public.vb_bcm_scans$$,'42501',null,'Anonymous scan read denied');
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'42501',null,'Anonymous scan denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'42501',null,'Cross-client scan denied');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',99)$$,'40001',null,'Stale version denied');
select lives_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'Own scan reserved');
select is((select count(*)::integer from public.vb_bcm_scans),1,'Own history visible');
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'40001',null,'Duplicate concurrent scan denied');
select throws_ok($$select public.vb_finish_bcm_baseline(null,null,false)$$,'42501',null,'Client cannot manufacture baseline');
select throws_ok($$update public.vb_bcm_scans set status='failed'$$,'42501',null,'Direct update denied');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_scans),0,'Other client history hidden');
reset role;
set local role service_role;
select is(public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where client_id='b8000000-0000-0000-0000-000000000001'),'{"url":"https://cotivate.com/","title":"Cotivate","headings":["Cotivate"],"text":"A public homepage baseline with sufficient text for testing.","extractor":"source-text-v1"}'::jsonb,false),'completed','Worker saves baseline');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select snapshot->>'title' from public.vb_bcm_scans),'Cotivate','Client reads stored snapshot');
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'40001',null,'Completed baseline not replaced');
reset role;
update public.vb_clients set portal_enabled=false where id='b8000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*)::integer from public.vb_bcm_scans),0,'Disabled client cannot read snapshots');
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'42501',null,'Disabled client cannot scan');
select * from finish();
rollback;
