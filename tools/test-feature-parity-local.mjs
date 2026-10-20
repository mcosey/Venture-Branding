// Isolated PostgreSQL/WASM checks. No network, Supabase session or external data.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
if(!process.env.PGLITE_MODULE)throw Error('Set PGLITE_MODULE to the already installed local PGlite ESM path.');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
function extract(sql,name){
 const escaped=name.replaceAll('.','\\.');const start=sql.search(new RegExp('create(?: or replace)? function '+escaped+'\\(','i'));if(start<0)throw Error('Missing maintained function '+name);
 const rest=sql.slice(start),opening=rest.match(/\bas\s+(\$[a-z_]*\$)/i);if(!opening)throw Error('Missing SQL body');
 const end=rest.indexOf(opening[1]+';',opening.index+opening[0].length);return rest.slice(0,end+opening[1].length+1);
}
const withoutIdentity=sql=>sql.replace(/-- BEGIN HOSTED IDENTITY GUARD[^]*?-- END HOSTED IDENTITY GUARD/g,'');
const packagePath='supabase/proposals/test-feature-parity/';
let assertionCount=0;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
 grant usage on schema auth to anon,authenticated,service_role;`);
 await db.exec(await read('supabase/migrations/20261003000100_client_foundation.sql'));
 let membership=await read('supabase/proposals/portal-membership/01-test-foundation.sql');
 membership=membership.replace(/do \$\$ begin[^]*?end \$\$;/,'');await db.exec(membership);
 await db.exec('alter table public.vb_engagements add unique(id,client_id);alter table public.vb_matters add unique(id,engagement_id);');
 let mappings=await read('supabase/proposals/portal-engagement-cutover/01-stage-test-mapping.sql');
 mappings=mappings.slice(mappings.indexOf('create table vb_private.legacy_test_mappings'),mappings.indexOf('-- Use protected existing user IDs'));
 mappings=mappings.replace(' check(enforcement_enabled=false)','').replace('foreign key(client_id,engagement_id,matter_id) references vb_private.legacy_test_mappings(client_id,engagement_id,matter_id)','foreign key(engagement_id,client_id) references public.vb_engagements(id,client_id),foreign key(matter_id,engagement_id) references public.vb_matters(id,engagement_id)');
 await db.exec(mappings);
 const scope=await read('supabase/proposals/portal-engagement-cutover/05-test-scope-core.sql');
 await db.exec(scope.slice(scope.indexOf('create table vb_private.portal_service_bindings'),scope.indexOf('insert into vb_private.portal_service_bindings')));
 for(const name of ['portal_actor_scope','portal_service_actor','portal_record_actor','portal_record_read','portal_row_read','portal_scope_new_record','is_client_member'])await db.exec(extract(scope,'vb_private.'+name));
 const admin=await read('supabase/proposals/portal-engagement-admin/01-test-admin.sql');
 await db.exec(extract(admin,'vb_private.portal_actor_scope'));
 // Match the installed all-features initialization, not only its access helper.
 for(const name of ['portal_full_feature_row','portal_include_all_features'])await db.exec(extract(admin,'vb_private.'+name));
 await db.exec(`create trigger portal_full_feature_row before insert or update on vb_private.engagement_services for each row execute function vb_private.portal_full_feature_row();
 create trigger portal_include_all_features after insert on public.vb_engagements for each row execute function vb_private.portal_include_all_features();`);
 const prerequisites=withoutIdentity(await read(packagePath+'00a-prepared-import-prerequisites.sql'));
 const innerPrerequisites=prerequisites.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
 const seed=`insert into public.vb_clients(id,name,client_type,contact_name) values('df190002-0000-0000-0000-000000000009','Existing prerequisite fixture','business','Fixture');
 insert into public.vb_marks(id,client_id,name,application_number) values('df190005-0000-0000-0000-000000000009','df190002-0000-0000-0000-000000000009','Existing mark','01991809');`;
 const reject=async(sql,pattern)=>{let rejected=false;try{await db.exec(sql);}catch(error){rejected=pattern.test(error.message);await db.exec('rollback;');}if(!rejected)throw Error('Expected prerequisite rejection: '+pattern);};
 await reject('begin;'+seed+`insert into public.vb_marks(client_id,name,application_number) values('df190002-0000-0000-0000-000000000009','Duplicate mark','01991809');`+innerPrerequisites,/Existing duplicate application/);
 await reject('begin;alter table public.vb_marks add column filing_date date;'+innerPrerequisites,/prerequisites changed/);
 await db.exec('begin;'+seed);
 const before=(await db.query('select to_jsonb(m) as record from public.vb_marks m')).rows[0].record;
 await db.exec('savepoint prerequisite_rehearsal;'+innerPrerequisites);
 const after=(await db.query("select to_jsonb(m)-array['filing_date','registration_date','uspto_status_date'] as record,filing_date is null and registration_date is null and uspto_status_date is null as dates_empty from public.vb_marks m")).rows[0];
 if(JSON.stringify(before)!==JSON.stringify(after.record)||!after.dates_empty)throw Error('Prerequisites changed existing mark values');
 await db.exec('rollback to savepoint prerequisite_rehearsal;');
 if((await db.query("select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='vb_marks' and column_name in('filing_date','registration_date','uspto_status_date')")).rows[0].count!==0)throw Error('Schema additions did not roll back');
 await db.exec('rollback;');
 // Give the assembled wrapper nonempty existing data to preserve.
 await db.exec(seed);
 const baselineRecord=(await db.query('select to_jsonb(m) as record from public.vb_marks m')).rows[0].record;
 await db.exec(`create trigger zz_portal_scope after insert or update on public.vb_marks for each row execute function vb_private.portal_scope_new_record('portfolio','id');
 create policy parity_scoped_marks on public.vb_marks as restrictive for all to authenticated using(vb_private.portal_row_read(client_id,'public.vb_marks',jsonb_build_object('id',id),'portfolio'));
 grant execute on function vb_private.portal_row_read(uuid,text,jsonb,text) to authenticated;`);
 const rehearsal=await db.exec(withoutIdentity(await read(packagePath+'03-prepared-hosted-rehearsal.sql')));
 const rehearsalReport=rehearsal.flatMap(x=>x.rows||[]).find(x=>x.existing_application_data_preserved!==undefined);
 if(!rehearsalReport?.all_passed||!rehearsalReport.existing_application_data_preserved||!rehearsalReport.schema_permissions_preserved||!rehearsalReport.auth_user_ids_preserved||Number(rehearsalReport.assertions)!==18)throw Error('Hosted wrapper failed local rehearsal');
 const retained=(await db.query('select to_jsonb(m) as record from public.vb_marks m')).rows;
 if(retained.length!==1||JSON.stringify(retained[0].record)!==JSON.stringify(baselineRecord))throw Error('Rehearsal removed or altered baseline fixture');
 // Local isolated database only; remove the seed before the separate installed-state checks.
 await db.exec('delete from public.vb_marks;delete from vb_private.audit_events;delete from public.vb_service_preferences;delete from public.vb_clients;');
 await db.exec(prerequisites);
 await reject(prerequisites,/prerequisites changed/);
 const apply=withoutIdentity(await read(packagePath+'01-prepared-apply.sql'));
 // Guards must reject an incomplete prerequisite and roll back everything.
 await db.exec('alter table public.vb_marks drop column filing_date;');
 let rejected=false;try{await db.exec(apply);}catch(error){rejected=/Missing date prerequisite/.test(error.message);await db.exec('rollback;');}if(!rejected)throw Error('Missing prerequisite did not reject');
 // Verify the exact persistent assembly, including atomic rollback on later drift.
 await db.exec('drop index public.vb_marks_client_application_unique;alter table public.vb_marks drop column registration_date,drop column uspto_status_date;');
 const installation=withoutIdentity(await read(packagePath+'04-prepared-hosted-install.sql'));
 await db.exec("create function public.vb_update_my_contact(uuid,timestamptz,text,text) returns void language sql as $$select$$;");
 await reject(installation,/Parity functions already exist/);
 if((await db.query("select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='vb_marks' and column_name in('filing_date','registration_date','uspto_status_date')")).rows[0].count!==0)throw Error('Failed atomic install retained date fields');
 if((await db.query("select to_regclass('public.vb_marks_client_application_unique') is null as absent")).rows[0].absent!==true)throw Error('Failed atomic install retained unique index');
 await db.exec('drop function public.vb_update_my_contact(uuid,timestamptz,text,text);');
 await db.exec(installation);
 // Reapplication cannot replace an installed function.
 rejected=false;try{await db.exec(apply);}catch(error){rejected=/already exist/.test(error.message);await db.exec('rollback;');}if(!rejected)throw Error('Repeat installation did not reject');
 const results=await db.exec(withoutIdentity(await read(packagePath+'05-prepared-installed-verification.sql')));
 const report=results.flatMap(x=>x.rows||[]).find(x=>x.assertions!==undefined);if(!report?.all_passed||!report.existing_application_data_preserved||!report.schema_permissions_preserved||!report.auth_user_ids_preserved)throw Error('No complete installed-state preservation result');assertionCount=report.assertions;
 const remaining=await db.query("select (select count(*) from auth.users) as users,(select count(*) from public.vb_clients) as clients,(select count(*) from public.vb_marks) as marks");
 if(Object.values(remaining.rows[0]).some(x=>x!==0))throw Error('Rollback left fixture records');
 console.log(JSON.stringify({status:'local-only',assertions:assertionCount,guard_checks:6,prerequisite_preservation_checks:2,assembled_rehearsal:rehearsalReport,atomic_install_rollback_verified:true,persistent_assembly_verified:true,rollback_empty:true,limitations:'One local database session; not a hosted concurrency or Auth/email walkthrough. Sequence counters are not restored by PostgreSQL rollback.'}));
}catch(error){console.error(JSON.stringify({status:'failed',message:error.message,code:error.code,detail:error.detail}));process.exitCode=1;
}finally{await db.close();}
