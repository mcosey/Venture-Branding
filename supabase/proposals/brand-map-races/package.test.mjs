// Local packaging/safety checks only. Synthetic reports do not count as database evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {buildCleanup,buildGateRehearsal,buildRace,buildSetup,buildVerification,manifest,postcheck,racePreflightSql,sources,validateManifest,verifyCaseReports,verifyCompletedRun,verifyGateReports} from './package.mjs';
import {code,digest,splitSql,TEST_PROJECT} from '../brand-map-hosted/package.mjs';
const s=await sources(),m=manifest('84b322ec-3a30-4f82-90b1-b5dca243a61a');
const copy=x=>structuredClone(x);
function gateReports(){return {controller:{run_id:m.run_id,case_id:'gate-rehearsal',actor:'controller',pid:101,isolation:'read committed',status:'GATE_OVERLAP',winner_pid:102,loser_pid:103,winner_blocked_by:101,loser_blocked_by:102},winner:{run_id:m.run_id,case_id:'gate-rehearsal',actor:'winner',pid:102,isolation:'read committed',status:'GATE_RELEASED'},loser:{run_id:m.run_id,case_id:'gate-rehearsal',actor:'loser',pid:103,isolation:'read committed',status:'GATE_RELEASED'}};}
function caseReports(c){return {controller:{run_id:m.run_id,case_id:c.id,actor:'controller',pid:101,status:'OVERLAP_CONFIRMED',winner_pid:102,loser_pid:103,winner_blocked_by:101,loser_blocked_by:102,revocation_before_gate_release:c.scenario==='membership-revocation'},winner:{run_id:m.run_id,case_id:c.id,actor:'winner',pid:102,isolation:c.isolation,status:'WINNER_COMMITTED',action_performed:true,controller_gate_released:true},loser:{run_id:m.run_id,case_id:c.id,actor:'loser',pid:103,isolation:c.isolation,status:'LOSER_RESULT',initial_read_succeeded:true,sqlstate:c.expected_code}};}
const enabled={approved:true,observedUrl:`https://supabase.com/dashboard/project/${TEST_PROJECT}/sql/new`,databaseIdentity:'1234567890123456789',schemaDigest:'a'.repeat(64),testWindowConfirmed:true,gateReports:gateReports()};

test('manifest rejects reused identifiers, injected fields, changed cases and altered scope',()=>{
 validateManifest(m);
 for(const change of [x=>x.project='omvkwiosonatswocbdgx',x=>x.namespace=0,x=>x.prepared_only=false,x=>x.password='secret',x=>x.client_id=x.user_id,x=>x.cases.pop(),x=>x.cases[0].expected_code='00000',x=>x.cases[0].assets[0]="';delete from auth.users;--",x=>x.cases[0].application_number='99999999',x=>x.cases[0].extra=true]){const bad=copy(m);change(bad);assert.throws(()=>validateManifest(bad));}
 assert.equal(new Set(m.cases.map(c=>c.application_number)).size,12);
 assert.equal(m.cases.flatMap(c=>c.assets).length,14);
 assert.equal(m.cases.filter(c=>c.mark_id).length,6);
});

test('all three original reviewed sources are hash pinned and unchanged',()=>{
 assert.equal(digest(s.migration),'21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3');
 assert.equal(digest(s.privacy),'fa5b63c982f1ba1b784fe2d0ee9e8c0a5ca480a03bb57c25610677eb54e7f041');
 assert.equal(digest(s.localConcurrency),'675cef5067e7ca854730094fa5306579fb68c807db8cf055eca2cb961d5a4014');
 assert.throws(()=>buildSetup(m,s.migration+'\n',s.privacy));
 assert.throws(()=>buildCleanup(m,s.migration,s.privacy+'\n'));
});

test('default batches stop before the first mutation, including setup/cleanup helpers',()=>{
 const all=[buildSetup(m,s.migration,s.privacy),buildCleanup(m,s.migration,s.privacy),...Object.values(buildGateRehearsal(m)),...m.cases.flatMap(c=>[...Object.values(buildRace(m,c)),buildVerification(m,c,null)])];
 for(const sql of all){const stmts=splitSql(sql).map(code);const guard=stmts.findIndex(x=>x.startsWith('do $bm_target$'));assert.ok(guard>0);assert.match(stmts[guard],/if false is not true/);assert.ok(stmts.slice(0,guard).every(x=>/^(begin|set local)\b/.test(x)));assert.match(sql,/__FRESH_TEST_CLUSTER_PIN__/);assert.doesNotMatch(sql,/create extension|drop schema|truncate|setval\(|\bcascade\b/i);}
});

test('activation requires exact Test, fresh pins, coordination and proven gate rehearsal',()=>{
 for(const change of [{observedUrl:enabled.observedUrl.replace(TEST_PROJECT,'omvkwiosonatswocbdgx')},{observedUrl:enabled.observedUrl.replace(TEST_PROJECT,'yjhzhflyuxcxugfgspby')},{observedUrl:enabled.observedUrl.replace('supabase.com','supabase.com.evil.example')},{databaseIdentity:'123;delete'},{schemaDigest:'wrong'},{testWindowConfirmed:false},{gateReports:null}])assert.throws(()=>buildSetup(m,s.migration,s.privacy,{...enabled,...change}));
 assert.match(buildSetup(m,s.migration,s.privacy,enabled),/if true is not true/);
});

test('setup includes every original backend statement and denies SQL fixture logins',()=>{
 const sql=buildSetup(m,s.migration,s.privacy);
 for(const statement of splitSql(s.migration).slice(2,-1))assert.ok(sql.includes(statement));
 assert.match(sql,/insert into auth.users\(id,email\)/);
 assert.doesNotMatch(sql,/insert into auth.identities|insert into auth.sessions|encrypted_password\s*=|email_confirmed_at\s*=|invite|password\s*:/i);
 assert.match(sql,/revoke all on vb_private.brand_map_race_runs from public,anon,authenticated,service_role/);
 assert.match(sql,/vb_save_uspto_mark\(uuid,uuid,timestamptz,jsonb\)/);
 assert.match(sql,/drop function pg_temp.brand_map_preservation_snapshot\(\);\nselect jsonb_build_object/);
 assert.equal(splitSql(sql).map(code).at(-1),'commit;');
});

test('rehearsal is read-only and releases only after matching intended blockers',()=>{
 for(const sql of Object.values(buildGateRehearsal(m))){assert.equal(splitSql(sql).map(code)[0],'begin read only;');assert.doesNotMatch(sql,/insert into|update public|delete from|create (function|table)|alter |pg_sleep\(15\)/i);assert.match(sql,/pg_advisory_xact_lock|pg_try_advisory_xact_lock/);}
 const ctl=buildGateRehearsal(m).controller;assert.match(ctl,/pg_blocking_pids\(w\)=array\[pg_backend_pid\(\)\] and pg_blocking_pids\(l\)=array\[w\]/);assert.match(ctl,/interval '20 seconds'/);
 assert.equal(verifyGateReports(m,gateReports()),true);
 for(const change of [r=>r.loser.pid=102,r=>r.controller.loser_blocked_by=999,r=>r.winner.status='UNRUN',r=>r.winner.token='secret',r=>r.controller.run_id=manifest().run_id,r=>r.extra=true]){const r=gateReports();change(r);assert.throws(()=>verifyGateReports(m,r));}
});

test('12 cases have correct isolation, narrowly caught errors and real-lock coordination',()=>{
 assert.deepEqual(m.cases.map(c=>c.expected_code),['22023','40001','42501','40001','40001','00000','40001','40001','40001','40001','40001','00000']);
 for(const c of m.cases){const r=buildRace(m,c);assert.match(r.winner,new RegExp('begin isolation level '+c.isolation));assert.match(r.loser,new RegExp('begin isolation level '+c.isolation));assert.match(r.controller,/pg_blocking_pids\(l\)=array\[w\]/);assert.match(r.controller,/not granted/);assert.match(r.loser,/initial_read_succeeded/);assert.match(r.loser,/read_result->>'client_id' is distinct from/);assert.ok(r.loser.indexOf('read_result:=')<r.loser.indexOf('execute '));assert.doesNotMatch(r.loser,/when others/i);if(c.expected_code!=='00000'){assert.match(r.loser,new RegExp("exception when sqlstate '"+c.expected_code+"'"));assert.equal(splitSql(r.loser).map(code).at(-1),'rollback;');}else assert.equal(splitSql(r.loser).map(code).at(-1),'commit;');if(c.scenario==='membership-revocation')assert.ok(r.controller.indexOf('update vb_private.client_memberships')>r.controller.indexOf('then exit'));}
});

test('report verifier rejects incomplete snapshots, unrelated blockers and unexpected success',()=>{
 const c=m.cases[0];assert.equal(verifyCaseReports(m,c,caseReports(c)).loser.sqlstate,'22023');
 for(const change of [r=>delete r.loser.initial_read_succeeded,r=>r.loser.initial_read_succeeded=false,r=>r.loser.sqlstate='00000',r=>r.loser.isolation='serializable',r=>r.controller.loser_blocked_by=999,r=>r.winner.action_performed=false,r=>r.loser.pid=r.winner.pid,r=>r.winner.controller_gate_released=false,r=>r.controller.revocation_before_gate_release=true,r=>r.loser.case_id='other',r=>r.extra=true,r=>r.winner.extra=true]){const r=caseReports(c);change(r);assert.throws(()=>verifyCaseReports(m,c,r));}
});

test('independent verification requires committed controller proof and actual saved state',()=>{
 for(const c of m.cases){const sql=buildVerification(m,c,caseReports(c),enabled);assert.match(sql,/saved is distinct from r->'controller'/);assert.match(sql,/Race state assertion failed/);assert.match(sql,/Participants have not ended their transactions/);assert.match(sql,/state_assertion',true/);if(c.scenario==='membership-revocation')assert.match(sql,/set active=true/);}
 const sql=buildVerification(m,m.cases[0],null);assert.match(sql,/Full validated participant reports required/);
});

test('preservation normalizes only run-added nullable date fields and keeps bounded scoped digests',()=>{
 const sql=buildCleanup(m,s.migration,s.privacy);
 assert.match(sql,/snapshot_ignored_dates',\(r->'added_dates'\)::text,true/);
 assert.match(sql,/not ignored <@ array\['filing_date','registration_date','uspto_status_date'\]/);
 assert.match(sql,/when relation.nspname='public' and relation.relname='vb_marks'/);
 assert.match(sql,/row_count>10000 or bytes>16777216/);
 assert.match(sql,/string_agg\(%s::text,E''\\n'' order by %s::text\)/);
 assert.match(sql,/from %I.%I t where %s',row_sql,row_sql/);
 assert.match(buildSetup(m,s.migration,s.privacy),/snapshot_ignored_dates','\[\]',true/);
});

test('cleanup refuses shared ownership and preserves unrelated objects within one transaction',()=>{
 const sql=buildCleanup(m,s.migration,s.privacy),stmts=splitSql(sql).map(code);
 assert.equal(stmts[0],'begin isolation level read committed;');assert.equal(stmts.at(-1),'commit;');
 for(const message of ['Unowned records use the new Brand Map tables','Foreign fixture references','Other feature records depend','SQL-only fixture became an actual Auth account','Preexisting records changed','Preservation check failed'])assert.ok(sql.includes(message));
 assert.match(sql,/auth.identities/);assert.match(sql,/auth.sessions/);assert.match(sql,/Manifest table contains another run/);
 for(const deletion of stmts.filter(x=>x.startsWith('delete from')))assert.match(deletion,/\bwhere\b/);
 assert.equal(stmts.filter(x=>x.startsWith('drop table')).length,4);
 assert.equal(stmts.filter(x=>x.startsWith('drop function')).length,11);
 assert.doesNotMatch(sql,/\bcascade\b|truncate|drop extension|create extension|setval\(/i);
 assert.match(sql,/drop column %I/);assert.match(sql,/for col in select jsonb_array_elements_text\(current_setting\('vb_brand_map.cleanup_manifest'\)::jsonb->'added_dates'\)/);
 assert.match(sql,/drop function pg_temp.brand_map_preservation_snapshot\(\);\ncommit;/);
});

function completed(){const cases=m.cases.map(c=>({status:'CASE_PASS',run_id:m.run_id,case_id:c.id,postcondition_verified:true}));const cleanup={status:'CLEANUP_VERIFIED',run_id:m.run_id,preexisting_rows_and_rules_preserved:true,audit_sequence_gaps_possible:true,completed_cases:Object.fromEntries(m.cases.map(c=>[c.id,{reports:caseReports(c),state_assertion:true}]))};const before={operator_expected_project:TEST_PROJECT,database_name:'postgres',executor_role:'postgres',database_identity:enabled.databaseIdentity,schema_digest:enabled.schemaDigest,prerequisite_state:{extensions:[]}};const after={project_expected:TEST_PROJECT,database_identity:before.database_identity,schema_digest:before.schema_digest,extension_state:[],manifest_absent:true,owned_functions_absent:true,owned_tables_absent:true,...Object.fromEntries(['users','clients','marks','memberships','staff','preferences','audit_rows','active_run_connections'].map(k=>['remaining_'+k,0]))};return {cases,cleanup,before,after};}
test('full-run evidence rejects partial coverage, duplicate cases and any leftovers',()=>{
 const x=completed();assert.equal(verifyCompletedRun(m,x.cases,x.cleanup,x.after,x.before).simultaneous_edit_cases,12);
 for(const change of [x=>x.cases.pop(),x=>x.cases[1]=x.cases[0],x=>x.cases[0].postcondition_verified=false,x=>delete x.cleanup.completed_cases[m.cases[0].id],x=>x.cleanup.completed_cases[m.cases[0].id].reports.loser.sqlstate='00000',x=>x.after.remaining_users=1,x=>x.after.schema_digest='b'.repeat(64),x=>x.after.database_identity='9999999999999999999',x=>x.after.extension_state=[{extname:'changed'}],x=>x.cleanup.status='UNRUN',x=>x.before.operator_expected_project='omvkwiosonatswocbdgx']){const x=completed();change(x);assert.throws(()=>verifyCompletedRun(m,x.cases,x.cleanup,x.after,x.before));}
});

test('preflight and postcheck are read-only with target and complete leftover checks',()=>{
 for(const sql of [racePreflightSql(),postcheck(m)])assert.ok(splitSql(sql).map(code).every(s=>/^(begin read only|set local|select|rollback)\b/i.test(s)));
 assert.match(racePreflightSql(),/uspto_save_available/);assert.match(racePreflightSql(),/auth_fixture_columns_available/);
 assert.match(postcheck(m),/remaining_active_run_connections/);assert.match(postcheck(m),/remaining_audit_rows/);
});

test('prepared bundle hashes and namespaces match; CLI cannot accept activation flags',async()=>{
 const root=new URL('./prepared/',import.meta.url),meta=JSON.parse(await readFile(new URL('source-manifest.json',root),'utf8')),fixture=JSON.parse(await readFile(new URL('fixture-manifest.json',root),'utf8'));
 validateManifest(fixture);assert.equal(meta.run_id,fixture.run_id);assert.equal(meta.database_runs,0);assert.equal(meta.actual_login_runs,0);
 for(const [file,hash] of Object.entries(meta.file_hashes)){const sql=await readFile(new URL(file,root),'utf8');assert.equal(digest(sql),hash);splitSql(sql);if(file.includes('.BLOCKED.'))assert.match(sql,/if false is not true/);}
 assert.equal(Object.keys(meta.file_hashes).length,55);
 const result=spawnSync(process.execPath,[new URL('./package.mjs',import.meta.url).pathname,'--approved'],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/accepts no enabling or credential arguments/);
});

test('temporary USPTO prerequisite requires separate approval and exact source, without upstream index',()=>{
 assert.throws(()=>buildSetup(m,s.migration,s.privacy,{...enabled,usptoSource:s.usptoSource}));
 assert.throws(()=>buildSetup(m,s.migration,s.privacy,{...enabled,temporaryUsptoApproved:true,usptoSource:s.usptoSource+'\n'}));
 const sql=buildSetup(m,s.migration,s.privacy,{...enabled,temporaryUsptoApproved:true,usptoSource:s.usptoSource});
 for(const stmt of splitSql(s.usptoSource))assert.ok(sql.includes(stmt));
 assert.match(sql,/USPTO prerequisite already exists: do not replace or claim it/);
 assert.match(sql,/'temporary_uspto',true,'uspto_source_hash','c4b3160d01eb56aaacceab3b6dabcc5af32d3f150b7b31bcd4cd70f5deed641d'/);
 assert.doesNotMatch(sql,/create unique index vb_marks_client_application_unique|create or replace function/i);
 assert.ok(sql.indexOf('baseline_schema')<sql.indexOf('create function public.vb_save_uspto_mark'));
 assert.ok(sql.indexOf('end $bm_dates$;')<sql.indexOf('create function public.vb_save_uspto_mark'));
 assert.match(s.usptoSource,/security invoker/);assert.match(s.usptoSource,/Staff MFA required/);
});

test('cleanup removes only the owned prerequisite and confirms original availability',()=>{
 const sql=buildCleanup(m,s.migration,s.privacy);
 assert.match(sql,/if r->>'temporary_uspto'='true' then/);
 assert.match(sql,/USPTO prerequisite ownership changed/);
 assert.ok(sql.indexOf('Preexisting records changed')<sql.indexOf("execute 'drop function public.vb_save_uspto_mark"));
 assert.ok(sql.indexOf("execute 'drop function public.vb_save_uspto_mark")<sql.indexOf('end $bm_remove_dates$;'));
 const x=completed();x.before.race_prerequisites={uspto_save_available:false};x.after.uspto_save_available=false;
 assert.equal(verifyCompletedRun(m,x.cases,x.cleanup,x.after,x.before).status,'PASS');
 x.after.uspto_save_available=true;assert.throws(()=>verifyCompletedRun(m,x.cases,x.cleanup,x.after,x.before));
 assert.match(postcheck(m),/'uspto_save_available'/);
});
