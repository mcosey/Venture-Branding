// Sequential package preflight only. This does NOT emulate independent sessions.
// Invoked with the isolated local harness; never connects to hosted Supabase.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../supabase/proposals/watch-concurrency/',import.meta.url);
export async function verifyPreparedConcurrency(db){
 const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 const read=name=>readFile(new URL(name,root),'utf8');
 const local=sql=>sql.replace(/-- BEGIN HOSTED GUARDS[^]*?-- END HOSTED GUARDS/,'-- Local bootstrap omits hosted identity/fingerprint checks.');
 // The compatibility harness has no scheduler infrastructure. Model only its
 // disabled readiness row for this setup assertion, never a callable scheduler.
 await db.exec('create table vb_private.bcm_scheduler_config(singleton boolean primary key,ready boolean);insert into vb_private.bcm_scheduler_config values(true,false);');
 await db.exec('update vb_private.watch_config set enabled=true;'); // Model the observed enabled Test Watch flag locally.
 const preserved=['public.vb_clients','public.vb_marks','public.vb_engagements','public.vb_matters','public.vb_service_preferences','vb_private.engagement_grants','vb_private.engagement_services','vb_private.legacy_test_mappings','vb_private.legacy_test_record_scopes','vb_private.portal_service_bindings','vb_private.audit_events','vb_private.portal_lifecycle_events','vb_private.watch_scope_settings','vb_private.watch_settings','vb_private.watch_runs','vb_private.watch_findings','vb_private.watch_review_history','vb_private.watch_files','vb_private.watch_applications'];
 const hashes=async()=>Promise.all(preserved.map(async t=>(await db.query(`select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) h from ${t} r`)).rows[0].h));
 const baseline=await hashes();
 await db.exec(local(await read('01-setup.sql')));
 let guardedB=0,sequentialCases=0;
 for(const c of manifest.cases){
  const prefix=String(c.n+1).padStart(2,'0')+'-'+c.name;
  // A B-script run on its own must fail closed rather than claim overlap.
  try{await db.exec(local(await read(prefix+'-B.sql')));throw Error('B script accepted missing Session A gate');}
  catch(error){if(!error.message.includes('Session A must still hold the overlap gate'))throw error;guardedB++;await db.exec('rollback;');}
  const j=c.n===3?1:0;
  const before=(await db.query('select id,version from vb_private.watch_scope_settings where engagement_id=$1',[c.scopes[j].eid])).rows[0];
  await db.exec(local(await read(prefix+'-A.sql')).replace('select pg_sleep(18);','-- Sequential preflight: no sleep.'));
  let b=local(await read(prefix+'-B.sql'));
  // Skip overlap/timing assertions only in this clearly labeled sequential
  // parse/fixture test. Hosted scripts remain unchanged and require real gates.
  b=b.replace(/select pg_temp\.race_assert\(not pg_try_advisory_xact_lock[^]*?(?=create temporary table race_request|set local role authenticated;|-- Only the locked fixture|-- Simulate captured old SQL)/,
   "create temporary table race_overlap(started timestamptz,a_pid integer,b_pid integer) on commit drop;insert into race_overlap values(clock_timestamp()-interval '2 seconds',1,2);\n");
  // Keep the competing request's original CAS values: the actual B session
  // captures these while A is uncommitted, not after A's commit as done locally.
  b=b.replace(/select pg_temp\.race_assert\(exists\(select 1 from vb_private\.watch_due_configurations\(\) where engagement_id=[^\n]+\n/,'-- Sequential harness cannot observe an in-flight pre-closure snapshot.\n');
  b=b.replace('s.id cfg,coalesce(s.version,0) ver',`${before?"'"+before.id+"'::uuid":'null::uuid'} cfg,${before?.version||0} ver`);
  await db.exec(b);
  sequentialCases++;
 }
 await db.exec(local(await read('10-verify.sql')));
 await db.exec(local(await read('11-companion-worker-rollback.sql')));
 await db.exec(local(await read('12-cleanup.sql')));
 const left=(await db.query("select count(*) n from public.vb_clients where name like 'DISPOSABLE WATCH RACE%'")).rows[0].n;
 if(Number(left)!==0)throw Error('Local fixture cleanup incomplete');
 if(JSON.stringify(await hashes())!==JSON.stringify(baseline))throw Error('Local preservation mismatch');
 const result={original_table_hashes_preserved:preserved.length,status:'local-sequential-preflight-only',missing_overlap_rejected:guardedB,sequential_case_bodies:sequentialCases,fixture_assertions_passed:true,companion_rollback_passed:true,cleanup_passed:true,independent_session_races:'NOT RUN',limitations:['Hosted system/definition guard not emulated.','Timing/overlap removed only in local harness; B CAS values captured before sequential A.','No proof of independent-session locking or Supabase permissions.']};
 await writeFile(new URL('local-verification.json',root),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}
