// Optional local PostgreSQL/WASM harness. No Supabase connection, secrets or user session.
// Install @electric-sql/pglite in a temporary directory; pass its ESM path as PGLITE_MODULE.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.PGLITE_MODULE;
if(!modulePath)throw Error('Set PGLITE_MODULE to a temporary installed @electric-sql/pglite ESM module.');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite();
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
function extract(sql,name){const match=sql.match(new RegExp('create(?: or replace)? function '+name.replaceAll('.','\\.')+'\\([^]*?(?:end (?:\\$\\$|\\$function\\$);|\\n\\$\\$;)','i'));if(!match)throw Error('Missing function '+name);return match[0];}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text);create table auth.mfa_factors(user_id uuid,status text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
 grant usage on schema auth to authenticated,anon,service_role;
 insert into auth.users values('aa000000-0000-0000-0000-000000000001','mithrilzeppelin117@gmail.com'),('aa000000-0000-0000-0000-000000000002','mithrilzeppelin117+newclient@gmail.com'),('aa000000-0000-0000-0000-000000000003','vb-filing-attorney@example.test');`);
 await db.exec(await read('supabase/migrations/20261003000100_client_foundation.sql'));
 let foundation=await read('supabase/proposals/portal-membership/01-test-foundation.sql');
 foundation=foundation.replace(/do \$\$ begin[^]*?end \$\$;/,'');
 await db.exec(foundation);
 await db.exec(`insert into vb_private.staff_members(user_id) values('aa000000-0000-0000-0000-000000000003');
 insert into vb_private.portal_accounts(user_id) select id from auth.users where email not like 'vb-filing%';
 alter table public.vb_engagements add unique(id,client_id);alter table public.vb_matters add unique(id,engagement_id);`);
 let mapping=await read('supabase/proposals/portal-engagement-cutover/01-stage-test-mapping.sql');
 mapping=mapping.slice(mapping.indexOf('create table vb_private.legacy_test_mappings'),mapping.indexOf('-- Use protected existing user IDs'));
 mapping=mapping.replace(' check(enforcement_enabled=false)','').replace('foreign key(client_id,engagement_id,matter_id) references vb_private.legacy_test_mappings(client_id,engagement_id,matter_id)','foreign key(engagement_id,client_id) references public.vb_engagements(id,client_id), foreign key(matter_id,engagement_id) references public.vb_matters(id,engagement_id)');
 await db.exec(mapping);
 await db.exec(await read('supabase/proposals/trademark-watch/setup.sql'));
 const core=await read('supabase/proposals/portal-engagement-cutover/05-test-scope-core.sql');
 await db.exec(core.slice(core.indexOf('create table vb_private.portal_service_bindings'),core.indexOf('-- Active engagement replaces membership')));
 await db.exec(extract(core,'vb_private.is_client_member'));
 const admin=await read('supabase/proposals/portal-engagement-admin/01-test-admin.sql');
 await db.exec(extract(admin,'vb_private.portal_actor_scope'));
 const enforcement=await read('supabase/proposals/portal-engagement-cutover/06-test-service-enforcement.sql');
 for(const name of ['vb_private.watch_access','public.vb_watch_snapshot','public.vb_watch_save','public.vb_watch_run_due'])await db.exec(extract(enforcement,name));
 await db.exec(`create trigger zz_portal_scope after insert or update on vb_private.watch_settings for each row execute function vb_private.portal_scope_new_record('trademark_watch','client_id');
 create trigger zz_portal_scope after insert or update on vb_private.watch_runs for each row execute function vb_private.portal_scope_new_record('trademark_watch','id');
 create trigger zz_portal_scope after insert or update on vb_private.watch_findings for each row execute function vb_private.portal_scope_new_record('trademark_watch','id');
 create trigger zz_portal_scope after insert or update on public.vb_marks for each row execute function vb_private.portal_scope_new_record('portfolio','id');
 create table public.vb_bcm_schedules(client_id uuid,enabled boolean,next_run_at timestamptz,revision integer,last_status text,updated_at timestamptz);
 create table public.vb_digest_preferences(user_id uuid,client_id uuid,next_due_at timestamptz);
 create table public.vb_bcm_ai_runs(id uuid,client_id uuid,status text,finished_at timestamptz);
 create table public.vb_bcm_scans(id uuid,client_id uuid,status text,finished_at timestamptz);`);
 await db.exec(extract(core,'public.vb_close_test_engagement'));
 await db.exec('grant execute on function public.vb_close_test_engagement(uuid,text) to authenticated;');
 const seed=await read('supabase/proposals/watch-engagement-compatibility/local-migration-seed.sql');
 await db.exec(seed);
 let apply=await read('supabase/proposals/watch-engagement-compatibility/prepared-apply.sql');
 const guard=/-- BEGIN HOSTED GUARDS[^]*?-- END HOSTED GUARDS/;
 if(!guard.test(apply))throw Error('Expected hosted metadata guard block');
 apply=apply.replace(guard,'-- Local-only harness: hosted system/fingerprint metadata is not emulated.');
 // Prove the migration refuses missing and mismatched provenance before a successful copy.
 for(const tamper of [
  "delete from vb_private.legacy_test_record_scopes where resource='vb_private.watch_settings' and client_id='f1a00000-0000-0000-0000-000000000001'",
  "update vb_private.watch_settings set mark_ids=array['00000000-0000-0000-0000-000000000001'::uuid] where client_id='f1a00000-0000-0000-0000-000000000001'",
  "delete from vb_private.legacy_test_record_scopes where resource='vb_private.watch_findings' and client_id='f1a00000-0000-0000-0000-000000000001'"
 ]){
  await db.exec('begin;'+tamper+';');let denied=false;
  try{await db.exec(apply);}catch(error){if(!error.message.includes('explicit scope review'))throw error;denied=true;}
  await db.exec('rollback;');if(!denied)throw Error('Migration accepted ambiguous/missing provenance');
 }
 console.log('Migration refused missing settings scope, mismatched mark scope, and missing finding scope.');
 await db.exec(apply);
 await db.exec('begin;');
 await db.exec(await read('supabase/proposals/watch-engagement-compatibility/local-migration-assert.sql'));
 const result=await db.exec(await read('supabase/proposals/watch-engagement-compatibility/05-rollback-checks.sql'));
 console.log(JSON.stringify(result.at(-1).rows,null,2));
 await db.exec('rollback;');
 if(process.argv.includes('--concurrency-preparation')){
  const {verifyPreparedConcurrency}=await import('./watch-concurrency-local.mjs');
  await verifyPreparedConcurrency(db);
 }
 console.log('Local SQL scenarios passed; all scenario fixtures rolled back. Hosted checks remain unrun.');
}catch(error){console.error(error.message);if(error.query)console.error(error.query.slice(-1800));process.exitCode=1;}finally{await db.close();}
