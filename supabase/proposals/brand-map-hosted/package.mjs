// PREPARATION ONLY. Generates files; never opens a database or reads credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { checkPgTap } from '../brand-map/privacy.test.mjs';

export const TEST_PROJECT = 'imvkhicfmidzbzsbhkzs';
export const PROHIBITED_PROJECTS = ['omvkwiosonatswocbdgx', 'yjhzhflyuxcxugfgspby'];
export const digest = text => createHash('sha256').update(text).digest('hex');

export function verifyReport(report) {
  if (report?.status !== 'PASS' || report.project_expected !== TEST_PROJECT ||
      report.synthetic_data_rolled_back !== true || report.draft_schema_rolled_back !== true ||
      report.existing_rows_and_rules_preserved !== true || report.prerequisite_state_restored !== true || report.audit_sequence_gaps_possible !== true ||
      report.concurrency_scenarios_run !== 0 || report.sign_in_api_checks_run !== 0 ||
      !Array.isArray(report.tap) || report.tap.some(line => typeof line !== 'string')) {
    throw new Error('Incomplete, wrong-target or overstated database results.');
  }
  const total = checkPgTap(report.tap.join('\n'));
  if (total !== report.assertions) throw new Error('Assertion count does not match the complete TAP plan.');
  return total;
}

export function verifyDashboardTarget(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'supabase.com' || url.port ||
      url.username || url.password || url.search || url.hash ||
      !new RegExp(`^/dashboard/project/${TEST_PROJECT}/sql(?:/[a-zA-Z0-9-]+)?/?$`).test(url.pathname)) {
    throw new Error('Only the exact BCM Test SQL-editor URL is permitted.');
  }
  return TEST_PROJECT;
}

// Split reviewed SQL without breaking quoted assertion SQL, function bodies,
// escaped strings, or nested comments. Reject incomplete input rather than guess.
export function splitSql(sql) {
  const result = []; let start = 0; let mode = ''; let tag = ''; let depth = 0; let escaped = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], next = sql[i + 1];
    if (mode === 'line') { if (c === '\n') mode = ''; continue; }
    if (mode === 'block') {
      if (c === '/' && next === '*') { depth++; i++; }
      else if (c === '*' && next === '/') { if (--depth === 0) mode = ''; i++; }
      continue;
    }
    if (mode === 'dollar') { if (sql.startsWith(tag, i)) { i += tag.length - 1; mode = ''; } continue; }
    if (mode === 'single' || mode === 'double') {
      const quote = mode === 'single' ? "'" : '"';
      if (mode === 'single' && escaped && c === '\\') { i++; continue; }
      if (c === quote) { if (next === quote) i++; else mode = ''; }
      continue;
    }
    if (c === '-' && next === '-') { mode = 'line'; i++; }
    else if (c === '/' && next === '*') { mode = 'block'; depth = 1; i++; }
    else if (c === "'") { mode = 'single'; escaped = /(?:^|[^\w])e$/i.test(sql.slice(Math.max(0, i - 2), i)); }
    else if (c === '"') mode = 'double';
    else if (c === '$') { const match = sql.slice(i).match(/^(?:\$[a-zA-Z_][\w]*\$|\$\$)/); if (match) { mode = 'dollar'; tag = match[0]; i += tag.length - 1; } }
    else if (c === ';') { result.push(sql.slice(start, i + 1).trim()); start = i + 1; }
  }
  if (mode && mode !== 'line') throw new Error('Incomplete SQL quotation or comment.');
  const tail = sql.slice(start).trim();
  if (code(tail)) throw new Error('Every SQL statement must end with a semicolon.');
  return result.filter(statement => code(statement));
}

export function code(statement) {
  let value = statement.trim();
  while (value.startsWith('--') || value.startsWith('/*')) {
    if (value.startsWith('--')) { const end = value.indexOf('\n'); value = end < 0 ? '' : value.slice(end + 1).trim(); }
    else { let depth = 1, i = 2; for (; i < value.length && depth; i++) { if (value.startsWith('/*', i)) { depth++; i++; } else if (value.startsWith('*/', i)) { depth--; i++; } } if (depth) throw new Error('Incomplete leading comment.'); value = value.slice(i).trim(); }
  }
  return value;
}

const requiredColumns = {
  'auth.users': ['id', 'email'],
  'public.vb_clients': ['id', 'name', 'client_type', 'contact_name', 'portal_enabled', 'archived_at', 'created_at', 'updated_at'],
  'public.vb_marks': ['id', 'client_id', 'name', 'mark_type', 'status', 'uspto_status_text', 'application_number', 'registration_number', 'record_owner', 'source', 'source_checked_at', 'filing_date', 'registration_date', 'uspto_status_date', 'created_at', 'updated_at', 'archived_at'],
  'public.vb_service_preferences': ['client_id', 'service'],
  'public.vb_bcm_settings': ['client_id'],
  'public.vb_bcm_scans': ['client_id'],
  'vb_private.staff_members': ['user_id', 'active'],
  'vb_private.client_memberships': ['client_id', 'user_id', 'active'],
  'vb_private.audit_events': ['id', 'client_id', 'record_id', 'table_name', 'actor_id', 'previous_data', 'current_data'],
};
const requiredFunctions = ['auth.uid()', 'auth.jwt()', 'vb_private.is_staff()', 'vb_private.is_client_member(uuid)', 'vb_private.audit_record()'];
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const columnsValues = Object.entries(requiredColumns).flatMap(([table, columns]) => columns.map(column => `(${quote(table)},${quote(column)})`)).join(',\n');
const functionsValues = requiredFunctions.map(fn => `(${quote(fn)})`).join(',');

// Schema fingerprint contains metadata/digests, not function source or rows.
export const schemaDigestSql = `select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata`;

const temporaryDateColumns = ['filing_date','registration_date','uspto_status_date'];
const approvedMissingColumns = temporaryDateColumns.map(name => 'public.vb_marks.' + name);
const extensionStateSql = `select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e`;
const missingColumnsSql = `select coalesce(jsonb_agg(table_name||'.'||column_name),'[]'::jsonb) from (values ${columnsValues}) required(table_name,column_name) where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.table_name) and attname=required.column_name and attnum>0 and not attisdropped)`;
const prerequisiteStateSql = `select jsonb_build_object('missing_columns',(${missingColumnsSql}),'extensions',(${extensionStateSql}))`;
const missingFunctionsSql = `select coalesce(jsonb_agg(signature),'[]'::jsonb) from (values ${functionsValues}) required(signature) where to_regprocedure(signature) is null`;
const collisionsSql = `select coalesce(jsonb_agg(name),'[]'::jsonb) from (
  select n.nspname||'.'||c.relname name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private') and (c.relname like 'vb_brand_%' or c.relname='vb_marks_id_client_unique')
  union all select n.nspname||'.'||p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='vb_private' and p.proname like 'brand_map_%') or (n.nspname='public' and p.proname in ('vb_read_brand_map','vb_save_brand_asset','vb_set_brand_parent','vb_confirm_brand_relationship','vb_review_brand_legal_link'))
  union all select 'constraint:'||conname from pg_constraint where conrelid=to_regclass('public.vb_marks') and conname='vb_marks_id_client_unique'
) collisions`;

export function preflightSql() {
  return `-- NOT RUN. Read-only BCM Test compatibility/identity check; execute only after approval.
-- First verify browser URL is https://supabase.com/dashboard/project/${TEST_PROJECT}/sql/...
-- A database name such as postgres does NOT identify a Supabase project.
begin read only;
set local statement_timeout='30s';
select jsonb_build_object(
  'operator_expected_project', '${TEST_PROJECT}',
  'identity_is_cluster_wide_not_a_project_ref', true,
  'database_identity', (select system_identifier::text from pg_control_system()),
  'database_name', current_database(),
  'executor_role', current_user,
  'server_version', current_setting('server_version_num'),
  'schema_digest', (${schemaDigestSql}),
  'missing_columns', (${missingColumnsSql}),
  'missing_functions', (${missingFunctionsSql}),
  'brand_map_collisions', (${collisionsSql}),
  'pgtap_supported', exists(select 1 from pg_available_extensions where name='pgtap'),
  'extensions_schema_exists', to_regnamespace('extensions') is not null,
  'prerequisite_state', (${prerequisiteStateSql}),
  'pgtap_available', exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgtap' and n.nspname='extensions'),
  'client_and_mark_rls', coalesce((select bool_and(relrowsecurity) and count(*)=2 from pg_class where oid in (to_regclass('public.vb_clients'),to_regclass('public.vb_marks'))),false)
) as brand_map_readonly_preflight;
rollback;
`;
}

export function postcheckSql(runId) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(runId)) throw new Error('Invalid fixture namespace.');
  const prefix=runId.slice(0,8);
  return `-- NOT RUN. Separate read-only confirmation after the rollback test.
-- Verify the same BCM Test dashboard URL. Compare schema_digest with preflight.
begin read only;
set local statement_timeout='30s';
select jsonb_build_object(
  'operator_expected_project','${TEST_PROJECT}',
  'database_identity',(select system_identifier::text from pg_control_system()),
  'schema_digest',(${schemaDigestSql}),
  'remaining_brand_map_objects',(${collisionsSql}),
  'prerequisite_state',(${prerequisiteStateSql}),
  'remaining_fixture_users',(select count(*) from auth.users where left(id::text,8)='${prefix}' or email like 'brand-map-hosted-${prefix}-%@example.invalid'),
  'remaining_fixture_clients',(select count(*) from public.vb_clients where left(id::text,8)='${prefix}'),
  'remaining_fixture_marks',(select count(*) from public.vb_marks where left(id::text,8)='${prefix}'),
  'remaining_fixture_memberships',(select count(*) from vb_private.client_memberships where left(client_id::text,8)='${prefix}' or left(user_id::text,8)='${prefix}'),
  'remaining_fixture_staff',(select count(*) from vb_private.staff_members where left(user_id::text,8)='${prefix}'),
  'remaining_fixture_preferences',(select count(*) from public.vb_service_preferences where left(client_id::text,8)='${prefix}'),
  'remaining_fixture_audit_rows',(select count(*) from vb_private.audit_events where left(client_id::text,8)='${prefix}' or left(actor_id::text,8)='${prefix}')
) as brand_map_readonly_postcheck;
rollback;
`;
}

function dollar(value, label) {
  const tag = `$vb_hosted_${label}$`; if (value.includes(tag)) throw new Error('SQL delimiter collision.');
  return tag + value + tag;
}

function reviewedBodies(migration, privacy, runId) {
  const draft = splitSql(migration), tests = splitSql(privacy);
  if (!/^begin;$/i.test(code(draft[0])) || !code(draft[1]).includes("current_database() <> 'venture_brand_map_test'") || !/^commit;$/i.test(code(draft.at(-1)))) throw new Error('Local draft wrapper changed: review required.');
  if (!/^begin;$/i.test(code(tests[0])) || !code(tests[1]).includes("current_database() <> 'venture_brand_map_test'") || !/^create extension if not exists pgtap with schema extensions;$/i.test(code(tests[2])) || !/^select \* from finish\(\);$/i.test(code(tests.at(-2))) || !/^rollback;$/i.test(code(tests.at(-1)))) throw new Error('Local test wrapper changed: review required.');
  const fixtureDefinition = "('f000000' || kind::text || '-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid";
  if (privacy.split(fixtureDefinition).length !== 2) throw new Error('Fixture namespace changed: review required.');
  const fixtureReplacement = `('${runId.slice(0,8)}-' || lpad(kind::text,4,'0') || '-${runId.slice(14,18)}-${runId.slice(19,23)}-' || lpad(n::text,12,'0'))::uuid`;
  const body = tests.slice(3, -2).map(statement => statement
    .replace(fixtureDefinition, fixtureReplacement)
    .replace("'brand-map-fixture-'", quote('brand-map-hosted-' + runId.slice(0,8) + '-'))
    .replace("'Brand Map test client '", quote('Brand Map hosted rollback ' + runId.slice(0,8) + ' client '))
    .replace("execute format('grant execute on all functions in schema %I to anon, authenticated',temp_schema);", "execute format('grant execute on function %I.fixture_id(integer,integer), %I.business_fields(text,text), %I.asset(integer), %I.link(integer), %I.relationship(integer), %I.mark_identity(integer), %I.claims(integer,text) to anon, authenticated',temp_schema,temp_schema,temp_schema,temp_schema,temp_schema,temp_schema,temp_schema);")
    .replace('select count(*) from public.vb_brand_relationships)', 'select count(*) from public.vb_brand_relationships where client_id in (pg_temp.fixture_id(1,1),pg_temp.fixture_id(1,2),pg_temp.fixture_id(1,3)))')
    .replace('select count(*) from public.vb_brand_legal_links)', 'select count(*) from public.vb_brand_legal_links where client_id in (pg_temp.fixture_id(1,1),pg_temp.fixture_id(1,2),pg_temp.fixture_id(1,3)))'));
  body.push('select * from finish(true);');
  const capture = statement => /^select\s+(?:ok|is|isnt|throws_ok|lives_ok)\s*\(|^select\s+\*\s+from\s+finish\(true\);$/i.test(code(statement));
  return { draft: draft.slice(2,-1), tests: body, capture: body.map(capture) };
}

export function buildRollbackSql(migration, privacy, options = {}) {
  const runId = options.runId ?? randomUUID();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(runId)) throw new Error('A new v4 fixture namespace is required.');
  const enabled = options.approved === true;
  if (enabled) {
    verifyDashboardTarget(options.observedUrl);
    if (!/^[1-9][0-9]{14,19}$/.test(options.databaseIdentity ?? '') || !/^[a-f0-9]{64}$/.test(options.schemaDigest ?? '') || options.bcmReleaseComplete !== true) throw new Error('Verified Test identity, schema fingerprint and completed BCM release are required.');
  }
  const temporaryPrerequisites = options.temporaryPrerequisitesApproved === true;
  if (temporaryPrerequisites && !enabled) throw new Error('Temporary prerequisites require explicit execution approval and verified Test pins.');
  const prerequisiteStatements = temporaryPrerequisites ? [
    ...temporaryDateColumns.map(name => `alter table public.vb_marks add column ${name} date;`),
    'create extension pgtap with schema extensions;',
  ] : [];
  const identity = enabled ? options.databaseIdentity : '__UNVERIFIED_TEST_IDENTITY__';
  const schema = enabled ? options.schemaDigest : '__UNVERIFIED_TEST_SCHEMA__';
  const reviewed = reviewedBodies(migration, privacy, runId);
  const statements = [...prerequisiteStatements, ...reviewed.draft, ...reviewed.tests];
  const captures = [...prerequisiteStatements.map(() => false), ...reviewed.draft.map(() => false), ...reviewed.capture];
  return `-- PREPARED / NOT EXECUTED. Browser-only sequential privacy test, with rollback.
-- Exact approved project: ${TEST_PROJECT}. Main Venture Branding and Cotivate Development prohibited.
-- SQL cannot authenticate a dashboard project ref. Verify the visible URL independently.
-- The reviewed cluster/schema pins are additional checks, not substitutes for the URL check.
-- Default copy is BLOCKED. A later approved preflight must supply actual pins.
-- Audit identity counters can advance despite rollback; NEVER reset those sequences.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
set local idle_in_transaction_session_timeout='60s';
set local search_path=public,extensions;
do $vb_target_guard$
begin
  if ${enabled ? 'true' : 'false'} is not true then raise exception 'No execution approval/verified Test identity: prepared copy is blocked.'; end if;
  if current_database()<>'postgres' or current_user<>'postgres' then raise exception 'Expected hosted database/executor role unavailable: stop.'; end if;
  if (select system_identifier::text from pg_control_system()) is distinct from ${quote(identity)} then raise exception 'Wrong or changed database cluster: stop.'; end if;
  if (${schemaDigestSql}) is distinct from ${quote(schema)} then raise exception 'Test schema changed after preflight: review required.'; end if;
  if ${temporaryPrerequisites ? `not ((${missingColumnsSql}) <@ ${quote(JSON.stringify(approvedMissingColumns))}::jsonb and jsonb_array_length((${missingColumnsSql}))=3)` : `(${missingColumnsSql}) <> '[]'::jsonb`} or (${missingFunctionsSql}) <> '[]'::jsonb or (${collisionsSql}) <> '[]'::jsonb then raise exception 'Missing dependencies or Brand Map object collisions: stop, do not replace existing objects.'; end if;
  ${temporaryPrerequisites ? `if exists(select 1 from pg_extension where extname='pgtap') or not exists(select 1 from pg_available_extensions where name='pgtap') or to_regnamespace('extensions') is null then raise exception 'Temporary pgTAP prerequisite state changed: stop.'; end if;` : `if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgtap' and n.nspname='extensions') then raise exception 'Existing pgTAP extension required; no automatic installation.'; end if;`}
  if not coalesce((select bool_and(relrowsecurity) and count(*)=2 from pg_class where oid in (to_regclass('public.vb_clients'),to_regclass('public.vb_marks'))),false) then raise exception 'Base row security unavailable: stop.'; end if;
end;
$vb_target_guard$;

-- Transaction-local helper; exports counts/digests only, never original rows.
create function pg_temp.brand_map_preservation_snapshot() returns jsonb
language plpgsql set search_path='' as $vb_snapshot$
declare result jsonb := '{}'::jsonb; relation record; row_count bigint; row_digest text; bytes bigint;
begin
  for relation in select n.nspname,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and ((n.nspname='public' and left(c.relname,3)='vb_') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) order by n.nspname,c.relname loop
    execute pg_catalog.format('select count(*),coalesce(sum(pg_catalog.octet_length(pg_catalog.to_jsonb(t)::text)),0) from %I.%I t',relation.nspname,relation.relname) into row_count,bytes;
    if row_count>10000 or bytes>16777216 then raise exception 'Preservation snapshot exceeds reviewed test limits.'; end if;
    execute pg_catalog.format('select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(coalesce(pg_catalog.string_agg(pg_catalog.to_jsonb(t)::text,E''\\n'' order by pg_catalog.to_jsonb(t)::text),''''),''UTF8'')),''hex'') from %I.%I t',relation.nspname,relation.relname) into row_digest;
    result := result || pg_catalog.jsonb_build_object(relation.nspname||'.'||relation.relname,pg_catalog.jsonb_build_object('rows',row_count,'digest',row_digest));
  end loop;
  return result;
end;
$vb_snapshot$;

do $vb_hosted_run$
declare
  statements text[] := array[${statements.map((s,i) => dollar(s,'statement_' + i)).join(',\n')}];
  capture boolean[] := array[${captures.join(',')}];
  before_rows jsonb; after_rows jsonb; before_schema text; after_schema text; before_prerequisites jsonb; after_prerequisites jsonb;
  tap text[] := array[]::text[]; result_line text; line text; plans integer:=0; planned integer:=0; assertions integer:=0; i integer;
begin
  before_rows := pg_temp.brand_map_preservation_snapshot();
  before_schema := (${schemaDigestSql});
  before_prerequisites := (${prerequisiteStateSql});
  -- Catch only our success sentinel. Variables survive the inner rollback;
  -- assertion errors, permission errors and unknown errors propagate as failures.
  begin
    for i in 1..cardinality(statements) loop
      if capture[i] then
        for result_line in execute statements[i] loop
          foreach line in array string_to_array(result_line,E'\n') loop tap := array_append(tap,line); end loop;
        end loop;
      else execute statements[i]; end if;
    end loop;
    foreach line in array tap loop
      if line ~ '^not ok' or line ~ '^Bail out!' then raise exception 'Database assertion failed: no passing report.'; end if;
      if line ~ '^1\\.\\.[0-9]+$' then plans:=plans+1; planned:=substring(line from 4)::integer;
      elsif line ~ '^ok [0-9]+( |$)' then
        assertions:=assertions+1;
        if (regexp_match(line,'^ok ([0-9]+)'))[1]::integer<>assertions then raise exception 'Incomplete or out-of-order assertion results.'; end if;
      end if;
    end loop;
    if plans<>1 or planned<1 or planned<>assertions then raise exception 'Incomplete pgTAP plan: no passing report.'; end if;
    raise exception using errcode='VB001', message='Brand Map success rollback sentinel';
  exception when sqlstate 'VB001' then
    if sqlerrm<>'Brand Map success rollback sentinel' then raise; end if;
  end;
  execute 'reset role';
  after_rows := pg_temp.brand_map_preservation_snapshot();
  after_schema := (${schemaDigestSql});
  after_prerequisites := (${prerequisiteStateSql});
  if before_prerequisites is distinct from after_prerequisites then raise exception 'Temporary prerequisite state not restored after rollback.'; end if;
  if before_rows is distinct from after_rows or before_schema is distinct from after_schema then raise exception 'Existing Test records or schema differ after rollback: preservation NOT verified.'; end if;
  perform set_config('vb_brand_map.hosted_report',jsonb_build_object(
    'status','PASS','assertions',assertions,'tap',to_jsonb(tap),'project_expected','${TEST_PROJECT}',
    'fixture_namespace','${runId}','synthetic_data_rolled_back',true,'draft_schema_rolled_back',true,
    'existing_rows_and_rules_preserved',true,'prerequisite_state_restored',true,'temporary_prerequisites_used',${temporaryPrerequisites},'audit_sequence_gaps_possible',true,
    'concurrency_scenarios_run',0,'sign_in_api_checks_run',0)::text,true);
end;
$vb_hosted_run$;
select current_setting('vb_brand_map.hosted_report')::jsonb as brand_map_rollback_results;
rollback;
`;
}

export async function loadSources() {
  return Promise.all(['001-brand-assets.sql','brand-assets.test.sql'].map(name => readFile(new URL('../brand-map/' + name,import.meta.url),'utf8')));
}

// This CLI creates only the BLOCKED review copy, without an enabling flag.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) throw new Error('No execution/credential arguments accepted by preparation CLI.');
  const [migration,privacy] = await loadSources();
  const runId=randomUUID();
  const sql = buildRollbackSql(migration,privacy,{runId});
  await writeFile(new URL('./01-readonly-preflight.sql',import.meta.url),preflightSql());
  await writeFile(new URL('./02-rollback-check.BLOCKED.sql',import.meta.url),sql);
  await writeFile(new URL('./03-readonly-postcheck.sql',import.meta.url),postcheckSql(runId));
  await writeFile(new URL('./source-manifest.json',import.meta.url),JSON.stringify({prepared_only:true,project:TEST_PROJECT,prohibited_projects:PROHIBITED_PROJECTS,fixture_namespace:runId,source_hashes:{'../brand-map/001-brand-assets.sql':digest(migration),'../brand-map/brand-assets.test.sql':digest(privacy)},file_hashes:{'01-readonly-preflight.sql':digest(preflightSql()),'02-rollback-check.BLOCKED.sql':digest(sql),'03-readonly-postcheck.sql':digest(postcheckSql(runId))},concurrency_scenarios_executed:0},null,2)+'\n');
  console.log('Prepared blocked hosted SQL and source fingerprints. No database connection attempted.');
}
