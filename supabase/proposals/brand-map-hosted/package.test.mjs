import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRollbackSql, code, digest, loadSources, postcheckSql, preflightSql, splitSql, TEST_PROJECT, verifyDashboardTarget, verifyReport } from './package.mjs';

const [migration, privacy] = await loadSources();
const runId = '84b322ec-3a30-4f82-90b1-b5dca243a61a';
const observedUrl = `https://supabase.com/dashboard/project/${TEST_PROJECT}/sql/new`;
const enabled = {runId,approved:true,observedUrl,databaseIdentity:'1234567890123456789',schemaDigest:'a'.repeat(64),bcmReleaseComplete:true};

test('accepts only the observed BCM Test SQL-editor location', () => {
  assert.equal(verifyDashboardTarget(observedUrl),TEST_PROJECT);
  for (const value of [observedUrl.replace(TEST_PROJECT,'omvkwiosonatswocbdgx'),observedUrl.replace(TEST_PROJECT,'yjhzhflyuxcxugfgspby'),observedUrl.replace('https:','http:'),observedUrl.replace('supabase.com','supabase.com.evil.example'),observedUrl.replace('/sql/new','/settings'),observedUrl+'?host=other',observedUrl+'#fragment',observedUrl.replace('https://','https://secret@'),observedUrl.replace('supabase.com','supabase.com:444')]) assert.throws(()=>verifyDashboardTarget(value));
});

test('SQL splitter preserves bodies, quoted assertion SQL, escapes and nested comments', () => {
  const sample = `-- header ;\nselect 'a;''b';\ncreate function pg_temp.f() returns text language sql as $tag$ select ';'; $tag$;\n/* outer /* inner ; */ outer */ select E'a\\\';b';\nselect "semi;column";`;
  const statements = splitSql(sample);
  assert.equal(statements.length,4);
  assert.match(statements[1],/select ';';/);
  for(const bad of ["select 'unfinished;",'select 1','/* unfinished','select $$missing;']) assert.throws(()=>splitSql(bad));
});

test('read-only preflight does not change schemas, enable extensions or expose source/records', () => {
  const statements = splitSql(preflightSql()).map(code);
  assert.equal(statements[0],'begin read only;');
  assert.equal(statements.at(-1),'rollback;');
  assert.ok(statements.every(s=>/^(begin read only|set local|select|rollback)\b/i.test(s)));
  assert.doesNotMatch(preflightSql(),/create extension|create function|insert into|delete from|select \*/i);
  assert.match(preflightSql(),/system_identifier::text/);
  assert.match(preflightSql(),/missing_columns/);
  assert.match(preflightSql(),/brand_map_collisions/);
});

test('default review copy fails before creating objects and has no committing path', () => {
  const sql=buildRollbackSql(migration,privacy,{runId});
  const statements=splitSql(sql).map(code);
  assert.match(statements[5],/if false is not true/);
  assert.ok(statements[5].includes('__UNVERIFIED_TEST_IDENTITY__'));
  assert.ok(statements.findIndex(s=>s.startsWith('create function'))>5);
  assert.equal(statements.at(-1),'rollback;');
  assert.doesNotMatch(statements.join('\n'),/^commit;/im);
  assert.doesNotMatch(sql,/create extension|drop table|truncate|setval\(/i);
});

test('enabling generation needs the exact target, identity, schema and completed release', () => {
  for(const override of [{observedUrl:observedUrl.replace(TEST_PROJECT,'omvkwiosonatswocbdgx')},{databaseIdentity:'1; drop schema public'},{databaseIdentity:''},{schemaDigest:'wrong'},{bcmReleaseComplete:false}]) assert.throws(()=>buildRollbackSql(migration,privacy,{...enabled,...override}));
  const sql=buildRollbackSql(migration,privacy,enabled);
  assert.match(sql,/if true is not true/);
  assert.match(sql,/Wrong or changed database cluster/);
  assert.match(sql,/Test schema changed after preflight/);
  assert.match(sql,/when sqlstate 'VB001'/);
  assert.match(sql,/if sqlerrm<>'Brand Map success rollback sentinel' then raise/);
  assert.doesNotMatch(sql,/when others/i);
});

test('hosted copy retains every original backend statement, scoped fixture checks and test logic', () => {
  const sql=buildRollbackSql(migration,privacy,{runId});
  const sourceStatements=splitSql(migration).slice(2,-1);
  for(const statement of sourceStatements) assert.ok(sql.includes(statement),'Missing backend statement: '+code(statement).slice(0,60));
  assert.match(sql,/84b322ec-.*lpad\(kind::text,4,'0'\)/);
  assert.doesNotMatch(sql,/f000000|brand-map-fixture-/);
  assert.match(sql,/finish\(true\)/);
  assert.match(sql,/for result_line in execute statements\[i\]/);
  assert.match(sql,/planned<>assertions/);
  assert.doesNotMatch(sql,/grant execute on all functions in schema/);
  assert.match(sql,/before_rows is distinct from after_rows or before_schema is distinct from after_schema/);
});

test('report verifier rejects incomplete assertions and exaggerated coverage', () => {
  const report={status:'PASS',project_expected:TEST_PROJECT,assertions:2,tap:['ok 1 - privacy','ok 2 - version','1..2'],synthetic_data_rolled_back:true,draft_schema_rolled_back:true,existing_rows_and_rules_preserved:true,prerequisite_state_restored:true,audit_sequence_gaps_possible:true,concurrency_scenarios_run:0,sign_in_api_checks_run:0};
  assert.equal(verifyReport(report),2);
  for(const override of [{tap:['ok 1 - privacy','1..2']},{tap:['not ok 1 - leak','ok 2 - version','1..2']},{tap:['ok 2 - wrong order','ok 1 - privacy','1..2']},{assertions:3},{project_expected:'omvkwiosonatswocbdgx'},{existing_rows_and_rules_preserved:false},{prerequisite_state_restored:false},{concurrency_scenarios_run:12},{sign_in_api_checks_run:1},{status:'UNRUN'}]) assert.throws(()=>verifyReport({...report,...override}));
});

test('manifest matches generated SQL and untouched local source files', async () => {
  const manifest=JSON.parse(await readFile(new URL('./source-manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.source_hashes['../brand-map/001-brand-assets.sql'],digest(migration));
  assert.equal(manifest.source_hashes['../brand-map/brand-assets.test.sql'],digest(privacy));
  for(const [file,hash] of Object.entries(manifest.file_hashes)) assert.equal(digest(await readFile(new URL('./'+file,import.meta.url),'utf8')),hash);
});

test('postcheck reports exact fixture leftovers without deleting or resetting anything', () => {
  const sql=postcheckSql(runId);
  assert.ok(splitSql(sql).map(code).every(s=>/^(begin read only|set local|select|rollback)\b/i.test(s)));
  assert.match(sql,/remaining_fixture_audit_rows/);
  assert.match(sql,/84b322ec/);
  assert.doesNotMatch(sql,/delete from|drop |truncate|setval\(/i);
  assert.throws(()=>postcheckSql("';delete from auth.users;--"));
});


test('temporary prerequisites need separate approval and stay inside the rollback subtransaction', () => {
  assert.throws(()=>buildRollbackSql(migration,privacy,{temporaryPrerequisitesApproved:true}));
  const sql=buildRollbackSql(migration,privacy,{...enabled,temporaryPrerequisitesApproved:true});
  const outer=splitSql(sql).map(code);
  assert.equal(outer.filter(s=>/^alter table|^create extension/i.test(s)).length,0);
  const run=outer.find(s=>s.startsWith('do $vb_hosted_run$'));
  for(const name of ['filing_date','registration_date','uspto_status_date']) assert.ok(run.includes(`alter table public.vb_marks add column ${name} date;`));
  assert.equal((run.match(/alter table public.vb_marks add column/g)||[]).length,3);
  assert.match(run,/create extension pgtap with schema extensions;/);
  assert.match(sql,/jsonb_array_length/);
  assert.match(sql,/Temporary pgTAP prerequisite state changed/);
  assert.match(sql,/before_prerequisites is distinct from after_prerequisites/);
  assert.match(sql,/'temporary_prerequisites_used',true/);
  assert.doesNotMatch(sql,/if not exists pgtap|drop column|drop extension|commit;|setval\(/i);
});
