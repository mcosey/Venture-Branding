// Catalog inspection only: no credentials, network calls, migrations or app RPCs.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const manifest=JSON.parse(await readFile(new URL('../contracts/portal-features.json',import.meta.url),'utf8'));
export const catalogSql=`begin transaction read only;
select jsonb_build_object(
 'database_id',(select system_identifier::text from pg_control_system()),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'search_path_set',exists(select 1 from unnest(p.proconfig) c where c like 'search_path=%'))),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity)),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p'))
) as contract_snapshot;
commit;
`;
export function checkContracts(environment,snapshot,workers){
 const target=manifest.environments[environment];if(!target)throw Error('Unknown contract environment.');
 const issues=[];
 if(snapshot?.database_id!==target.database_id)return {environment,passed:false,issues:['Database identity does not match the selected environment.']};
 for(const feature of target.enabled){
  const spec=manifest.features[feature];
  for(const required of spec.functions){
   const found=(snapshot.functions||[]).find(x=>x.name===required.name&&x.arguments===required.arguments);
   if(!found){issues.push(feature+': missing public.'+required.name);continue;}
   for(const field of ['definer','authenticated_execute'])if(found[field]!==required[field])issues.push(feature+': unexpected '+field+' for '+required.name);
   if(found.anon_execute!==false)issues.push(feature+': anonymous execution must be denied for '+required.name);
   if(required.definer&&found.search_path_set!==true)issues.push(feature+': explicit search path not verified for '+required.name);
  }
  for(const required of spec.tables){const found=(snapshot.tables||[]).find(x=>x.name===required.name);if(!found||found.rls!==true)issues.push(feature+': missing RLS table public.'+required.name);}
  for(const name of spec.workers||[]){if(workers?.project_ref!==target.project_ref||!workers.names?.includes(name))issues.push(feature+': deployed worker unverified: '+name);}
 }
 return {environment,passed:issues.length===0,issues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [action,environment,catalogPath,workerPath]=process.argv.slice(2);
 if(action==='--sql'){process.stdout.write(catalogSql);}
 else if(action==='--check'&&catalogPath){const snapshot=JSON.parse(await readFile(catalogPath,'utf8')),workers=workerPath?JSON.parse(await readFile(workerPath,'utf8')):null;const result=checkContracts(environment,snapshot,workers);console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
 else throw Error('Use --sql or --check bcm-test|bcm-production catalog.json workers.json');
}
