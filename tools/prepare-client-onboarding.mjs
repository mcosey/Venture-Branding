// Assemble review files only. No database, network, process launch or installation.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const directory=process.argv[2];
if(!directory)throw Error('Supply a private review output directory outside the repository.');
const output=resolve(directory),repository=resolve(new URL('..',import.meta.url).pathname);
if(output===repository||output.startsWith(repository+'/'))throw Error('Review output must stay outside the repository.');
const read=name=>readFile(new URL('../supabase/proposals/client-onboarding/'+name,import.meta.url),'utf8');
const apply=await read('01-prepared-apply.sql'),checks=await read('02-rollback-checks.sql');
const body=apply.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
const resources=['public.vb_clients','public.vb_marks','public.vb_member_profiles','public.vb_member_companies','public.vb_member_progress','public.vb_engagements','public.vb_matters','public.vb_service_preferences','vb_private.portal_accounts','vb_private.portal_test_onboarding','vb_private.engagement_grants','vb_private.engagement_services','vb_private.engagement_invitations','vb_private.portal_engagement_drafts','vb_private.client_memberships','vb_private.legacy_test_mappings','vb_private.portal_service_bindings','vb_private.portal_lifecycle_events','vb_private.audit_events'];
const snapshot=`create function pg_temp.onboarding_snapshot() returns jsonb language plpgsql as $snapshot$
declare resource text; fingerprint text; result jsonb:='{}'::jsonb;
begin
 foreach resource in array array[${resources.map(name=>"'"+name+"'").join(',')}] loop
  execute format('select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,''[]'')) from %s t',resource::regclass) into fingerprint;
  result:=result||jsonb_build_object(resource,fingerprint);
 end loop;
 if to_regclass('vb_private.portal_client_onboarding') is not null then
  execute 'select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,''[]'')) from vb_private.portal_client_onboarding t' into fingerprint;
  result:=result||jsonb_build_object('vb_private.portal_client_onboarding',fingerprint);
 end if;
 return result||jsonb_build_object('auth_ids',(select md5(coalesce(jsonb_agg(id order by id)::text,'[]')) from auth.users),
 'functions',(select md5(coalesce(jsonb_agg(jsonb_build_array(p.oid,p.prosrc,p.proacl,p.prosecdef,p.proconfig) order by p.oid)::text,'[]')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','vb_private')),
 'table_permissions',(select md5(coalesce(jsonb_agg(jsonb_build_array(c.oid,c.relrowsecurity,c.relforcerowsecurity,c.relacl) order by c.oid)::text,'[]')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private') and c.relkind in('r','p')));
end $snapshot$;
create temporary table onboarding_baseline as select pg_temp.onboarding_snapshot() as value;
`;
const preserved=`do $preservation$ begin
 if pg_temp.onboarding_snapshot() is distinct from (select value from onboarding_baseline)
 then raise exception 'Existing data, Auth IDs, functions or table permissions changed';end if;
end $preservation$;
select true as existing_records_preserved,true as auth_ids_preserved,true as permissions_preserved;
`;
const rehearsal=`-- PREPARED, NOT EXECUTED. All changes and fictional fixtures roll back.
begin;
set local lock_timeout='3s';set local statement_timeout='30s';
${snapshot}savepoint onboarding_package;
${body}
${checks}
rollback to savepoint onboarding_package;
${preserved}
do $objects$ begin
 if to_regclass('vb_private.portal_client_onboarding') is not null
 or to_regprocedure('public.vb_onboard_client(jsonb,uuid)') is not null
 or to_regprocedure('public.vb_member_onboarding_complete()') is not null
 then raise exception 'Proposal objects did not roll back';end if;
end $objects$;
select true as proposed_objects_rolled_back;
rollback;
`;
const verification=`-- PREPARED, NOT EXECUTED. Verify the installed package with rollback fixtures.
begin;
set local lock_timeout='3s';set local statement_timeout='30s';
${snapshot}savepoint onboarding_fixtures;
${checks}
rollback to savepoint onboarding_fixtures;
${preserved}rollback;
`;
await mkdir(output,{recursive:true});
await writeFile(output+'/01-rollback-rehearsal.sql',rehearsal);
await writeFile(output+'/02-apply.sql',apply);
await writeFile(output+'/03-installed-verification.sql',verification);
await writeFile(output+'/preparation.json',JSON.stringify({prepared:true,executed:false,fixtureActors:6,fixtureClients:3,checks:(checks.match(/select pg_temp\.onboarding_(?:check|denied)\(/g)||[]).length,sourceHashes:{apply:createHash('sha256').update(apply).digest('hex'),checks:createHash('sha256').update(checks).digest('hex')},limits:['No database contacted','No email or provider calls','No software installed','Rollback can advance existing audit sequence counters; existing rows remain unchanged']},null,2)+'\n');
console.log('Prepared rehearsal, application and installed-verification SQL. No database contacted.');
