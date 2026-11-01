import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {savedMilestones} from '../free/assets/llk-data.mjs';

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
 assert.deepEqual(ids.sort(),savedMilestones.map(m=>m.id).sort());
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
