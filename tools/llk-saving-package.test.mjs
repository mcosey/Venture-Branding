import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {storedMilestones} from '../free/assets/llk-data.mjs';
import {taxMilestone} from '../free/assets/llk-obligations.mjs';

test('the saving proposal changes only the reviewed function milestone allowlist',async()=>{
 const read=name=>readFile(new URL('../supabase/proposals/'+name,import.meta.url),'utf8');
 const original=await read('portal-membership/07-test-progress.sql');
 const sql=await read('llk-saved-milestones/01-apply.sql');
 const baseline=JSON.parse(await read('llk-saved-milestones/function-baselines.json'));
 const body=original.split('as $$')[1].split('$$;')[0];
 const old=sql.split('$old$')[1],updated=sql.split('$new$')[1];
 assert.equal(createHash('md5').update(body).digest('hex'),baseline.baseline_body_md5);
 assert.equal(body.split(old).length,2);
 assert.equal(createHash('md5').update(body.replace(old,updated)).digest('hex'),baseline.updated_body_md5);
 const ids=[...updated.matchAll(/'([a-z-]+)'/g)].map(m=>m[1]);
 // This historical receipt retains Vibe Coding's former permission. The UI
 // no longer registers that reading guide for saving; no live permission changes are needed.
 for(const id of ids)assert.ok(id==='considerations'||storedMilestones.some(m=>m.id===id));
 assert.ok(sql.includes(baseline.baseline_body_md5));assert.ok(sql.includes(baseline.updated_body_md5));
 const update=sql.split('do $update$')[1].split('end $update$;')[0];
 assert.match(update,/execute replace\(definition,\$old\$/);
 assert.doesNotMatch(update,/grant |revoke |create policy |alter table /i);
 assert.match(sql,/rollback to savepoint llk_fixtures;/);
 assert.match(sql,/pg_temp\.llk_snapshot\(\) is distinct from \(select value from llk_before\)/);
 const expected=Number(sql.match(/count\(\*\) from llk_results\)<>(\d+)/)[1]);
 assert.equal(expected,(sql.match(/select pg_temp\.llk_(?:check|denied)\(/g)||[]).length);
 assert.equal(expected,20);
});

test('the Tax saving proposal adds only its checklist to the existing reviewed save function',async()=>{
 const read=name=>readFile(new URL('../supabase/proposals/'+name,import.meta.url),'utf8');
 const original=await read('portal-membership/07-test-progress.sql');
 const previous=await read('llk-saved-milestones/01-apply.sql');
 const sql=await read('llk-tax-progress/01-apply.sql');
 const baseline=JSON.parse(await read('llk-tax-progress/function-baselines.json'));
 const hash=s=>createHash('md5').update(s).digest('hex');
 const installed=original.split('as $$')[1].split('$$;')[0].replace(previous.split('$old$')[1],previous.split('$new$')[1]);
 assert.equal(hash(installed),baseline.baseline_body_md5);
 const old=sql.split('$old$')[1],updated=sql.split('$new$')[1];
 assert.equal(installed.split(old).length,2);
 assert.equal(hash(installed.replace(old,updated)),baseline.updated_body_md5);
 const ids=[...updated.matchAll(/'([a-z-]+)'/g)].map(m=>m[1]);
 assert.deepEqual(ids.sort(),[...new Set([...storedMilestones.map(m=>m.id),'considerations',taxMilestone.id])].sort());
 const oldIds=[...old.matchAll(/'([a-z-]+)'/g)].map(m=>m[1]);
 assert.deepEqual(ids.filter(id=>!oldIds.includes(id)),['ongoing-tax']);
 assert.match(sql,/rollback to savepoint llk_fixtures;/);
 assert.match(sql,/pg_temp\.llk_snapshot\(\) is distinct from \(select value from llk_before\)/);
 assert.equal((sql.match(/select pg_temp\.llk_(?:check|denied)\(/g)||[]).length,20);
 assert.match(sql,/milestone_id='ongoing-tax'/);
 assert.doesNotMatch(sql.split('do $update$')[1].split('end $update$;')[0],/grant |revoke |create policy |alter table /i);
});
