// Local preparation only. No network, credentials, database connection or account creation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {PROJECT,UUID,CASES,PAYLOAD,business,ensure,validateManifest,exactKeys,safeEvidence} from './contract.mjs';
import {digest,splitSql,code,schemaDigestSql,preflightSql,verifyDashboardTarget,loadSources} from '../brand-map-hosted/package.mjs';
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const j=s=>q(JSON.stringify(s))+'::jsonb';
const table='vb_private.brand_map_signin_runs';
const dates=['filing_date','registration_date','uspto_status_date'];
const fn=['public.vb_read_brand_map(uuid)','public.vb_save_brand_asset(uuid,uuid,bigint,jsonb)','public.vb_set_brand_parent(uuid,uuid,uuid,bigint)','public.vb_confirm_brand_relationship(uuid,uuid,bigint)','public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb)','vb_private.brand_map_touch()','vb_private.brand_map_initialize_slots()','vb_private.brand_map_can_read(uuid)','vb_private.brand_map_lock_write(uuid,boolean)','vb_private.brand_map_mark_fingerprint(public.vb_marks)'];
const tables=['public.vb_brand_legal_links','public.vb_brand_relationships','public.vb_brand_assets'];
const hash='21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3';
const ext="select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e";
const list=a=>a.map(x=>q(x)+'::uuid').join(',');
const userIds=m=>Object.values(m.users).map(u=>u.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__');
const clientIds=m=>Object.values(m.clients);
const assetIds=m=>Object.values(m.assets).flat();
const markIds=m=>Object.values(m.marks).flat();
export function manifest(run=randomUUID()){
 const label='bm-login-'+run;
 return {prepared_only:true,project:PROJECT,run_id:run,label,users:{A:{id:null,email:label+'-a@example.invalid'},B:{id:null,email:label+'-b@example.invalid'}},clients:{A:randomUUID(),B:randomUUID(),C:randomUUID()},assets:{A:[randomUUID(),randomUUID()],B:[randomUUID()]},marks:{A:[randomUUID(),randomUUID()],B:[randomUUID()]},unknown_client:randomUUID()};
}
export function bindAccounts(m,observed){
 validateManifest(m);ensure(exactKeys(observed,['A','B']),'Two observed accounts required.');
 const next=structuredClone(m);for(const actor of ['A','B']){const u=observed[actor];ensure(exactKeys(u,['id','email','confirmed','created_for_this_run']) && u.confirmed===true && u.created_for_this_run===true && u.email===m.users[actor].email && UUID.test(u.id),'Use only the two supported, newly created, confirmed disposable accounts.');next.users[actor].id=u.id;}
 validateManifest(next,true);return next;
}
function options(m,o={}){
 validateManifest(m,o.approved===true);
 if(o.approved!==true)return {enabled:false,identity:'__FRESH_TEST_CLUSTER_PIN__',schema:'__FRESH_TEST_SCHEMA_PIN__'};
 verifyDashboardTarget(o.observedUrl);ensure(o.testWindowConfirmed===true && o.accountsApproved===true && /^[1-9][0-9]{14,19}$/.test(o.databaseIdentity||'') && /^[a-f0-9]{64}$/.test(o.schemaDigest||''),'Separate account/access approval, coordinated window and fresh Test pins required.');
 return {enabled:true,identity:o.databaseIdentity,schema:o.schemaDigest};
}
function start(m,o={},label='setup',readOnly=false){const p=options(m,o);return `-- Prepared only. Verify exact BCM Test SQL editor independently; no production work.
begin${readOnly?' read only':''};
set local statement_timeout='30s';
set local lock_timeout='3s';
set local idle_in_transaction_session_timeout='30s';
set local application_name=${q(m.label+'-'+label)};
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_login_target$ begin
 if ${p.enabled} is not true then raise exception 'Prepared copy blocked: separate live testing approval required'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from ${q(p.identity)} then raise exception 'Unexpected Test target'; end if;
end $bm_login_target$;
`;}
function locks(){return `do $bm_login_locks$ declare r record; begin
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) order by n.nspname,c.relname loop execute format('lock table %I.%I in share row exclusive mode',r.nspname,r.relname); end loop;
end $bm_login_locks$;
`;}
function snapshot(m){return `create function pg_temp.brand_map_signin_snapshot() returns jsonb language plpgsql set search_path='' as $bm_login_snapshot$
declare result jsonb:='{}'::jsonb; r record; filter_sql text; row_sql text; cnt bigint; bytes bigint; dig text; ignored text[];
begin
 select coalesce(array_agg(v),'{}'::text[]) into ignored from jsonb_array_elements_text(coalesce(nullif(current_setting('vb_brand_map.signin_ignored_dates',true),''),'[]')::jsonb) v;
 if not ignored <@ array['filing_date','registration_date','uspto_status_date']::text[] then raise exception 'Unexpected normalization'; end if;
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) and c.relname not in ('brand_map_signin_runs','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links') order by n.nspname,c.relname loop
  filter_sql:=format('not (coalesce(to_jsonb(t)->>''client_id'' in (%L,%L,%L),false) or (%L=''public'' and %L=''vb_clients'' and to_jsonb(t)->>''id'' in (%L,%L,%L)) or (%L=''auth'' and %L=''users'' and to_jsonb(t)->>''id'' in (%L,%L)))',${clientIds(m).map(q).join(',')},r.nspname,r.relname,${clientIds(m).map(q).join(',')},r.nspname,r.relname,${userIds(m).map(q).join(',')});
  row_sql:=case when r.nspname='public' and r.relname='vb_marks' then format('(to_jsonb(t)-%L::text[])',ignored) else 'to_jsonb(t)' end;
  execute format('select count(*),coalesce(sum(octet_length(%s::text)),0) from %I.%I t where %s',row_sql,r.nspname,r.relname,filter_sql) into cnt,bytes;
  if cnt>10000 or bytes>16777216 then raise exception 'Snapshot beyond reviewed bounds'; end if;
  execute format('select encode(sha256(convert_to(coalesce(string_agg(%s::text,E''\\n'' order by %s::text),''''),''UTF8'')),''hex'') from %I.%I t where %s',row_sql,row_sql,r.nspname,r.relname,filter_sql) into dig;
  result:=result||jsonb_build_object(r.nspname||'.'||r.relname,jsonb_build_object('count',cnt,'digest',dig));
 end loop;return result;
end $bm_login_snapshot$;
`;}
function fixturesSnapshot(m){return `(select jsonb_build_object('assets',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_brand_assets t where id in (${list(assetIds(m))})),'relationships',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_brand_relationships t where child_asset_id in (${list(assetIds(m))})),'links',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_brand_legal_links t where asset_id in (${list(assetIds(m))})),'marks',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_marks t where id in (${list(markIds(m))}))))`;}
function guard(m){return `do $bm_login_run$ declare r jsonb; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid;
 if (select count(*) from ${table})<>1 or r->'manifest' is distinct from ${j(m)} or r->>'draft_hash' is distinct from ${q(hash)} or (${schemaDigestSql}) is distinct from r->>'installed_schema' then raise exception 'Ownership/schema changed; stop'; end if;
end $bm_login_run$;
`;}
function accountsGuard(m,absent=false){return `do $bm_login_accounts$ begin
 ${absent?`if exists(select 1 from auth.users where id in (${list(userIds(m))}) or email in (${Object.values(m.users).map(u=>q(u.email)).join(',')})) then raise exception 'Remove disposable accounts through supported Auth administration first'; end if;`:`${['A','B'].map(a=>`if not exists(select 1 from auth.users where id=${q(m.users[a].id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid and email=${q(m.users[a].email)} and email_confirmed_at is not null and coalesce(encrypted_password,'')<>'') then raise exception 'Disposable confirmed account ${a} differs'; end if;`).join('\n')}
 if exists(select 1 from vb_private.staff_members where user_id in (${list(userIds(m))})) then raise exception 'Test accounts must have no staff access'; end if;`}
end $bm_login_accounts$;
`;}
export function setup(m,migration,o={}){
 ensure(digest(migration)===hash,'Reviewed backend changed.');const p=options(m,o);
 const pre=splitSql(preflightSql()).map(code).find(s=>s.startsWith('select jsonb_build_object(')).replace(/ as brand_map_readonly_preflight;$/,'');
 return start(m,o)+locks()+snapshot(m)+accountsGuard(m)+`do $bm_login_setup$ declare pre jsonb; begin
 if (${schemaDigestSql}) is distinct from ${q(p.schema)} or to_regclass(${q(table)}) is not null or to_regclass('vb_private.brand_map_race_runs') is not null then raise exception 'Fresh schema changed or another test run exists'; end if;
 pre:=(${pre});
 if not(pre->'missing_columns' <@ ${j(dates.map(d=>'public.vb_marks.'+d))}) or pre->'missing_functions'<>'[]'::jsonb or pre->'brand_map_collisions'<>'[]'::jsonb or pre->>'client_and_mark_rls'<>'true' then raise exception 'Dependencies/permissions differ'; end if;
 if exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname in ('filing_date','registration_date','uspto_status_date') and not attisdropped and atttypid<>'date'::regtype) then raise exception 'Unexpected date type'; end if;
 if exists(select 1 from public.vb_clients where id in (${list([...clientIds(m),m.unknown_client])})) or exists(select 1 from vb_private.client_memberships where user_id in (${list(userIds(m))})) or exists(select 1 from vb_private.audit_events where actor_id in (${list(userIds(m))})) or exists(select 1 from public.vb_marks where id in (${list(markIds(m))})) then raise exception 'Fixtures/accounts already in use'; end if;
 perform set_config('vb_brand_map.signin_baseline_schema',(${schemaDigestSql}),true);
 perform set_config('vb_brand_map.signin_ignored_dates','[]',true);
 perform set_config('vb_brand_map.signin_baseline_rows',pg_temp.brand_map_signin_snapshot()::text,true);
 perform set_config('vb_brand_map.signin_extensions',(${ext})::text,true);
 perform set_config('vb_brand_map.signin_added_dates',(select coalesce(jsonb_agg(col),'[]'::jsonb)::text from unnest(array['filing_date','registration_date','uspto_status_date']) col where not exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname=col and not attisdropped)),true);
end $bm_login_setup$;
do $bm_login_dates$ declare col text; begin for col in select jsonb_array_elements_text(current_setting('vb_brand_map.signin_added_dates')::jsonb) loop execute format('alter table public.vb_marks add column %I date',col); end loop;end $bm_login_dates$;
${splitSql(migration).slice(2,-1).join('\n')}
create table ${table}(run_id uuid primary key,payload jsonb not null);
alter table ${table} enable row level security;
revoke all on ${table} from public,anon,authenticated,service_role;
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values ${['A','B','C'].map(a=>`(${q(m.clients[a])}::uuid,${q(m.label+'-'+a)},'business','Synthetic access fixture',true)`).join(',')};
insert into vb_private.client_memberships(client_id,user_id) values (${q(m.clients.A)}::uuid,${q(m.users.A.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid),(${q(m.clients.C)}::uuid,${q(m.users.A.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid),(${q(m.clients.B)}::uuid,${q(m.users.B.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid);
insert into public.vb_brand_assets(id,client_id,name,kind,business_use,source_kind) values ${['A','B'].flatMap(a=>m.assets[a].map((id,i)=>`(${q(id)}::uuid,${q(m.clients[a])}::uuid,${q(a==='A'&&i===1?PAYLOAD:m.label+'-'+a+'-asset-'+i)},'product','in_use','manual_client')`)).join(',')};
insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner) values ${['A','B'].flatMap(a=>m.marks[a].map((id,i)=>`(${q(id)}::uuid,${q(m.clients[a])}::uuid,${q(m.label+'-'+a+'-mark-'+i)},'word','inactive','Test owner')`)).join(',')};
insert into ${table} select ${q(m.run_id)}::uuid,jsonb_build_object('manifest',${j(m)},'draft_hash',${q(hash)},'baseline_schema',current_setting('vb_brand_map.signin_baseline_schema'),'baseline_rows',current_setting('vb_brand_map.signin_baseline_rows')::jsonb,'baseline_extensions',current_setting('vb_brand_map.signin_extensions')::jsonb,'added_dates',current_setting('vb_brand_map.signin_added_dates')::jsonb,'installed_schema',(${schemaDigestSql}),'initial_fixtures',${fixturesSnapshot(m)},'A_revoked',false,'B_disabled',false,'state_verified',false,'data_cleaned',false);
drop function pg_temp.brand_map_signin_snapshot();
select jsonb_build_object('status','SETUP_CREATED','run_id',${q(m.run_id)},'project',${q(PROJECT)},'database_identity',(select system_identifier::text from pg_control_system()),'installed_schema',(${schemaDigestSql}),'logins_tested',0) as brand_map_signin_setup;
commit;
`;}
export function withdraw(m,actor,o={}){
 ensure(['A','B'].includes(actor),'Unknown client.');return start(m,o,actor+'-withdraw')+guard(m)+accountsGuard(m)+`do $bm_login_withdraw$ declare r jsonb; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 if r->>${q(actor==='A'?'A_revoked':'B_disabled')} is distinct from 'false' or r->>'data_cleaned' is distinct from 'false' then raise exception 'Action already performed or cleanup started'; end if;
 if not exists(select 1 from public.vb_clients where id=${q(m.clients[actor])}::uuid and name=${q(m.label+'-'+actor)} and portal_enabled and archived_at is null) then raise exception 'Fixture client changed'; end if;
 ${actor==='A'?`update vb_private.client_memberships set active=false where client_id=${q(m.clients.A)}::uuid and user_id=${q(m.users.A.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid and active;`:`update public.vb_clients set portal_enabled=false where id=${q(m.clients.B)}::uuid and portal_enabled;`}
 if not found then raise exception 'Expected fixture access absent'; end if;
 update ${table} set payload=jsonb_set(payload,array[${q(actor==='A'?'A_revoked':'B_disabled')}],'true'::jsonb) where run_id=${q(m.run_id)}::uuid;
end $bm_login_withdraw$;
select jsonb_build_object('status','FIXTURE_ACCESS_WITHDRAWN','run_id',${q(m.run_id)},'actor',${q(actor)}) as brand_map_signin_access;
commit;
`;}
export function verifyReports(m,reports){
 validateManifest(m,true);ensure(exactKeys(reports,['A','B']),'Both client reports required.');
 for(const actor of ['A','B']){
  const r=reports[actor];ensure(exactKeys(r,['prepared_only','project','run_id','actor','phase','created_asset','real_signins','cases']) && r.prepared_only===false && r.project===PROJECT && r.run_id===m.run_id && r.actor===actor && r.phase==='complete' && r.real_signins===2 && UUID.test(r.created_asset),'Incomplete live report.');
  const counts={'A-own-read':1,'B-own-read':1,'A-empty-read':1,'A-foreign-read':2,'B-foreign-read':2,'A-own-create':2,'B-own-create':2,'A-foreign-create':1,'A-foreign-save':2,'A-foreign-parent':1,'A-foreign-confirm':1,'B-foreign-write':6,'A-legal-review':3,'A-forged-fields':4,'A-stale-save':2,'raw-table-denials':12,'private-helper-denials':3,'anonymous-denials':17,'A-revoked-session':2,'B-disabled-portal':2,'signout-clears-test-view':1,'payload-safe-rendering':1};
  const expected=CASES.filter(id=>id.startsWith(actor+'-') || ['raw-table-denials','private-helper-denials','anonymous-denials','signout-clears-test-view'].includes(id) || (actor==='A'&&id==='payload-safe-rendering'));
  ensure(Array.isArray(r.cases) && r.cases.length===expected.length && new Set(r.cases.map(x=>x.case_id)).size===expected.length && r.cases.every(x=>safeEvidence(x).actor===actor && expected.includes(x.case_id) && x.checks===counts[x.case_id] && x.fresh_logins===(x.case_id.endsWith('-own-read') || x.case_id.endsWith('-foreign-read') || x.case_id==='A-empty-read'?1:2)),'Missing or duplicate checks.');
 }
 const ids=[reports.A.created_asset,reports.B.created_asset];ensure(new Set(ids).size===2 && ![...assetIds(m),...clientIds(m),...markIds(m),...userIds(m)].some(id=>ids.includes(id)),'Created assets collide.');
 return ids;
}
function expectedCreates(m,ids){return ['A','B'].map((a,i)=>`exists(select 1 from public.vb_brand_assets where id=${q(ids[i])}::uuid and client_id=${q(m.clients[a])}::uuid and name=${q(m.label+'-'+a+(a==='A'?'-saved':'-created'))} and kind='product' and description='' and business_use='in_use' and source_kind='manual_client' and version=${a==='A'?2:1} and identity_revision=${a==='A'?2:1})`).join(' and ');}
function fullState(m,ids){const all=[...assetIds(m),...ids];return `do $bm_login_state$ declare r jsonb; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 if r->>'A_revoked' is distinct from 'true' or r->>'B_disabled' is distinct from 'true' or r->>'data_cleaned' is distinct from 'false' then raise exception 'Access-check prerequisites absent'; end if;
 if ${fixturesSnapshot(m)} is distinct from r->'initial_fixtures' then raise exception 'Rejected operations changed initial fixtures'; end if;
 if (select count(*) from public.vb_brand_assets)<>5 or exists(select 1 from public.vb_brand_assets where id not in (${list(all)})) or not (${expectedCreates(m,ids)}) then raise exception 'Unexpected successful/rejected asset writes'; end if;
 if (select count(*) from public.vb_brand_relationships)<>5 or (select count(*) from public.vb_brand_legal_links)<>5 or exists(select 1 from public.vb_brand_relationships where child_asset_id not in (${list(all)}) or parent_asset_id is not null or state is not null or version<>1 or confirmed_by is not null or confirmed_at is not null) or exists(select 1 from public.vb_brand_legal_links where asset_id not in (${list(all)}) or mark_id is not null or version<>1 or reviewed_by is not null or reviewed_at is not null) then raise exception 'Rejected relationship/legal writes changed state'; end if;
 if (select count(*) from public.vb_marks where client_id in (${list(clientIds(m))}))<>3 then raise exception 'Unexpected mark write'; end if;
 if (select count(*) from vb_private.client_memberships where client_id in (${list(clientIds(m))}))<>3 or not exists(select 1 from vb_private.client_memberships where client_id=${q(m.clients.A)}::uuid and user_id=${q(m.users.A.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid and not active) or not exists(select 1 from vb_private.client_memberships where client_id=${q(m.clients.C)}::uuid and user_id=${q(m.users.A.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid and active) or not exists(select 1 from vb_private.client_memberships where client_id=${q(m.clients.B)}::uuid and user_id=${q(m.users.B.id||'__OBSERVED_AUTH_USER_ID_REQUIRED__')}::uuid and active) then raise exception 'Unexpected access state'; end if;
 ${['A','B','C'].map(a=>`if not exists(select 1 from public.vb_clients where id=${q(m.clients[a])}::uuid and name=${q(m.label+'-'+a)} and portal_enabled=${a!=='B'} and archived_at is null) then raise exception 'Client fixture changed'; end if;`).join('\n')}
end $bm_login_state$;
`;}
export function verification(m,reports=null,o={}){
 ensure(o.approved!==true || reports!==null,'Live verification/cleanup requires both complete, safe reports.');
 const ids=reports?verifyReports(m,reports):['__A_CREATED_ASSET_REQUIRED__','__B_CREATED_ASSET_REQUIRED__'];
 return start(m,o,'verify')+locks()+guard(m)+accountsGuard(m)+snapshot(m)+fullState(m,ids)+`do $bm_login_verified$ declare r jsonb; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 perform set_config('vb_brand_map.signin_ignored_dates',(r->'added_dates')::text,true);
 if pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' then raise exception 'Parallel records changed; review preservation before continuing'; end if;
 update ${table} set payload=payload||jsonb_build_object('state_verified',true,'created_assets',${j(ids)},'browser_reports',${reports?j(reports):'null::jsonb'}) where run_id=${q(m.run_id)}::uuid;
end $bm_login_verified$;
drop function pg_temp.brand_map_signin_snapshot();
select jsonb_build_object('status','STATE_VERIFIED','run_id',${q(m.run_id)},'cases',22,'rejected_writes_unchanged',true,'preexisting_rows_preserved',true) as brand_map_signin_verification;
commit;
`;}
function safety(m,ids){const all=[...assetIds(m),...ids];return `do $bm_login_safety$ declare r jsonb; rel record; unexpected boolean; col text; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 perform set_config('vb_brand_map.signin_ignored_dates',(r->'added_dates')::text,true);
 if pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' then raise exception 'Preexisting rows changed; stop cleanup for review'; end if;
 if exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and datname=current_database() and application_name like ${q(m.label+'-%')} and state<>'idle') then raise exception 'Run SQL batch active'; end if;
 if exists(select 1 from vb_private.client_memberships where user_id in (${list(userIds(m))}) and client_id not in (${list(clientIds(m))})) or exists(select 1 from vb_private.staff_members where user_id in (${list(userIds(m))})) then raise exception 'Test accounts adopted elsewhere'; end if;
 if exists(select 1 from vb_private.audit_events where actor_id in (${list(userIds(m))}) and client_id not in (${list(clientIds(m))})) or exists(select 1 from vb_private.audit_events where client_id in (${list(clientIds(m))}) and ((actor_id is not null and actor_id not in (${list(userIds(m))})) or current_data->>'client_id' is distinct from client_id::text and table_name<>'vb_clients' or (table_name='vb_clients' and (current_data->>'id' is distinct from client_id::text or (previous_data is not null and previous_data->>'id' is distinct from client_id::text))) or (table_name<>'vb_clients' and previous_data is not null and previous_data->>'client_id' is distinct from client_id::text) or table_name not in ('vb_clients','vb_marks','vb_service_preferences','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links') or not (record_id in (${list([...clientIds(m),...markIds(m),...all])}) or exists(select 1 from public.vb_brand_relationships s where table_name='vb_brand_relationships' and s.id=record_id and s.client_id=audit_events.client_id and s.child_asset_id in (${list(all)}) and current_data->>'id'=s.id::text and current_data->>'child_asset_id'=s.child_asset_id::text and (previous_data is null or (previous_data->>'id'=s.id::text and previous_data->>'child_asset_id'=s.child_asset_id::text))) or exists(select 1 from public.vb_brand_legal_links s where table_name='vb_brand_legal_links' and s.id=record_id and s.client_id=audit_events.client_id and s.asset_id in (${list(all)}) and current_data->>'id'=s.id::text and current_data->>'asset_id'=s.asset_id::text and (previous_data is null or (previous_data->>'id'=s.id::text and previous_data->>'asset_id'=s.asset_id::text)))))) then raise exception 'Unowned audit activity'; end if;
 if exists(select 1 from public.vb_service_preferences where client_id in (${list(clientIds(m))}) and enabled) then raise exception 'Another feature enabled fixture services'; end if;
 for rel in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('public','vb_private') and c.relname not in ('vb_clients','vb_marks','vb_service_preferences','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links','client_memberships','audit_events','brand_map_signin_runs') loop
  if exists(select 1 from pg_attribute where attrelid=format('%I.%I',rel.nspname,rel.relname)::regclass and attname in ('client_id','user_id','actor_id') and not attisdropped) then
   execute format('select exists(select 1 from %I.%I t where coalesce(to_jsonb(t)->>''client_id'' in (%L,%L,%L),false) or coalesce(to_jsonb(t)->>''user_id'' in (%L,%L),false) or coalesce(to_jsonb(t)->>''actor_id'' in (%L,%L),false))',rel.nspname,rel.relname,${clientIds(m).map(q).join(',')},${userIds(m).map(q).join(',')},${userIds(m).map(q).join(',')}) into unexpected;
   if unexpected then raise exception 'Other feature uses test fixture; stop'; end if;
  end if;
 end loop;
 for col in select jsonb_array_elements_text(r->'added_dates') loop
  if col not in ('filing_date','registration_date','uspto_status_date') then raise exception 'Unowned date field'; end if;
  execute format('select exists(select 1 from public.vb_marks where client_id not in (${list(clientIds(m))}) and %I is not null)',col) into unexpected;
  if unexpected then raise exception 'Parallel feature uses temporary date field'; end if;
 end loop;
end $bm_login_safety$;
`;}
export function cleanupData(m,reports=null,o={}){
 ensure(o.approved!==true || reports!==null,'Live verification/cleanup requires both complete, safe reports.');
 const ids=reports?verifyReports(m,reports):['__A_CREATED_ASSET_REQUIRED__','__B_CREATED_ASSET_REQUIRED__'];
 return start(m,o,'cleanup-data')+locks()+guard(m)+accountsGuard(m)+snapshot(m)+fullState(m,ids)+safety(m,ids)+`do $bm_login_cleanup_guard$ declare r jsonb; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 if r->>'state_verified' is distinct from 'true' or r->'created_assets' is distinct from ${j(ids)} or r->'browser_reports' is distinct from ${reports?j(reports):'null::jsonb'} then raise exception 'Independent verification absent/different'; end if;
end $bm_login_cleanup_guard$;
delete from public.vb_brand_legal_links where client_id in (${list(clientIds(m))});
delete from public.vb_brand_relationships where client_id in (${list(clientIds(m))});
delete from public.vb_brand_assets where client_id in (${list(clientIds(m))});
delete from public.vb_marks where client_id in (${list(clientIds(m))}) and id in (${list(markIds(m))});
delete from vb_private.audit_events where client_id in (${list(clientIds(m))});
delete from public.vb_service_preferences where client_id in (${list(clientIds(m))});
delete from vb_private.client_memberships where client_id in (${list(clientIds(m))}) and user_id in (${list(userIds(m))});
delete from public.vb_clients where id in (${list(clientIds(m))}) and name in (${['A','B','C'].map(a=>q(m.label+'-'+a)).join(',')});
update ${table} set payload=jsonb_set(payload,'{data_cleaned}','true'::jsonb) where run_id=${q(m.run_id)}::uuid;
do $bm_login_data_done$ declare r jsonb; begin select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid;
 if pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' or exists(select 1 from public.vb_clients where id in (${list(clientIds(m))})) or exists(select 1 from public.vb_brand_assets) or exists(select 1 from public.vb_brand_relationships) or exists(select 1 from public.vb_brand_legal_links) then raise exception 'Data cleanup verification failed; rollback'; end if;
end $bm_login_data_done$;
drop function pg_temp.brand_map_signin_snapshot();
select jsonb_build_object('status','DATA_CLEANED_AUTH_REMOVAL_PENDING','run_id',${q(m.run_id)}) as brand_map_signin_cleanup;
${o.rehearsal===true?'rollback':'commit'};
`;}
export function cleanupObjects(m,o={}){
 return start(m,o,'cleanup-objects')+locks()+guard(m)+accountsGuard(m,true)+snapshot(m)+`do $bm_login_objects_guard$ declare r jsonb; col text; used boolean; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 if r->>'data_cleaned' is distinct from 'true' then raise exception 'Fixture cleanup must finish first'; end if;
 if exists(select 1 from public.vb_clients where id in (${list(clientIds(m))})) or exists(select 1 from public.vb_marks where id in (${list(markIds(m))})) or exists(select 1 from vb_private.client_memberships where client_id in (${list(clientIds(m))}) or user_id in (${list(userIds(m))})) or exists(select 1 from vb_private.audit_events where client_id in (${list(clientIds(m))}) or actor_id in (${list(userIds(m))})) or exists(select 1 from public.vb_service_preferences where client_id in (${list(clientIds(m))})) or exists(select 1 from public.vb_brand_assets) or exists(select 1 from public.vb_brand_relationships) or exists(select 1 from public.vb_brand_legal_links) then raise exception 'Fixtures or foreign Brand Map records remain'; end if;
 if exists(select 1 from auth.identities where user_id in (${list(userIds(m))})) or exists(select 1 from auth.sessions where user_id in (${list(userIds(m))})) or exists(select 1 from auth.mfa_factors where user_id in (${list(userIds(m))})) then raise exception 'Supported Auth removal incomplete'; end if;
 if exists(select 1 from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and application_name like ${q(m.label+'-%')} and state<>'idle') then raise exception 'Run SQL batch active'; end if;
 perform set_config('vb_brand_map.signin_ignored_dates',(r->'added_dates')::text,true);
 if pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' then raise exception 'Parallel records changed'; end if;
 for col in select jsonb_array_elements_text(r->'added_dates') loop
  if col not in ('filing_date','registration_date','uspto_status_date') then raise exception 'Unowned date'; end if;
  execute format('select exists(select 1 from public.vb_marks where %I is not null)',col) into used;if used then raise exception 'Temporary date field adopted'; end if;
 end loop;
 perform set_config('vb_brand_map.signin_cleanup_manifest',r::text,true);
end $bm_login_objects_guard$;
${fn.slice(0,5).map(f=>'drop function '+f+';').join('\n')}
${tables.map(t=>'drop table '+t+';').join('\n')}
${fn.slice(5).map(f=>'drop function '+f+';').join('\n')}
alter table public.vb_marks drop constraint vb_marks_id_client_unique;
do $bm_login_remove_dates$ declare col text;begin for col in select jsonb_array_elements_text(current_setting('vb_brand_map.signin_cleanup_manifest')::jsonb->'added_dates') loop execute format('alter table public.vb_marks drop column %I',col);end loop;end $bm_login_remove_dates$;
drop table ${table};
do $bm_login_restored$ declare r jsonb:=current_setting('vb_brand_map.signin_cleanup_manifest')::jsonb;begin
 if (${schemaDigestSql}) is distinct from r->>'baseline_schema' or (${ext}) is distinct from r->'baseline_extensions' or pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' then raise exception 'Restoration failed; rollback';end if;
end $bm_login_restored$;
drop function pg_temp.brand_map_signin_snapshot();
select jsonb_build_object('status','OBJECTS_CLEANED','run_id',${q(m.run_id)},'preexisting_rows_and_schema_preserved',true,'audit_sequence_gaps_possible',true,'baseline_rows',current_setting('vb_brand_map.signin_cleanup_manifest')::jsonb->'baseline_rows') as brand_map_signin_cleanup;
${o.rehearsal===true?'rollback':'commit'};
`;}
export function postcheck(m,o={}){
 const readSnapshot=snapshot(m).replace("create function pg_temp.brand_map_signin_snapshot() returns jsonb language plpgsql set search_path='' as $bm_login_snapshot$","do $bm_login_snapshot$").replace("end loop;return result;","end loop;perform set_config('vb_brand_map.signin_postcheck_rows',result::text,true);");
 return start(m,o,'postcheck',true)+readSnapshot+`select jsonb_build_object('status','POSTCHECK','project',${q(PROJECT)},'run_id',${q(m.run_id)},'database_identity',(select system_identifier::text from pg_control_system()),'schema_digest',(${schemaDigestSql}),'extensions',(${ext}),'preservation_rows',current_setting('vb_brand_map.signin_postcheck_rows')::jsonb,'owned_objects_absent',to_regclass(${q(table)}) is null and ${[...tables].map(t=>`to_regclass(${q(t)}) is null`).join(' and ')} and ${fn.map(f=>`to_regprocedure(${q(f)}) is null`).join(' and ')},'remaining_users',(select count(*) from auth.users where id in (${list(userIds(m))})),'remaining_identities',(select count(*) from auth.identities where user_id in (${list(userIds(m))})),'remaining_sessions',(select count(*) from auth.sessions where user_id in (${list(userIds(m))})),'remaining_mfa_factors',(select count(*) from auth.mfa_factors where user_id in (${list(userIds(m))})),'remaining_clients',(select count(*) from public.vb_clients where id in (${list(clientIds(m))})),'remaining_marks',(select count(*) from public.vb_marks where id in (${list(markIds(m))})),'remaining_memberships',(select count(*) from vb_private.client_memberships where client_id in (${list(clientIds(m))}) or user_id in (${list(userIds(m))})),'remaining_audit_rows',(select count(*) from vb_private.audit_events where client_id in (${list(clientIds(m))}) or actor_id in (${list(userIds(m))})),'remaining_preferences',(select count(*) from public.vb_service_preferences where client_id in (${list(clientIds(m))})),'remaining_active_connections',(select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and application_name like ${q(m.label+'-%')} and state<>'idle')) as brand_map_signin_postcheck;
rollback;
`;}
export function runtimeConfig(m,setupResult,o={}){
 options(m,o);ensure(o.approved===true && setupResult?.status==='SETUP_CREATED' && setupResult.run_id===m.run_id && setupResult.project===PROJECT && setupResult.database_identity===o.databaseIdentity && /^[a-f0-9]{64}$/.test(setupResult.installed_schema),'Fresh independently verified installed setup required.');
 ensure(o.setupIndependentlyVerified===true,'Independent setup confirmation required.');
 return {execution_approved:true,setup_verified:true,project:PROJECT,manifest:m,database_identity:setupResult.database_identity,installed_schema:setupResult.installed_schema};
}
export function signinPreflight(m){
 validateManifest(m);const sql=preflightSql(),suffix=') as brand_map_readonly_preflight;';
 ensure(sql.includes(suffix),'Preflight structure changed.');
 return sql.replace(suffix,`, 'signin_prerequisites',jsonb_build_object('control_table_absent',to_regclass('${table}') is null,'race_control_absent',to_regclass('vb_private.brand_map_race_runs') is null,'auth_cleanup_relations_available',to_regclass('auth.identities') is not null and to_regclass('auth.sessions') is not null and to_regclass('auth.mfa_factors') is not null,'auth_account_columns_available',not exists(select 1 from (values ('id'),('email'),('email_confirmed_at'),('encrypted_password'),('created_at')) needed(col) where not exists(select 1 from pg_attribute where attrelid='auth.users'::regclass and attname=col and not attisdropped)),'account_email_collisions',(select count(*) from auth.users where email in (${Object.values(m.users).map(u=>q(u.email)).join(',')})),'auth_user_triggers',(select coalesce(jsonb_agg(jsonb_build_object('trigger_oid',t.oid,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')) order by t.oid),'[]'::jsonb) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='auth.users'::regclass and not t.tgisinternal))
`+suffix);
}

function ownedState(m){return `(select jsonb_build_object('clients',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_clients t where id in (${list(clientIds(m))})),'assets',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_brand_assets t where client_id in (${list(clientIds(m))})),'relationships',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_brand_relationships t where client_id in (${list(clientIds(m))})),'links',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_brand_legal_links t where client_id in (${list(clientIds(m))})),'marks',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.vb_marks t where client_id in (${list(clientIds(m))})),'memberships',(select coalesce(jsonb_agg(to_jsonb(t) order by client_id,user_id),'[]'::jsonb) from vb_private.client_memberships t where client_id in (${list(clientIds(m))})),'preferences',(select coalesce(jsonb_agg(to_jsonb(t) order by client_id,service),'[]'::jsonb) from public.vb_service_preferences t where client_id in (${list(clientIds(m))})),'audits',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from vb_private.audit_events t where client_id in (${list(clientIds(m))}))))`;}
const ownedHash=m=>`encode(sha256(convert_to(${ownedState(m)}::text,'UTF8')),'hex')`;
export function interruptedInventory(m,o={}){
 return start(m,o,'interrupted-inventory',true)+guard(m)+`select jsonb_build_object('status','INTERRUPTED_INVENTORY','run_id',${q(m.run_id)},'owned_state_digest',${ownedHash(m)},'asset_ids',(select coalesce(jsonb_agg(id order by id),'[]'::jsonb) from public.vb_brand_assets where client_id in (${list(clientIds(m))})),'asset_count',(select count(*) from public.vb_brand_assets where client_id in (${list(clientIds(m))})),'mark_count',(select count(*) from public.vb_marks where client_id in (${list(clientIds(m))}))) as brand_map_signin_inventory;
rollback;
`;}
export function cleanupInterrupted(m,inventory=null,o={}){
 if(o.approved===true)ensure(o.interruptedOwnershipReviewed===true && inventory?.status==='INTERRUPTED_INVENTORY' && inventory.run_id===m.run_id && /^[a-f0-9]{64}$/.test(inventory.owned_state_digest) && Array.isArray(inventory.asset_ids) && inventory.asset_ids.every(id=>UUID.test(id)) && new Set(inventory.asset_ids).size===inventory.asset_ids.length && assetIds(m).every(id=>inventory.asset_ids.includes(id)) && inventory.asset_count===inventory.asset_ids.length && inventory.mark_count===3,'Fresh, reviewed interrupted-run inventory required.');
 const all=inventory?.asset_ids||assetIds(m),extra=all.filter(id=>!assetIds(m).includes(id));
 ensure(all.length<=100,'Unbounded interrupted fixture set refused.');
 return start(m,o,'interrupted-cleanup')+locks()+guard(m)+accountsGuard(m)+snapshot(m)+safety(m,extra)+`do $bm_login_interrupted$ declare r jsonb;begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 if r->>'data_cleaned' is distinct from 'false' or ${ownedHash(m)} is distinct from ${q(inventory?.owned_state_digest||'__FRESH_OWNED_STATE_DIGEST_REQUIRED__')} then raise exception 'Interrupted fixture state changed; stop';end if;
 ${['A','B','C'].map(a=>`if not exists(select 1 from public.vb_clients where id=${q(m.clients[a])}::uuid and name=${q(m.label+'-'+a)} and archived_at is null) then raise exception 'Client ownership changed';end if;`).join('\n')}
 if (select count(*) from public.vb_brand_assets)<>${all.length} or exists(select 1 from public.vb_brand_assets where id not in (${list(all)}) or client_id not in (${list(clientIds(m))})) or exists(select 1 from public.vb_marks where client_id in (${list(clientIds(m))}) and id not in (${list(markIds(m))})) or exists(select 1 from public.vb_brand_relationships r where child_asset_id not in (${list(all)}) or not exists(select 1 from public.vb_brand_assets a where a.id=r.child_asset_id and a.client_id=r.client_id) or (parent_asset_id is not null and not exists(select 1 from public.vb_brand_assets a where a.id=r.parent_asset_id and a.client_id=r.client_id))) or exists(select 1 from public.vb_brand_legal_links l where asset_id not in (${list(all)}) or not exists(select 1 from public.vb_brand_assets a where a.id=l.asset_id and a.client_id=l.client_id) or (mark_id is not null and not exists(select 1 from public.vb_marks a where a.id=l.mark_id and a.client_id=l.client_id))) then raise exception 'Unowned/interconnected fixture records';end if;
end $bm_login_interrupted$;
delete from public.vb_brand_legal_links where client_id in (${list(clientIds(m))});
delete from public.vb_brand_relationships where client_id in (${list(clientIds(m))});
delete from public.vb_brand_assets where client_id in (${list(clientIds(m))}) and id in (${list(all)});
delete from public.vb_marks where client_id in (${list(clientIds(m))}) and id in (${list(markIds(m))});
delete from vb_private.audit_events where client_id in (${list(clientIds(m))});
delete from public.vb_service_preferences where client_id in (${list(clientIds(m))});
delete from vb_private.client_memberships where client_id in (${list(clientIds(m))}) and user_id in (${list(userIds(m))});
delete from public.vb_clients where id in (${list(clientIds(m))}) and name in (${['A','B','C'].map(a=>q(m.label+'-'+a)).join(',')});
update ${table} set payload=payload||jsonb_build_object('data_cleaned',true,'interrupted_run',true,'interrupted_inventory',${inventory?j(inventory):'null::jsonb'}) where run_id=${q(m.run_id)}::uuid;
do $bm_login_interrupted_done$ declare r jsonb;begin select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid;
 if pg_temp.brand_map_signin_snapshot() is distinct from r->'baseline_rows' or exists(select 1 from public.vb_clients where id in (${list(clientIds(m))})) or exists(select 1 from public.vb_brand_assets) or exists(select 1 from public.vb_brand_relationships) or exists(select 1 from public.vb_brand_legal_links) then raise exception 'Interrupted cleanup incomplete; rollback';end if;
end $bm_login_interrupted_done$;
drop function pg_temp.brand_map_signin_snapshot();
select jsonb_build_object('status','INTERRUPTED_DATA_CLEANED_AUTH_REMOVAL_PENDING','run_id',${q(m.run_id)},'cases_passed_not_claimed',true) as brand_map_signin_cleanup;
${o.rehearsal===true?'rollback':'commit'};
`;}
export function verifyCompleted(m,reports,state,dataCleanup,objectCleanup,after,before){
 verifyReports(m,reports);
 ensure(state?.status==='STATE_VERIFIED' && state.run_id===m.run_id && state.cases===22 && state.rejected_writes_unchanged===true && state.preexisting_rows_preserved===true,'Independent saved-state check missing.');
 ensure(dataCleanup?.status==='DATA_CLEANED_AUTH_REMOVAL_PENDING' && dataCleanup.run_id===m.run_id && objectCleanup?.status==='OBJECTS_CLEANED' && objectCleanup.run_id===m.run_id && objectCleanup.preexisting_rows_and_schema_preserved===true,'Committed cleanup results missing.');
 ensure(before?.operator_expected_project===PROJECT && /^[a-f0-9]{64}$/.test(before.schema_digest||'') && after?.status==='POSTCHECK' && after.project===PROJECT && after.run_id===m.run_id && after.database_identity===before.database_identity && after.schema_digest===before.schema_digest && JSON.stringify(after.extensions)===JSON.stringify(before.prerequisite_state?.extensions) && after.owned_objects_absent===true && ['remaining_users','remaining_identities','remaining_sessions','remaining_mfa_factors','remaining_clients','remaining_marks','remaining_memberships','remaining_audit_rows','remaining_preferences','remaining_active_connections'].every(k=>after[k]===0),'Independent restoration/leftover confirmation missing.');
 const canonical=value=>JSON.stringify(value,(_,v)=>v && typeof v==='object' && !Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
 ensure(after.preservation_rows && objectCleanup.baseline_rows && canonical(after.preservation_rows)===canonical(objectCleanup.baseline_rows),'Independent preexisting-row confirmation missing.');
 return {status:'PASS',project:PROJECT,run_id:m.run_id,signin_api_cases:22,real_client_accounts:2,password_signins:4,cleanup_verified:true,staff_mfa_signin_tested:false,homepage_integration_tested:false};
}

export async function prepare(){
 const m=manifest(),[migration]=await loadSources();validateManifest(m);
 const matrix=JSON.parse(await readFile(new URL('../brand-map-browser-tests/test-matrix.json',import.meta.url),'utf8'));
 ensure(JSON.stringify(matrix.signin_api_cases.map(c=>c.id))===JSON.stringify(CASES),'Original 22-case scope changed.');
 const files={'00-readonly-preflight.sql':signinPreflight(m),'01-setup.BLOCKED.sql':setup(m,migration),'02-A-withdraw.BLOCKED.sql':withdraw(m,'A'),'03-B-disable.BLOCKED.sql':withdraw(m,'B'),'04-verify.BLOCKED.sql':verification(m),'05-cleanup-data.BLOCKED.sql':cleanupData(m),'05-cleanup-data-rehearsal.BLOCKED.sql':cleanupData(m,null,{rehearsal:true}),'06-cleanup-objects.BLOCKED.sql':cleanupObjects(m),'06-cleanup-objects-rehearsal.BLOCKED.sql':cleanupObjects(m,{rehearsal:true}),'07-postcheck.BLOCKED.sql':postcheck(m),'08-interrupted-inventory.BLOCKED.sql':interruptedInventory(m),'09-interrupted-cleanup.BLOCKED.sql':cleanupInterrupted(m),'09-interrupted-cleanup-rehearsal.BLOCKED.sql':cleanupInterrupted(m,null,{rehearsal:true}),'fixture-manifest.json':JSON.stringify(m,null,2)+'\n','test-matrix.json':JSON.stringify({prepared_only:true,signin_api_cases:matrix.signin_api_cases},null,2)+'\n'};
 for(const [name,content] of Object.entries(files)){await mkdir(new URL('prepared/',import.meta.url),{recursive:true});await writeFile(new URL('prepared/'+name,import.meta.url),content);}
 await writeFile(new URL('runtime-config.json',import.meta.url),JSON.stringify({execution_approved:false,setup_verified:false,project:PROJECT,manifest:m,database_identity:null,installed_schema:null},null,2)+'\n');
 const hashes={};for(const file of ['contract.mjs','runner.mjs','page.mjs','page.css','index.html','package.mjs','package.test.mjs','README.md','runtime-config.json'])hashes[file]=digest(await readFile(new URL(file,import.meta.url),'utf8'));
 await writeFile(new URL('prepared/source-manifest.json',import.meta.url),JSON.stringify({prepared_only:true,project:PROJECT,run_id:m.run_id,backend_hash:hash,files:{...hashes,...Object.fromEntries(Object.entries(files).map(([k,v])=>['prepared/'+k,digest(v)]))},hosted_changes:0,real_signins:0,live_cases:0},null,2)+'\n');
 console.log('Prepared Test-only page, 22-case scope, blocked setup/access/verification/cleanup batches. No hosted calls or accounts.');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){ensure(process.argv.length===2,'No activation or credential arguments accepted.');await prepare();}
