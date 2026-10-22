// Optional, isolated SQL checks. Use an ALREADY INSTALLED PGlite; install nothing.
// cron tables/functions below are local scheduler doubles, NOT a real pg_cron.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
if(!process.env.PGLITE_MODULE)throw Error('Set PGLITE_MODULE to an existing runtime. Do not install software.');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const directory=new URL('../supabase/proposals/scheduler-log-retention/',import.meta.url);
const read=name=>readFile(new URL(name,directory),'utf8');
const [originalPreflight,originalInstall,originalStop]=await Promise.all([
 read('01-readonly-preflight.sql'),read('02-prepared-schedule.sql'),read('03-prepared-stop.sql')]);
const canonical=originalInstall.match(/\$cleanup_command\$([\s\S]*?)\$cleanup_command\$/)[1];
const md5=s=>createHash('md5').update(s).digest('hex');
const checks=[];
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks.push(label);};
const db=new PGlite();
try{
 const identity=(await db.query('select system_identifier::text as id from pg_control_system()')).rows[0].id;
 const adapt=sql=>sql.replaceAll('7690937621030482216',identity);
 const command=adapt(canonical),inner=command;
 const preflight=adapt(originalPreflight),install=adapt(originalInstall);
 const stop=id=>adapt(originalStop).replace('__REVIEWED_INSTALL_JOB_ID__',String(id))
  .replace(md5(canonical),md5(command));
 await db.exec(`
 create schema cron;
 create role authenticated;
 create table cron.job(jobid bigint generated always as identity primary key,
  schedule text not null,command text not null,nodename text not null default 'localhost',
  nodeport integer not null default 5432,database text not null default current_database(),
  username text not null default current_user,active boolean not null default true,jobname text,
  unique(jobname,username));
 create table cron.job_run_details(runid bigint primary key,jobid bigint,status text,
  start_time timestamptz,end_time timestamptz);
 -- Metadata fixture only; no extension binary or scheduler is installed.
 insert into pg_extension(oid,extname,extowner,extnamespace,extrelocatable,extversion)
 values(990001,'pg_cron',(select oid from pg_roles where rolname=current_user),'cron'::regnamespace,false,'LOCAL-DOUBLE');
 set cron.timezone='GMT';set cron.log_run='on';
 create table public.business_sentinel(id integer primary key,value text);
 insert into public.business_sentinel values(1,'private business content preserved');
 create function cron.schedule(text,text,text) returns bigint language plpgsql as $$
 declare result bigint;fault text:=current_setting('vb_fixture.schedule_fault',true);
 begin
  insert into cron.job(jobname,schedule,command) values($1,$2,$3)
  on conflict(jobname,username) do update set schedule=excluded.schedule,command=excluded.command
  returning jobid into result;
  if fault='remote' then update cron.job set nodename='elsewhere.invalid' where jobid=result;
  elsif fault='command' then update cron.job set command=command||'-- changed' where jobid=result;
  elsif fault='active' then update cron.job set active=false where jobid=result;
  elsif fault='database' then update cron.job set database='other_database' where jobid=result;
  end if;
  return result;
 end;$$;
 create function cron.unschedule(bigint) returns boolean language plpgsql as $$
 declare removed integer;
 begin
  delete from cron.job where jobid=$1 and username=current_user;
  get diagnostics removed=row_count;
  if current_setting('vb_fixture.stop_fault',true)='false_result' then return false; end if;
  return removed=1;
 end;$$;
 insert into cron.job(jobname,schedule,command) values('existing-digest','*/5 * * * *','select 1;');
 `);
 const snapshot=async()=>({jobs:(await db.query('select * from cron.job order by jobid')).rows,
  history:(await db.query('select * from cron.job_run_details order by runid')).rows,
  business:(await db.query('select * from public.business_sentinel')).rows});
 // Each guarded full transaction must end or roll back before the next case.
 const reject=async(sql,pattern,label)=>{
  const before=await snapshot();let error;
  try{await db.exec(sql);}catch(e){error=e;await db.exec('rollback;');}
  assert.ok(error&&pattern.test(error.message),label+': '+(error?.message||'unexpected success'));
  equal(await snapshot(),before,label+'; existing rows preserved');
 };
 const rejectMutation=async(setup,sql,pattern,label)=>{
  const before=await snapshot();await db.exec('begin;'+setup);let error;
  try{await db.exec(sql);}catch(e){error=e;}
  await db.exec('rollback;');
  assert.ok(error&&pattern.test(error.message),label+': '+(error?.message||'unexpected success'));
  equal(await snapshot(),before,label+'; fixture rollback preserved baseline');
 };
 // Identity is not disabled: unadapted Production source must reject this database.
 await reject(originalInstall,/Expected main Venture Branding/,'Wrong database identity rejected');
 const beforePreflight=await snapshot();await db.exec(preflight);
 equal(await snapshot(),beforePreflight,'Read-only preflight preserves all fixture rows');
 for(const [setup,pattern,label]of [
  ["set cron.timezone='America/Chicago';",/timezone/,'Non-UTC scheduler timezone rejected'],
  ["set cron.log_run='off';",/run logging/,'Disabled run logging rejected'],
  ["delete from pg_extension where extname='pg_cron';",/Existing pg_cron/,'Missing scheduler extension metadata rejected'],
  ["set local role authenticated;",/Expected main Venture Branding|permission denied/,'Wrong operator role rejected'],
  ["insert into cron.job(jobname,schedule,command) values('vb-ops-cron-history-retention-30d','* * * * *','select 2');",/already exists/,'Same-name job not overwritten'],
  ["insert into cron.job(jobname,schedule,command) values('other-cleanup','* * * * *','delete from cron.job_run_details');",/competing/,'Explicit competing history command rejected'],
  ["insert into cron.job(jobname,schedule,command) values('job-run-details-cleanup','* * * * *','select 2');",/competing/,'Known competing cleanup name rejected']
 ])await rejectMutation(setup,install.replace(/^BEGIN ISOLATION LEVEL SERIALIZABLE;$/m,''),pattern,label);
 for(const fault of ['remote','command','active','database']){
  await db.exec(`set vb_fixture.schedule_fault='${fault}';`);
  await reject(install,/metadata mismatch/,'Unexpected scheduled '+fault+' metadata rejected');
 }
 await db.exec("set vb_fixture.schedule_fault='';");
 await db.exec(`insert into cron.job_run_details values(9000,1,'succeeded',now()-interval '40 days',now()-interval '31 days');`);
 const beforeInstall=await snapshot();await db.exec(install);
 const installed=(await db.query("select jobid,command from cron.job where jobname='vb-ops-cron-history-retention-30d'")).rows[0];
 assert.ok(installed);checks.push('Native schedule double records one intended job');
 equal(installed.command,command,'Scheduled command equals the single maintained command');
 const afterInstall=await snapshot();
 equal(afterInstall.history,beforeInstall.history,'Installation schedules without deleting even eligible history');
 equal(afterInstall.business,beforeInstall.business,'Installation leaves business data unchanged');
 equal(afterInstall.jobs.filter(j=>j.jobid!==installed.jobid),beforeInstall.jobs,'Installation preserves existing jobs');
 await reject(install,/already exists/,'Repeat installation refuses to upsert');
 await db.exec('delete from cron.job_run_details;');
 await db.exec(`begin;
 insert into cron.job_run_details(runid,status,start_time,end_time) values
 (1,'succeeded',now()-interval '40 days',now()-interval '31 days'),
 (2,'failed',now()-interval '40 days',now()-interval '31 days'),
 (3,'succeeded',now()-interval '40 days',now()-interval '30 days'),
 (4,'failed',now()-interval '40 days',now()-interval '29 days'),
 (5,'running',now()-interval '40 days',now()-interval '31 days'),
 (6,'succeeded',now()-interval '40 days',null),
 (7,'failed',now()-interval '40 days',null),
 (8,'unknown-terminal',now()-interval '40 days',now()-interval '31 days'),
 (9,'succeeded',now(),now()+interval '1 day'),
 (10,null,now()-interval '40 days',now()-interval '31 days'),
 (11,'succeeded',now()-interval '40 days',now()-interval '30 days 0.000001 seconds'),
 (12,'succeeded',now()-interval '40 days',now());`);
 const sentinel=(await snapshot()).business;
 await db.exec(inner);
 equal((await db.query("select mode from pg_locks where relation='cron.job_run_details'::regclass and mode='RowExclusiveLock' and granted")).rows.length,1,'History table lock held through validation and delete');
 equal((await db.query('select runid from cron.job_run_details order by runid')).rows.map(r=>r.runid),
  [3,4,5,6,7,8,9,10,12],'Strict cutoff, terminal statuses and null/recent/future/unknown preservation');
 equal((await snapshot()).business,sentinel,'Cleanup leaves business sentinel untouched');
 await db.exec('rollback;');
 await db.exec(`insert into cron.job_run_details select n,1,'succeeded',now()-interval '40 days',now()-interval '31 days' from generate_series(1,5003) n;`);
 await db.exec(installed.command);
 equal((await db.query('select runid from cron.job_run_details order by runid')).rows.map(r=>r.runid),[5001,5002,5003],'Full native command commits at most 5000 oldest eligible rows');
 await db.exec('delete from cron.job_run_details;');
 const innerWithoutTransactions=inner;
 for(const [setup,pattern,label]of [
  ["create function public.fixture_delete_trigger() returns trigger language plpgsql as $$begin raise exception 'Should never execute';end;$$;create trigger fixture_delete before delete on cron.job_run_details for each row execute function public.fixture_delete_trigger();",/Unexpected history trigger/,'User delete trigger prevents cleanup'],
  ["create table public.fixture_dependency(id bigint references cron.job_run_details(runid) on delete cascade);",/dependent foreign key/,'Dependent foreign key prevents collateral deletion'],
  ["create rule fixture_delete_rule as on delete to cron.job_run_details do also insert into public.business_sentinel values(2,'unwanted');",/Unexpected history trigger/,'Delete rule prevents collateral mutation'],
  ["alter table cron.job_run_details drop constraint job_run_details_pkey;",/Unexpected cron history shape/,'Missing primary key rejected'],
  ["alter table cron.job_run_details alter column end_time type timestamp using end_time::timestamp;",/Unexpected cron history shape/,'Changed timestamp type rejected']
 ])await rejectMutation(setup,innerWithoutTransactions,pattern,label);
 // A future copied scheduler command cannot execute against a different identity.
 await reject(canonical,/Expected main Venture Branding/,'Unadapted runtime refuses local database');
 await reject(originalStop.replace('__REVIEWED_INSTALL_JOB_ID__',String(installed.jobid)),/Expected main Venture Branding/,'Wrong stop target rejected');
 await reject(stop(installed.jobid+1000),/differs from reviewed receipt/,'Wrong receipt ID cannot stop a job');
 for(const [mutation,label]of [
  ["command=command||'-- altered'",'Changed command'],["schedule='0 0 * * *'",'Changed schedule'],
  ["database='elsewhere'",'Changed job database'],["nodename='elsewhere.invalid'",'Changed remote host'],
  ["username='other_operator'",'Changed execution owner']
 ])await rejectMutation(`update cron.job set ${mutation} where jobid=${installed.jobid};`,
  stop(installed.jobid).replace(/^BEGIN ISOLATION LEVEL SERIALIZABLE;$/m,''),/differs from reviewed receipt/,label+' prevents stopping');
 await db.exec("set vb_fixture.stop_fault='false_result';");
 await reject(stop(installed.jobid),/Unable to verify/,'Failed unschedule acknowledgment rolls deletion back');
 await db.exec("set vb_fixture.stop_fault='';");
 // Stopping an already paused but otherwise identical owned job is allowed.
 await db.exec(`update cron.job set active=false where jobid=${installed.jobid};`);
 const beforeStop=await snapshot();await db.exec(stop(installed.jobid));
 const afterStop=await snapshot();
 equal(afterStop.jobs,beforeInstall.jobs,'Stop removes only the receipt-bound owned job');
 equal(afterStop.history,beforeStop.history,'Stop does not remove any history');
 equal(afterStop.business,beforeStop.business,'Stop preserves business records');
 await reject(stop(installed.jobid),/differs from reviewed receipt/,'Repeated stop fails safely');
 await db.exec(install);const replacement=(await db.query("select jobid from cron.job where jobname='vb-ops-cron-history-retention-30d'")).rows[0].jobid;
 assert.notEqual(replacement,installed.jobid);checks.push('Reinstallation has a new receipt identity');
 await reject(stop(installed.jobid),/differs from reviewed receipt/,'Old receipt cannot stop a later identical installation');
 await db.exec(stop(replacement));
 equal((await snapshot()).jobs,beforeInstall.jobs,'Final isolated fixture has only original jobs');
 console.log(JSON.stringify({status:'passed',checks:checks.length,assertions:checks,
  runtime_identity:identity,
  limits:['Already installed PGlite, not hosted Supabase or native pg_cron.',
   'Only historical cluster pin and corresponding stop-command digest adapted in memory.',
   'Local scheduler tables/functions and extension metadata are explicit doubles.',
   'No wall-clock scheduling, independent-session races, SKIP LOCKED contention or hosted-role behavior certified.',
   'No network, accounts, deployment, real job installation or data deletion.']},null,2));
}finally{await db.close();}
