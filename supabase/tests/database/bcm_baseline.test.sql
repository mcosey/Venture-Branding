-- Run after the configured-public-pages and included-primary-page BCM migrations.
-- All fixtures are rolled back; no real clients touched.
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
select ok(not has_function_privilege('authenticated','public.vb_finish_bcm_baseline(uuid,jsonb,boolean)','execute'),'Client cannot call worker finalizer');
select throws_ok($$update public.vb_bcm_scans set status='failed'$$,'42501',null,'Direct update denied');
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_scans),0,'Other client history hidden');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where client_id='b8000000-0000-0000-0000-000000000001'),'{"url":"https://cotivate.com/","title":"Cotivate","headings":["Cotivate"],"text":"A public homepage baseline with sufficient text for testing.","extractor":"source-text-v1"}'::jsonb,false),'completed','Worker saves baseline');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select snapshot->>'title' from public.vb_bcm_scans),'Cotivate','Client reads stored snapshot');
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'40001',null,'Completed baseline not replaced');
-- The scanner intentionally rate-limits repeated requests; age the test fixture before retrying.
reset role;
set local role service_role;
update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id='b8000000-0000-0000-0000-000000000001';
reset role;
create temporary table bcm_retained_baseline as select to_jsonb(s) as saved_row from public.vb_bcm_scans s where client_id='b8000000-0000-0000-0000-000000000001' and scan_type='baseline';
grant select on bcm_retained_baseline to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$select public.vb_begin_bcm_comparison('b8000000-0000-0000-0000-000000000001',1)$$,'Client can reserve a comparison against saved baseline');
select is((select scan_type from public.vb_bcm_scans where status='running'),'comparison','Comparison links a saved baseline');
select throws_ok($$select public.vb_begin_bcm_comparison('b8000000-0000-0000-0000-000000000001',99)$$,'40001',null,'Stale comparison settings denied');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where scan_type='comparison'),'{"url":"https://cotivate.com/","title":"Cotivate","headings":["Cotivate"],"text":"A second public homepage snapshot with sufficient text to compare.","extractor":"source-text-v2","urls":["https://cotivate.com/"],"pages":[{"url":"https://cotivate.com/","title":"Cotivate","headings":["Cotivate"],"text":"A second public homepage snapshot with sufficient text to compare.","extractor":"source-text-v2"}]}'::jsonb,false),'completed','New-format comparison saved against legacy baseline');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select snapshot->>'title' from public.vb_bcm_scans where scan_type='comparison'),'Cotivate','Client can read comparison snapshot');
select is((select to_jsonb(s)::text from public.vb_bcm_scans s where scan_type='baseline'),(select saved_row::text from pg_temp.bcm_retained_baseline),'Legacy baseline row remains unchanged');
select is((select baseline_id from public.vb_bcm_scans where scan_type='comparison'),(select id from public.vb_bcm_scans where scan_type='baseline'),'New-format comparison links the legacy baseline');
select lives_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',1,'{"urls":["https://example.com/products","https://example.com/account","https://example.net/features"],"exclusions":["/account"],"access_mode":"public","frequency":"weekly","categories":["product_names"]}'::jsonb,true)$$,'Client can update monitored page list');
reset role;
set local role service_role;
update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id='b8000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',2)$$,'Updated page list can establish a new baseline');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where settings_version=2 and scan_type='baseline'),$json${"url":"https://example.com/products","urls":["https://example.com/products","https://example.net/features"],"pages":[{"url":"https://example.com/products","title":"Products","headings":["Products"],"text":"A product page with enough readable text for the saved baseline.","extractor":"source-text-v2"},{"url":"https://example.net/features","title":"Features","headings":["Features"],"text":"A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}],"title":"Products","headings":["Products","Features"],"text":"A product page with enough readable text for the saved baseline. A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}$json$::jsonb,false),'completed','Worker saves exactly the configured, non-excluded pages');
select is((select jsonb_array_length(snapshot->'pages') from public.vb_bcm_scans where settings_version=2 and scan_type='baseline'),2,'Snapshot retains per-page source evidence');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$select public.vb_save_bcm_settings('b8000000-0000-0000-0000-000000000001',2,'{"urls":["https://example.com/account","https://example.com/products","https://example.net/features"],"exclusions":["/account"],"access_mode":"public","frequency":"weekly","categories":["product_names"]}'::jsonb,true)$$,'Client can exclude the first configured page');
reset role;
set local role service_role;
update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id='b8000000-0000-0000-0000-000000000001';
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',3)$$,'First-page exclusion baseline reserved');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok($$select public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where settings_version=3 and scan_type='baseline'),$json${"url":"https://example.com/account","urls":["https://example.com/products","https://example.net/features"],"pages":[{"url":"https://example.com/products","title":"Products","headings":["Products"],"text":"A product page with enough readable text for the saved baseline.","extractor":"source-text-v2"},{"url":"https://example.net/features","title":"Features","headings":["Features"],"text":"A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}],"title":"Products","headings":["Products","Features"],"text":"A product page with enough readable text for the saved baseline. A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}$json$::jsonb,false)$$,'P0001','Snapshot primary URL does not match included pages','Excluded primary URL still rejected');
select is((select public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where settings_version=3 and scan_type='baseline'),$json${"url":"https://example.com/products","urls":["https://example.com/products","https://example.net/features"],"pages":[{"url":"https://example.com/products","title":"Products","headings":["Products"],"text":"A product page with enough readable text for the saved baseline.","extractor":"source-text-v2"},{"url":"https://example.net/features","title":"Features","headings":["Features"],"text":"A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}],"title":"Products","headings":["Products","Features"],"text":"A product page with enough readable text for the saved baseline. A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}$json$::jsonb,false)),'completed','First-page exclusion baseline saves included primary URL');
update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id='b8000000-0000-0000-0000-000000000001' and settings_version=3;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$select public.vb_begin_bcm_comparison('b8000000-0000-0000-0000-000000000001',3)$$,'First-page exclusion comparison reserved');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is((select public.vb_finish_bcm_baseline((select id from public.vb_bcm_scans where settings_version=3 and scan_type='comparison'),$json${"url":"https://example.com/products","urls":["https://example.com/products","https://example.net/features"],"pages":[{"url":"https://example.com/products","title":"Products","headings":["Products"],"text":"A product page with enough readable text for the saved baseline.","extractor":"source-text-v2"},{"url":"https://example.net/features","title":"Features","headings":["Features"],"text":"A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}],"title":"Products","headings":["Products","Features"],"text":"A product page with enough readable text for the saved baseline. A feature page with enough readable text for the saved baseline.","extractor":"source-text-v2"}$json$::jsonb,false)),'completed','First-page exclusion comparison saves included primary URL');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select snapshot->>'url' from public.vb_bcm_scans where settings_version=3 and scan_type='baseline'),'https://example.com/products','Client reads included primary page');
select is((select baseline_id from public.vb_bcm_scans where settings_version=3 and scan_type='comparison'),(select id from public.vb_bcm_scans where settings_version=3 and scan_type='baseline'),'First-page exclusion comparison links correct baseline');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.vb_clients set portal_enabled=false where id='b8000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.vb_bcm_scans),0,'Disabled client cannot read snapshots');
select throws_ok($$select public.vb_begin_bcm_baseline('b8000000-0000-0000-0000-000000000001',1)$$,'42501',null,'Disabled client cannot scan');
select * from finish(true);
rollback;
