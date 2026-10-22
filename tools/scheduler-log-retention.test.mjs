import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../supabase/proposals/scheduler-log-retention/',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');

test('stop receipt authenticates the single maintained cleanup command',async()=>{
 const install=await read('02-prepared-schedule.sql'),stop=await read('03-prepared-stop.sql');
 const body=install.match(/\$cleanup_command\$([\s\S]*?)\$cleanup_command\$/)?.[1];
 assert.ok(body,'Missing canonical native job command');
 const expected=stop.match(/md5\(command\)='([a-f0-9]{32})'/)?.[1];
 assert.equal(createHash('md5').update(body).digest('hex'),expected,'Stop must reject a different job command');
 assert.equal((stop.match(/__REVIEWED_INSTALL_JOB_ID__/g)||[]).length,1);
 assert.match(stop,/jobid=expected_job_id/);
 assert.match(stop,/cron\.unschedule\(expected_job_id\)/);
 assert.doesNotMatch(stop,/cron\.unschedule\('/);
});

test('prepared native schedule retains expiry and privilege boundaries',async()=>{
 const install=await read('02-prepared-schedule.sql'),preflight=await read('01-readonly-preflight.sql');
 const body=install.match(/\$cleanup_command\$([\s\S]*?)\$cleanup_command\$/)[1];
 assert.match(body,/LIMIT 5000\s+FOR UPDATE SKIP LOCKED/);
 assert.doesNotMatch(body,/^(?:BEGIN|COMMIT|ROLLBACK);$/m,'Native cron background workers reject transaction control');
 assert.equal((body.match(/interval '30 days'/g)||[]).length,2,'Recheck eligibility at delete');
 assert.match(body,/d\.status IN \('succeeded','failed'\)/);
 assert.match(body,/d\.end_time IS NOT NULL/);
 assert.match(body,/DELETE FROM cron\.job_run_details d USING eligible e/);
 assert.match(body,/pg_trigger/);assert.match(body,/confrelid/);assert.match(body,/pg_rewrite/);
 assert.ok(body.indexOf('LOCK TABLE cron.job_run_details IN ROW EXCLUSIVE MODE')<body.indexOf('from pg_trigger'));
 assert.match(install,/BEGIN ISOLATION LEVEL SERIALIZABLE/);
 assert.match(preflight,/BEGIN READ ONLY/);
 for(const sql of [install,preflight]){
  assert.match(sql,/7690937621030482216/);
  assert.match(sql,/has_table_privilege\(current_user,'cron.job_run_details','SELECT'\)/);
  assert.match(sql,/has_table_privilege\(current_user,'cron.job_run_details','DELETE'\)/);
  assert.doesNotMatch(sql,/\b(?:GRANT|CREATE\s+(?:FUNCTION|TABLE|EXTENSION)|ALTER\s+TABLE)\b/);
 }
 const installerWithoutCommand=install.replace(/\$cleanup_command\$[\s\S]*?\$cleanup_command\$/,'NULL');
 assert.doesNotMatch(installerWithoutCommand,/\bDELETE\s+FROM\b/,'Schedule only, no immediate purge');
});
