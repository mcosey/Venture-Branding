import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../supabase/proposals/evidence-policy-correction/',import.meta.url);
const original=await readFile(new URL('01-prepared-apply.sql',base),'utf8');
const rehearsal=await readFile(new URL('02-main-rollback-rehearsal.sql',base),'utf8');
const uncommented=rehearsal.replace(/--[^\n]*/g,'');
const core=original.replace(/^begin;\n/m,'').replace(/^commit;\n?$/m,'');

test('hosted rehearsal reuses the exact guarded correction without its commit',()=>{
 const start='-- BEGIN EXACT REVIEWED CORRECTION BODY (only outer BEGIN/COMMIT removed)\n';
 const ending="set local lock_timeout='1s';\nset local statement_timeout='10s';\n-- END EXACT REVIEWED CORRECTION BODY";
 assert.equal(rehearsal.split(start)[1].split(ending)[0],core);
 assert.equal((uncommented.match(/alter policy /gi)||[]).length,1);
 assert.match(uncommented,/^begin;/m);
 assert.match(uncommented,/rollback;\s*$/);
 assert.doesNotMatch(uncommented,/\bcommit\s*;/i);
});

test('main-only guard runs before locks or temporary objects',()=>{
 const guard=rehearsal.indexOf('7690937621030482216');
 assert.ok(guard>0&&guard<rehearsal.indexOf('lock table public.vb_evidence'));
 assert.match(rehearsal,/current_database\(\)<>'postgres' or current_user<>'postgres'/);
 assert.match(rehearsal,/set local lock_timeout='1s'/);
 assert.match(rehearsal,/set local statement_timeout='10s'/);
});

test('no persistent fixture data, grants, helper replacements or file writes',()=>{
 assert.deepEqual(uncommented.match(/\b(?:insert into|update|delete from|truncate|grant|revoke|create(?: or replace)? function|create (?:temporary )?table)\s+[^\n]+/gi),[
  'create temporary table vb_evidence_rehearsal_baseline(value jsonb) on commit drop;',
  'create function pg_temp.vb_evidence_rehearsal_snapshot() returns jsonb',
  'insert into pg_temp.vb_evidence_rehearsal_baseline values(pg_temp.vb_evidence_rehearsal_snapshot());'
 ]);
 assert.doesNotMatch(uncommented,/disable (?:row level security|trigger)|session_replication_role|pg_net|http_post|cron\.|create role|create user|copy\s/i);
});

test('preservation checks retain policy identity and compare sensitive data only internally',()=>{
 for(const key of ['policies','tables','columns','helpers','constraints','triggers','bucket','evidence','marks'])
  assert.ok(rehearsal.includes("'"+key+"'"),key);
 assert.match(rehearsal,/jsonb_build_object\('oid',p\.oid,'relation',p\.polrelid/);
 assert.match(rehearsal,/md5\(coalesce\(jsonb_agg\(to_jsonb\(e\) order by e\.id\)::text/);
 assert.match(rehearsal,/after_state is distinct from before_state/);
 assert.match(rehearsal,/rollback to savepoint evidence_correction;[\s\S]+vb_evidence_rehearsal_snapshot\(\) is distinct from/);
 const output=rehearsal.slice(rehearsal.lastIndexOf('select jsonb_build_object('));
 assert.doesNotMatch(output,/fingerprint|to_jsonb|value from|user_id|object_path|filename/i);
});

test('managed private Storage and reviewed helpers must match before changing the policy',()=>{
 assert.match(rehearsal,/cc0a360d447c0bec98d1d5cf1549648d/);
 assert.match(rehearsal,/file_size_limit=10485760/);
 assert.match(rehearsal,/allowed_mime_types=array\['image\/png','image\/jpeg'\]/);
 const helpers=rehearsal.split('for h in select * from (values')[1].split('v(signature,hash)')[0];
 assert.equal((helpers.match(/'[a-f0-9]{32}'\)/g)||[]).length,7);
 assert.match(rehearsal,/has_any_column_privilege\('authenticated','public.vb_evidence','INSERT,UPDATE'\)/);
});

test('unaffiliated role probe refuses a real mapped identity and restores the executor',()=>{
 assert.match(rehearsal,/exists\(select 1 from auth.users where id=probe\)/);
 assert.match(rehearsal,/exists\(select 1 from vb_private.client_memberships where user_id=probe\)/);
 assert.match(rehearsal,/exists\(select 1 from vb_private.staff_members where user_id=probe\)/);
 assert.match(rehearsal,/auth.uid\(\) is distinct from probe/);
 assert.match(rehearsal,/execute 'set local role authenticated'/);
 assert.match(rehearsal,/visible_rows<>0 or visible_files<>0/);
 assert.match(rehearsal,/exception when others then\s+execute 'reset role';\s+raise;/);
});
