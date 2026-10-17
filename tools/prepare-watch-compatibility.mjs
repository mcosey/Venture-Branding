// Local assembler only. Does not connect to Supabase or execute SQL.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../supabase/proposals/watch-engagement-compatibility/',import.meta.url);
const enforcement=await readFile(new URL('../supabase/proposals/portal-engagement-cutover/06-test-service-enforcement.sql',import.meta.url),'utf8');
function fn(name){const pattern=new RegExp('CREATE OR REPLACE FUNCTION '+name.replaceAll('.','\\.')+'\\([^]*?end \\$function\\$;');const m=enforcement.match(pattern);if(!m)throw Error('Source function missing: '+name);return m[0];}
function replaceOnce(s,from,to){if(s.split(from).length!==2)throw Error('Unexpected source drift: '+from.slice(0,70));return s.replace(from,to);}
const observed=JSON.parse(await readFile(new URL('dependency-observation.json',root),'utf8'));
for(const [signature,expected] of Object.entries(observed.result.source_bodies)){
 const body=fn(signature.split('(')[0]).match(/AS \$function\$([^]*?)\$function\$/)[1];
 if(createHash('md5').update(body.replace(/\s+/g,' ')).digest('hex')!==expected)throw Error('Source no longer matches observed Test function: '+signature);
}
let snapshot=replaceOnce(fn('public.vb_watch_snapshot'),'begin\n perform',"begin\n if exists(select 1 from vb_private.legacy_test_mappings where client_id=target_client and enforcement_enabled) then return vb_private.watch_scoped_snapshot(target_client); end if;\n perform");
let save=replaceOnce(fn('public.vb_watch_save'),'begin\n perform',"begin\n if exists(select 1 from vb_private.legacy_test_mappings where client_id=target_client) then perform vb_private.watch_scope_access(target_client); raise exception 'Refresh Watch and choose a configuration' using errcode='22023'; end if;\n perform");
let worker=fn('public.vb_watch_run_due').replace('declare s vb_private.watch_settings;','declare s record;');
worker=replaceOnce(worker,"begin\n if not (select enabled", "begin\n if auth.role() is distinct from 'service_role' then raise exception 'Watch worker required' using errcode='42501'; end if;\n if not (select enabled");
const loopStart=worker.indexOf(' for s in select ws.*');const bodyStart=worker.indexOf(' count_new:=0;',loopStart);
if(loopStart<0||bodyStart<0)throw Error('Worker loop missing');
worker=worker.slice(0,loopStart)+` for s in select q.* from vb_private.watch_due_configurations() q join public.vb_clients c on c.id=q.client_id
 order by q.next_run_at,q.client_id,q.configuration_id nulls first limit 1 for update of c skip locked loop
 -- Re-read eligibility after taking the same client lock used by saves and closure.
 select q.* into s from vb_private.watch_due_configurations() q where q.client_id=s.client_id and q.configuration_id is not distinct from s.configuration_id;
 if not found then continue; end if;
`+worker.slice(bodyStart);
worker=replaceOnce(worker,'insert into vb_private.watch_runs(client_id,coverage_from,coverage_to,status,missing_dates,settings_version)\n values(s.client_id,coalesce(ending,current_date-1)-6,ending,\'incomplete\',coalesce(missing,\'{}\'),s.version);',"insert into vb_private.watch_runs(client_id,configuration_id,coverage_from,coverage_to,status,missing_dates,settings_version)\n values(s.client_id,s.configuration_id,coalesce(ending,current_date-1)-6,ending,'incomplete',coalesce(missing,'{}'),s.version);");
worker=replaceOnce(worker,"update vb_private.watch_settings set next_run_at=now()+interval '1 day' where client_id=s.client_id;","perform vb_private.watch_advance_configuration(s.client_id,s.configuration_id,now()+interval '1 day');");
worker=replaceOnce(worker,'where f.client_id=s.client_id and\n',"where f.client_id=s.client_id and (s.engagement_id is null or vb_private.watch_scope_mark(s.client_id,s.engagement_id,m.id)) and\n");
worker=replaceOnce(worker,"vb_private.portal_same_service_scope(s.client_id,'public.vb_marks',jsonb_build_object('id',m.id),'trademark_watch')","(s.engagement_id is null or vb_private.watch_scope_mark(s.client_id,s.engagement_id,m.id))");
worker=replaceOnce(worker,"insert into vb_private.watch_runs(client_id,coverage_from,coverage_to,status,finding_count,settings_version) values(s.client_id,ending-6,ending,'completed',count_new,s.version);","insert into vb_private.watch_runs(client_id,configuration_id,coverage_from,coverage_to,status,finding_count,settings_version) values(s.client_id,s.configuration_id,ending-6,ending,'completed',count_new,s.version);");
worker=replaceOnce(worker,"update vb_private.watch_settings set next_run_at=now()+interval '7 days' where client_id=s.client_id;","perform vb_private.watch_advance_configuration(s.client_id,s.configuration_id,now()+interval '7 days');");
const pending=worker.indexOf(" return jsonb_build_object('completed_clients'");
if(pending<0)throw Error('Worker result missing');
worker=worker.slice(0,pending)+" return jsonb_build_object('completed_clients',processed,'pending',exists(select 1 from vb_private.watch_due_configurations()));\nend $function$;";
const generated='-- Generated by tools/prepare-watch-compatibility.mjs; do not edit.\n'+snapshot+'\n'+save+'\n'+worker+'\n';
await writeFile(new URL('04-test-rpc-replacements.sql',root),generated);
const names=['01-test-schema.sql','02-test-api.sql','03-worker-helpers.sql','04-test-rpc-replacements.sql'];
const parts=await Promise.all(names.map(n=>readFile(new URL(n,root),'utf8')));
const apply=parts.join('\n')+'\ncommit;\n';
await writeFile(new URL('prepared-apply.sql',root),apply);
let checks;try{checks=await readFile(new URL('05-rollback-checks.sql',root),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
// Preserve the existing broad access tests, adjusting only the changed Watch
// contract and the now-Client identity used as a temporary Member fixture.
let regression=await readFile(new URL('../supabase/proposals/portal-engagement-cutover/07-test-enforcement-checks.sql',import.meta.url),'utf8');
regression=regression.replace(/\nbegin;/,'').replace(/rollback;\s*$/,'');
regression=replaceOnce(regression,"-- Ready flags/budget are changed only",`-- Existing onboarding identities may now be Clients. Make only the selected Member
-- fixture grant-free inside this rollback transaction; preserve its private planning data.
update vb_private.engagement_grants set status='revoked' where user_id=(select member from enforcement_context);
-- Ready flags/budget are changed only`);
regression=replaceOnce(regression,"select pg_temp.expect_error('select public.vb_watch_snapshot((select client_id from enforcement_context))','42501','Closed A Watch does not inherit B entitlement');",`select pg_temp.expect(not exists(select 1 from jsonb_array_elements(public.vb_watch_snapshot((select client_id from enforcement_context))->'configurations') c where c->>'scope_id'=(select engagement_id::text from enforcement_context)),'Active B opens Watch without inheriting closed A configuration');`);
const oldSchedule='on conflict(client_id) do update set enabled=true,next_run_at=now();';
regression=replaceOnce(regression,oldSchedule,oldSchedule+`
insert into vb_private.watch_scope_settings(client_id,engagement_id,mark_ids,enabled,version,started_on,next_run_at)
 select client_id,engagement_id,array[mark_a],true,1,current_date,now() from enforcement_context
 on conflict(client_id,engagement_id) do update set mark_ids=excluded.mark_ids,enabled=true,next_run_at=now();`);
regression=replaceOnce(regression,"select pg_temp.expect(not exists(select 1 from vb_private.watch_settings where client_id=(select client_id from enforcement_context) and enabled),'Closure disables its Watch schedule');",`select pg_temp.expect(not exists(select 1 from vb_private.watch_settings where client_id=(select client_id from enforcement_context) and enabled),'Closure disables its retained legacy Watch schedule');
select pg_temp.expect(not exists(select 1 from vb_private.watch_scope_settings where engagement_id=(select engagement_id from enforcement_context) and enabled),'Closure disables its scoped Watch schedule');`);
regression='-- GENERATED adapted regression; hosted execution pending. Original source retained unchanged.\nselect set_config(\'request.jwt.claims\',\'{}\',true);\n'+regression;
await writeFile(new URL('adapted-enforcement-checks.sql',root),regression);
const suites=checks?'\nsavepoint watch_compatibility_checks;\n'+checks+`
do $$ begin if (select count(*) from watch_compat_results)<>66 then raise exception 'Expected 66 Watch checks'; end if; end $$;
rollback to savepoint watch_compatibility_checks;
`+regression+`
do $$ begin if (select count(*) from enforcement_results)<>55 or not (select bool_and(passed) from enforcement_results) then raise exception 'Expected 55 passing enforcement checks'; end if; end $$;
select 66 as watch_checks, count(*) as enforcement_checks, bool_and(passed) as all_passed from enforcement_results;
`:null;
const rehearsal=suites?parts.join('\n')+suites+'\nrollback;\n':null;
if(rehearsal)await writeFile(new URL('prepared-rehearsal.sql',root),rehearsal);
if(suites)await writeFile(new URL('prepared-installed-checks.sql',root),"-- Installed Test checks; do not run before application.\nbegin;\ndo $$ begin if (select system_identifier::text from pg_control_system())<>'7692130048193495360' or to_regclass('vb_private.watch_scope_settings') is null then raise exception 'Expected installed Test Watch migration'; end if; end $$;\n"+suites+'\nrollback;\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
await writeFile(new URL('prepared-manifest.json',root),JSON.stringify({status:'prepared-not-applied',project:'imvkhicfmidzbzsbhkzs',sources:Object.fromEntries(names.map((n,i)=>[n,hash(parts[i])])),checks_sha256:checks?hash(checks):null,adapted_regression_sha256:hash(regression),apply_sha256:hash(apply),rehearsal_sha256:rehearsal?hash(rehearsal):null},null,2)+'\n');
console.log('Prepared local Watch package; no database execution.');
