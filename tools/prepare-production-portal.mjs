// Local preparation only. Reuses maintained SQL; no network or database client.
// Client identities and the generated SQL stay in an explicitly supplied PRIVATE
// directory outside this public repository. Nothing is deployed or executed.
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const repo=await realpath(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--private-directory')throw Error('Supply --private-directory /absolute/existing/review/directory outside the repository.');
const out=await realpath(resolve(args[1]));
const within=relative(repo,out);
if(!within.startsWith('..'+sep)&&within!=='..')throw Error('Private client data must stay outside the public repository.');
const inventory=JSON.parse(await readFile(resolve(out,'current-inventory.json'),'utf8'));
const mapping=JSON.parse(await readFile(resolve(out,'mapping-review.json'),'utf8'));
if(inventory.target_guard_passed!==true||mapping.project!=='omvkwiosonatswocbdgx'||!Array.isArray(mapping.rows))throw Error('Expected reviewed main Production inputs.');
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const identities=new Set();
for(const row of mapping.rows){
 const actual=inventory.mapping_inventory.find(c=>c.client_id===row.client_id);
 if(!actual||actual.archived||!actual.portal_enabled||row.expected_name!==actual.name||row.client_type!==actual.client_type)throw Error('Mapping does not match the reviewed legal client.');
 const users=actual.protected_links.filter(m=>m.active);
 if(users.some(m=>m.staff||!m.email_confirmed)||JSON.stringify([...row.user_ids].sort())!==JSON.stringify(users.map(m=>m.user_id).sort()))throw Error('Mapping must preserve the existing protected, verified client identities.');
 for(const id of [row.client_id,row.engagement_id,row.matter_id,...row.user_ids])if(!uuid.test(id))throw Error('Invalid mapping identity.');
 for(const id of [row.client_id,row.engagement_id,row.matter_id]){if(identities.has(id))throw Error('Repeated mapping identity.');identities.add(id);}
}
const sources={};
const read=async path=>{const s=await readFile(resolve(repo,path),'utf8');sources[path]=createHash('sha256').update(s).digest('hex');return s;};
const replaceOnce=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Source anchor changed: '+a.slice(0,70));return s.replace(a,b);};
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const body=s=>s.replace(/^begin;\s*$/gmi,'').replace(/^commit;\s*$/gmi,'');
// Remove only the original environment/baseline checks. One fresh main-only
// guard below supersedes them atomically; lifecycle/data validation is retained.
const removeOldGuards=s=>s.replace(/^do \$\$[\s\S]*?end \$\$;/gmi,block=>
 /Wrong Test database|restricted to Venture Branding BCM Test|Access definition changed|Definition changed:/.test(block)?'-- Main target/source guard is at the start of this single transaction.':block);
const parts=[];
for(const path of ['portal-membership/01-test-foundation.sql','portal-membership/05-test-onboarding.sql','portal-membership/07-test-progress.sql'])
 parts.push(removeOldGuards(body(await read('supabase/proposals/'+path))));
const oldMapping=await read('supabase/proposals/portal-engagement-cutover/01-stage-test-mapping.sql');
const schemaAt=oldMapping.indexOf('alter table public.vb_engagements add constraint');
const endAt=oldMapping.indexOf('\ndo $$ declare row record; actual text; begin');
if(schemaAt<0||endAt<0)throw Error('Mapping source boundaries changed.');
let stage=oldMapping.slice(schemaAt,endAt)
 .replaceAll('Fictional Test mapping — October 16, 2026','Reviewed existing portal relationship')
 .replaceAll('FICTIONAL TEST — existing portal dry run','Existing portal access')
 .replaceAll('FICTIONAL TEST — existing records','Existing client records');
// Only the reviewed identity rows are input. No Test seed, Auth user, Member
// company, email lookup, automatic cross-client merge or policy acceptance.
const input=JSON.stringify(mapping.rows);
const mappingStart=`
create temporary table mapping_input(client_id uuid primary key,engagement_id uuid unique,matter_id uuid unique,expected_name text,client_type text,user_ids uuid[]) on commit drop;
insert into mapping_input select * from jsonb_to_recordset(${literal(input)}::jsonb)
 as m(client_id uuid,engagement_id uuid,matter_id uuid,expected_name text,client_type text,user_ids uuid[]);
do $mapping_guard$ begin
 if exists(select 1 from mapping_input i left join public.vb_clients c on c.id=i.client_id
  where c.id is null or c.name is distinct from i.expected_name or c.client_type is distinct from i.client_type or not c.portal_enabled or c.archived_at is not null)
 or exists(select 1 from mapping_input i where
  (select array_agg(m.user_id order by m.user_id) from vb_private.client_memberships m where m.client_id=i.client_id and m.active)
  is distinct from (select array_agg(u order by u) from unnest(i.user_ids) u))
 or exists(select 1 from mapping_input i join vb_private.client_memberships m using(client_id)
  join auth.users u on u.id=m.user_id where m.active and (u.email_confirmed_at is null or exists(select 1 from vb_private.staff_members s where s.user_id=m.user_id)))
 then raise exception 'Reviewed client/account mapping changed'; end if;
end $mapping_guard$;
`;
parts.push(mappingStart+stage);
let scope=body(await read('supabase/proposals/portal-engagement-cutover/05-test-scope-core.sql'));
scope=removeOldGuards(scope);
let enforcement=removeOldGuards(body(await read('supabase/proposals/portal-engagement-cutover/06-test-service-enforcement.sql')));
// Main Production deliberately retired the old crawler dispatcher. Preserve it;
// the maintained AI dispatcher receives the existing scoped access checks.
const retired=/^CREATE OR REPLACE FUNCTION vb_private\.dispatch_bcm_tick\(\)[\s\S]*?end; \$function\$;/m;
if(!retired.test(enforcement))throw Error('Retired dispatcher boundary changed.');
enforcement=enforcement.replace(retired,'-- Preserve the installed retired Production crawler dispatcher.');
// Preserve Production's monthly allowances and scheduling behavior. The Test
// variants intentionally use a small lifetime run cap and a different endpoint.
// Start these four replacements from the actual matching Production source,
// adding only the already-reviewed scope checks. Never promote the Test budget.
const productionResearch=await read('supabase/proposals/bcm-ai-client-rollout/setup.sql');
function productionFunction(name){
 const re=new RegExp('^create\\s+(?:or\\s+replace\\s+)?function\\s+'+name.replaceAll('.','\\.')+'\\([^]*?\\bas\\s+(\\$\\w*\\$)([^]*?)\\1\\s*;','mi');
 const m=productionResearch.match(re);
 if(!m)throw Error('Missing maintained Production research function: '+name);
 const before=inventory.functions.find(f=>f.schema+'.'+f.name===name);
 if(!before||createHash('md5').update(m[2]).digest('hex')!==before.source_hash)throw Error('Maintained source does not match current Production: '+name);
 return m[0];
}
function setFunction(source,name,replacement){
 const re=new RegExp('^CREATE OR REPLACE FUNCTION '+name.replaceAll('.','\\.')+'\\([^]*?end; \\$function\\$;','m');
 if(!re.test(source))throw Error('Scoped function boundary changed: '+name);
 return source.replace(re,()=>replacement);
}
let reserve=productionFunction('vb_private.reserve_bcm_ai');
reserve=replaceOnce(reserve,'where client_id=target and domain=domain_name order by last_seen',
 "where client_id=target and domain=domain_name and vb_private.portal_record_actor('public.vb_bcm_ai_observations',jsonb_build_object('id',id),actor,'brand_change_monitor') order by last_seen");
enforcement=setFunction(enforcement,'vb_private.reserve_bcm_ai',reserve);
let claim=productionFunction('public.vb_claim_bcm_ai_due_run');
claim=replaceOnce(claim,"where client_id=target and domain=vb_private.bcm_ai_domain(cfg.urls[1]) and status='completed'",
 "where client_id=target and domain=vb_private.bcm_ai_domain(cfg.urls[1]) and status='completed' and vb_private.portal_same_service_scope(target,'public.vb_bcm_ai_runs',jsonb_build_object('id',id),'brand_change_monitor')");
enforcement=setFunction(enforcement,'public.vb_claim_bcm_ai_due_run',claim);
let monitoring=productionFunction('public.vb_set_bcm_ai_monitoring');
monitoring=replaceOnce(monitoring,"begin\n if not vb_private.is_client_member(target_client)","begin\n perform vb_private.portal_require_service(target_client,'brand_change_monitor');\n if not vb_private.is_client_member(target_client)");
enforcement=setFunction(enforcement,'public.vb_set_bcm_ai_monitoring',monitoring);
let dispatch=productionFunction('vb_private.dispatch_bcm_ai_tick');
dispatch=replaceOnce(dispatch,'s.enabled and s.next_run_at<=now()',"s.enabled and s.next_run_at<=now() and vb_private.portal_service_actor(c.id,s.authorized_by,'brand_change_monitor')");
enforcement=setFunction(enforcement,'vb_private.dispatch_bcm_ai_tick',dispatch);
parts.push(scope,enforcement);
let admin=body(await read('supabase/proposals/portal-engagement-admin/01-test-admin.sql'));
// Its original Test guard also assumes four seeded relationships. The source
// guard and explicit mapping input above replace that setup assumption.
admin=removeOldGuards(admin);
parts.push(admin,removeOldGuards(body(await read('supabase/proposals/portal-engagement-invitations/01-test-invitations.sql'))));
const definitions=new Map();
const mainLabels=s=>s.replaceAll('Fictional Test mapping — October 16, 2026','Reviewed existing portal relationship');
function collect(s){
 s=mainLabels(s);
 const re=/^create\s+(?:or\s+replace\s+)?function\s+((?:public|vb_private)\.\w+)\([\s\S]*?\bas\s+(\$\w*\$)([\s\S]*?)\2\s*;/gmi;
 for(const m of s.matchAll(re))definitions.set(m[1].toLowerCase(),createHash('md5').update(m[3]).digest('hex'));
}
parts.forEach(collect);
let watch=await read('supabase/proposals/watch-engagement-compatibility/01-test-schema.sql');
const tableGuard=watch.match(/ for sig,expected in select \* from jsonb_each_text\('\{"watch_settings"[\s\S]*? end loop;/)?.[0];
if(!tableGuard)throw Error('Reviewed Watch column guard changed.');
const dependencyNames=['public.vb_watch_snapshot','public.vb_watch_save','public.vb_watch_run_due','vb_private.watch_access','public.vb_close_test_engagement','vb_private.portal_scope_new_record','vb_private.portal_actor_scope','vb_private.portal_row_read'];
for(const name of dependencyNames)if(!definitions.has(name))throw Error('Missing prepared Watch dependency: '+name);
const staged=JSON.stringify(Object.fromEntries(dependencyNames.map(n=>[n,definitions.get(n)])));
const watchGuard=`do $watch_guard$ declare item record; actual text; sig text; expected text; begin
 for item in select * from jsonb_each_text(${literal(staged)}::jsonb) loop
  select md5(p.prosrc) into strict actual from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname||'.'||p.proname=item.key;
  if actual is distinct from item.value then raise exception 'Prepared Watch dependency changed: %',item.key; end if;
 end loop;
${tableGuard}
 if exists(select 1 from vb_private.legacy_test_mappings where not enforcement_enabled)
 or (select count(*) from vb_private.legacy_test_mappings)<>(select count(*) from mapping_input)
 or to_regclass('vb_private.watch_scope_settings') is not null then raise exception 'Watch mapping state changed'; end if;
end $watch_guard$;`;
const watchBlock=/-- BEGIN HOSTED GUARDS[\s\S]*?-- END HOSTED GUARDS/;
if(!watchBlock.test(watch))throw Error('Watch guard boundary changed.');
watch=body(watch.replace(watchBlock,watchGuard));
parts.push(watch);
for(const path of ['02-test-api.sql','03-worker-helpers.sql','04-test-rpc-replacements.sql'])parts.push(body(await read('supabase/proposals/watch-engagement-compatibility/'+path)));
// Original caller names, including internal Test-era RPC/table names, are kept
// for compatibility. This does not publish legal policy versions or activate UI.
const oldBodies=JSON.stringify(inventory.functions.filter(f=>f.schema==='public'||f.schema==='vb_private'));
const approval=mapping.approved===true?'true':'false';
const header=`-- GENERATED PRIVATE REVIEW PACKAGE. NOT EXECUTED. No backup/rehearsal/hosting work.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $main_guard$ declare f jsonb; p record; begin
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Expected main Venture Branding'; end if;
 if not ${approval} then raise exception 'Preparation only: existing client mapping has not been approved'; end if;
 if to_regclass('vb_private.portal_accounts') is not null then raise exception 'Portal foundation already present; stop for review'; end if;
 for f in select value from jsonb_array_elements(${literal(oldBodies)}::jsonb) loop
  select pr.* into strict p from pg_proc pr join pg_namespace n on n.oid=pr.pronamespace
   where n.nspname=f->>'schema' and pr.proname=f->>'name' and pg_get_function_identity_arguments(pr.oid)=f->>'arguments';
  if md5(p.prosrc) is distinct from f->>'source_hash' or p.prosecdef is distinct from (f->>'definer')::boolean
   or coalesce(to_jsonb(p.proacl),'null'::jsonb) is distinct from f->'acl' then raise exception 'Installed function changed: %.%',f->>'schema',f->>'name'; end if;
 end loop;
 if not exists(select 1 from pg_policy where polrelid='public.vb_evidence'::regclass and polname='evidence_read'
  and pg_get_expr(polqual,polrelid) like '%m.client_id = vb_evidence.client_id%') then raise exception 'Expected corrected evidence rule'; end if;
end $main_guard$;
`;
// No existing record writes can race the one-time scope snapshot. This is only
// prepared SQL; obtaining these locks would require later application approval.
const resources=['public.vb_bcm_ai_observations','public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews','public.vb_bcm_ai_runs','public.vb_bcm_scans','public.vb_bcm_schedules','public.vb_bcm_settings','public.vb_client_references','public.vb_digest_preferences','public.vb_evidence','public.vb_filing_drafts','public.vb_inbox','public.vb_maintenance_publications','public.vb_marks','public.vb_service_preferences','vb_private.maintenance_drafts','vb_private.watch_findings','vb_private.watch_runs','vb_private.watch_settings'];
if(JSON.stringify(Object.keys(inventory.mapping_inventory[0]?.record_counts||{}).sort())!==JSON.stringify([...resources].sort()))throw Error('Expected reviewed scope resource list.');
const lock=`lock table public.vb_clients,vb_private.client_memberships,${resources.join(',')} in share row exclusive mode;\n`;
const sql=header+lock+mainLabels(parts.join('\n\n'))+'\nnotify pgrst, \'reload schema\';\ncommit;\n';
if(sql.includes('7692130048193495360')||sql.includes('Expected four')||sql.includes('Expected 4'))throw Error('Test-only migration assumption remains.');
if(sql.includes('Fictional Test mapping — October 16, 2026'))throw Error('Test label would violate the Production mapping constraint.');
if((sql.match(/^begin;\s*$/gmi)||[]).length!==1||(sql.match(/^commit;\s*$/gmi)||[]).length!==1)throw Error('Unexpected transaction boundary.');
await writeFile(resolve(out,'prepared-production-apply.sql'),sql);
const contract=JSON.parse(await read('contracts/portal-features.json'));
const production=contract.environments['bcm-production'];
for(const feature of ['member','engagementInvitations','scopedWatch']){
 if(!production.enabled.includes(feature))production.enabled.push(feature);
 production.disabled=production.disabled.filter(f=>f!==feature);
}
production.enabled=production.enabled.filter(f=>f!=='legacyInvitations');
if(!production.disabled.includes('legacyInvitations'))production.disabled.push('legacyInvitations');
await writeFile(resolve(out,'prepared-feature-contract.json'),JSON.stringify(contract,null,2)+'\n');
await writeFile(resolve(out,'package-manifest.json'),JSON.stringify({status:'PREPARED_ONLY_NOT_EXECUTED',mapping_approved:mapping.approved===true,project:'omvkwiosonatswocbdgx',sources,sha256:createHash('sha256').update(sql).digest('hex'),mapped_clients:mapping.rows.length,retired_crawler_dispatcher_preserved:true,policy_content_unchanged:true,hosted_validation:false},null,2)+'\n');
console.log('Prepared private Production SQL; mapping approval flag: '+String(mapping.approved===true)+'. No database action.');
