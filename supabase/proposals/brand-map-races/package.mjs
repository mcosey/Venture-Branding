// FILE GENERATION ONLY: no connections, credentials, browser calls or network.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {buildRollbackSql,code,digest,loadSources,preflightSql,schemaDigestSql,splitSql,verifyDashboardTarget,TEST_PROJECT} from '../brand-map-hosted/package.mjs';

const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const j=value=>q(JSON.stringify(value))+'::jsonb';
const table='vb_private.brand_map_race_runs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const dateColumns=['filing_date','registration_date','uspto_status_date'];
const functions=['public.vb_read_brand_map(uuid)','public.vb_save_brand_asset(uuid,uuid,bigint,jsonb)','public.vb_set_brand_parent(uuid,uuid,uuid,bigint)','public.vb_confirm_brand_relationship(uuid,uuid,bigint)','public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb)','vb_private.brand_map_touch()','vb_private.brand_map_initialize_slots()','vb_private.brand_map_can_read(uuid)','vb_private.brand_map_lock_write(uuid,boolean)','vb_private.brand_map_mark_fingerprint(public.vb_marks)'];
const brandTables=['public.vb_brand_legal_links','public.vb_brand_relationships','public.vb_brand_assets'];
const usptoHash='c4b3160d01eb56aaacceab3b6dabcc5af32d3f150b7b31bcd4cd70f5deed641d';
const usptoSignature='public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)';
function usptoPrerequisite(o){
 if(o.temporaryUsptoApproved!==true){if(o.usptoSource!==undefined)throw Error('Separate temporary USPTO approval required.');return '';}
 if(typeof o.usptoSource!=='string'||digest(o.usptoSource)!==usptoHash)throw Error('Exact reviewed USPTO prerequisite required.');
 return o.usptoSource;
}
const privacyHash='fa5b63c982f1ba1b784fe2d0ee9e8c0a5ca480a03bb57c25610677eb54e7f041';
const concurrencyHash='675cef5067e7ca854730094fa5306579fb68c807db8cf055eca2cb961d5a4014';
const exactKeys=(v,keys)=>v&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const draftHash='21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3';
const extensionState="select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e";
const preflightStatement=splitSql(preflightSql()).map(code).find(s=>s.startsWith('select jsonb_build_object('));
if(!preflightStatement?.endsWith(' as brand_map_readonly_preflight;')) throw Error('Preflight generator changed: review required.');
const preflightExpression=preflightStatement.slice(0,-' as brand_map_readonly_preflight;'.length);

export function manifest(runId=randomUUID()) {
  if(!UUID.test(runId)) throw Error('Fresh v4 namespace required.');
  const namespace=1+parseInt(runId.slice(0,7),16);
  const m={prepared_only:true,project:TEST_PROJECT,run_id:runId,label:'bm-race-'+runId.slice(0,8),namespace,client_id:randomUUID(),user_id:randomUUID(),staff_id:randomUUID(),cases:[]};
  for(const isolation of ['read committed','repeatable read']) for(const scenario of ['cycle','stale-edit','membership-revocation','direct-mark-update','uspto-import','review-and-status-refresh']) {
    const index=m.cases.length+1;
    m.cases.push({index,id:isolation.replaceAll(' ','-')+'/'+scenario,isolation,scenario,assets:Array.from({length:scenario==='cycle'?2:1},()=>randomUUID()),mark_id:['direct-mark-update','uspto-import','review-and-status-refresh'].includes(scenario)?randomUUID():null,application_number:String(90000000+index),expected_code:scenario==='review-and-status-refresh'?'00000':scenario==='cycle'&&isolation==='read committed'?'22023':scenario==='membership-revocation'&&isolation==='read committed'?'42501':'40001'});
  }
  return m;
}
export function validateManifest(m) {
  if(!exactKeys(m,['prepared_only','project','run_id','label','namespace','client_id','user_id','staff_id','cases'])||m.prepared_only!==true||m?.project!==TEST_PROJECT||!UUID.test(m.run_id)||m.label!=='bm-race-'+m.run_id.slice(0,8)||m.namespace!==1+parseInt(m.run_id.slice(0,7),16)||m.cases?.length!==12) throw Error('Wrong or incomplete manifest.');
  const ids=[m.run_id,m.client_id,m.user_id,m.staff_id];
  const expected=manifest(m.run_id).cases;
  m.cases.forEach((c,i)=>{
    if(!exactKeys(c,['index','id','isolation','scenario','assets','mark_id','application_number','expected_code'])||!Array.isArray(c.assets)||['index','id','isolation','scenario','expected_code','application_number'].some(k=>c[k]!==expected[i][k])||c.assets.length!==expected[i].assets.length||Boolean(c.mark_id)!==Boolean(expected[i].mark_id)) throw Error('Case specification changed.');
    ids.push(...c.assets);if(c.mark_id)ids.push(c.mark_id);
  });
  if(ids.some(id=>!UUID.test(id))||new Set(ids).size!==ids.length) throw Error('Invalid or reused fixture ID.');
}
function options(o={}) {
  const enabled=o.approved===true;
  if(enabled){verifyDashboardTarget(o.observedUrl);if(!/^[1-9][0-9]{14,19}$/.test(o.databaseIdentity||'')||! /^[a-f0-9]{64}$/.test(o.schemaDigest||'')||o.testWindowConfirmed!==true)throw Error('Fresh Test pins and coordinated window required.');}
  return {enabled,identity:enabled?o.databaseIdentity:'__FRESH_TEST_CLUSTER_PIN__',schema:enabled?o.schemaDigest:'__FRESH_TEST_SCHEMA_PIN__'};
}
function start(m,o,label,isolation='read committed',readonly=false) {
  const p=options(o);validateManifest(m);
  return `-- PREPARED, NOT EXECUTED. Exact project ${TEST_PROJECT}; verify dashboard URL independently.
-- No account login, invitation or production work. Original local guards unchanged.
begin ${readonly?'read only':'isolation level '+isolation};
set local lock_timeout='20s';
set local statement_timeout='25s';
set local idle_in_transaction_session_timeout='25s';
set local application_name=${q(m.label+'-'+label)};
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_target$ begin
 if ${p.enabled} is not true then raise exception 'Prepared copy blocked: execution approval is required.'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from ${q(p.identity)} then raise exception 'Unexpected Test target/executor'; end if;
end $bm_target$;
`;
}
const reportSelect="reset role;\nselect current_setting('vb_brand_map.race_report')::jsonb as brand_map_race_report;\n";
function saveReport(m,c,actor,extras) {
  return `perform set_config('vb_brand_map.race_report',jsonb_build_object('run_id',${q(m.run_id)},'case_id',${q(c.id)},'actor',${q(actor)},'pid',pg_backend_pid(),'isolation',current_setting('transaction_isolation'),${extras})::text,true);`;
}
function runGuard(m) {
  return `do $bm_run_guard$ declare r jsonb; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid;
 if (r->>'temporary_uspto' is distinct from 'true' and r->>'temporary_uspto' is distinct from 'false') or (r->>'temporary_uspto'='true' and r->>'uspto_source_hash' is distinct from ${q(usptoHash)}) then raise exception 'USPTO ownership marker changed'; end if;
 if r->'fixture_manifest' is distinct from ${j(m)} or r->>'draft_hash'<>${q(draftHash)} or (${schemaDigestSql}) is distinct from r->>'installed_schema' then raise exception 'Run ownership or installed schema changed'; end if;
 if not exists(select 1 from public.vb_clients where id=${q(m.client_id)}::uuid and name=${q('Brand Map race '+m.run_id)} and portal_enabled and archived_at is null)
 or not exists(select 1 from auth.users where id=${q(m.user_id)}::uuid and email=${q('bm-race-'+m.run_id+'-client@example.invalid')} and coalesce(encrypted_password,'')='')
 or not exists(select 1 from auth.users where id=${q(m.staff_id)}::uuid and email=${q('bm-race-'+m.run_id+'-staff@example.invalid')} and coalesce(encrypted_password,'')='')
 then raise exception 'Synthetic ownership markers changed'; end if;
end $bm_run_guard$;
`;
}
function freshCase(m,c) {
  return `do $bm_fresh_case$ begin
 if exists(select 1 from ${table} where run_id=${q(m.run_id)}::uuid and payload->'completed' ? ${q(c.id)}) then raise exception 'Case already completed: no automatic replay'; end if;
 if (select count(*) from public.vb_brand_assets where id in (${c.assets.map(id=>q(id)+'::uuid').join(',')}) and client_id=${q(m.client_id)}::uuid and version=1 and identity_revision=1)<>${c.assets.length}
 or not exists(select 1 from vb_private.client_memberships where client_id=${q(m.client_id)}::uuid and user_id=${q(m.user_id)}::uuid and active)
 then raise exception 'Case fixture is no longer fresh'; end if;
 ${c.mark_id?`if not exists(select 1 from public.vb_marks where id=${q(c.mark_id)}::uuid and client_id=${q(m.client_id)}::uuid and record_owner='Test owner' and status='inactive' and application_number is null and archived_at is null) then raise exception 'Mark fixture changed'; end if;`:''}
end $bm_fresh_case$;
`;
}
function actorSql(m,c) {
  if(c.scenario==='membership-revocation') return '';
  return claims(m,['direct-mark-update','uspto-import','review-and-status-refresh'].includes(c.scenario));
}
function claims(m,staff=false) {
  return `set local role authenticated;\nselect set_config('request.jwt.claims',${q(JSON.stringify({sub:staff?m.staff_id:m.user_id,role:'authenticated',aal:staff?'aal2':'aal1'}))},true);\n`;
}
const gate=(m,c)=>`${m.namespace},${c.index}`;
function gateOwner(m,c,actor) {
  return `select a.pid from pg_stat_activity a join pg_locks l on l.pid=a.pid where a.datname=current_database() and a.usename='postgres' and a.application_name=${q(m.label+'-'+c.index+'-'+actor)} and a.state='active' and l.locktype='advisory' and l.classid=${m.namespace}::oid and l.objid=${c.index}::oid and l.objsubid=2 and l.granted`;
}
function awaitWinner(m,c) {
  return `do $bm_wait_winner$ declare deadline timestamptz:=clock_timestamp()+interval '8 seconds'; w integer; ctl integer; begin
 loop
  perform pg_stat_clear_snapshot();
  select pid into w from pg_stat_activity where datname=current_database() and usename='postgres' and application_name=${q(m.label+'-'+c.index+'-winner')} and state='active' and wait_event_type='Lock';
  select pid into ctl from (${gateOwner(m,c,'controller')}) controller;
  if w is not null and ctl is not null and pg_blocking_pids(w)=array[ctl] and exists(select 1 from pg_locks where pid=w and locktype='advisory' and classid=${m.namespace}::oid and objid=${c.index}::oid and objsubid=2 and not granted) then exit; end if;
  if clock_timestamp()>deadline then raise exception 'Winner did not reach the controlled gate'; end if;
  perform pg_sleep(0.1);
 end loop;
end $bm_wait_winner$;
`;
}
function actions(m,c) {
  const client=q(m.client_id)+'::uuid',a=q(c.assets[0])+'::uuid',mark=q(c.mark_id)+'::uuid';
  const business=name=>j({name,kind:'product',description:'',business_use:'in_use'});
  const identity=j({client_id:m.client_id,name:c.scenario==='review-and-status-refresh'?'Status refresh mark':'Concurrency legal mark',mark_type:'word',record_owner:'Test owner'});
  const review=`select public.vb_review_brand_legal_link(${client},${a},${mark},1,1,${identity})`;
  const fields=status=>j({name:c.scenario==='review-and-status-refresh'?'Status refresh mark':'Concurrency legal mark',mark_type:'word',status,record_owner:status==='pending'?'Test owner':'Changed owner',application_number:c.application_number,registration_number:null,source_checked_at:'2026-10-09T00:00:00Z',uspto_status_text:'Synthetic fixture status'});
  const importSql=status=>`select public.vb_save_uspto_mark(${client},${mark},(select updated_at from public.vb_marks where id=${mark}),${fields(status)})`;
  switch(c.scenario){
    case 'cycle': {const b=q(c.assets[1])+'::uuid';return [`select public.vb_set_brand_parent(${client},${a},${b},1)`,`select public.vb_set_brand_parent(${client},${b},${a},1)`];}
    case 'stale-edit':return [`select public.vb_save_brand_asset(${client},${a},1,${business('Winning name')})`,`select public.vb_save_brand_asset(${client},${a},1,${business('Losing name')})`];
    case 'membership-revocation':return [`select id from public.vb_clients where id=${client} for update`,`select public.vb_save_brand_asset(${client},${a},1,${business('Must not save')})`];
    case 'direct-mark-update':return [`update public.vb_marks set record_owner='Changed owner' where id=${mark}`,review];
    case 'uspto-import':return [importSql('inactive'),review];
    case 'review-and-status-refresh':return [review,importSql('pending')];
  }
}
function snapshot(m,migration,privacy) {
  if(digest(migration)!==draftHash||digest(privacy)!==privacyHash) throw Error('Preservation source changed.');
  // The generated helper excludes only this run's fixtures. Missing date fields
  // are omitted only when the manifest says this run added them as nullable fields.
  const helper=splitSql(buildRollbackSql(migration,privacy)).find(s=>code(s).startsWith('create function pg_temp.brand_map_preservation_snapshot'));
  if(!helper) throw Error('Preservation source changed.');
  return `create function pg_temp.brand_map_preservation_snapshot() returns jsonb
language plpgsql set search_path='' as $bm_snapshot$
declare result jsonb:='{}'::jsonb; relation record; row_count bigint; row_digest text; bytes bigint; filter_sql text; row_sql text; ignored text[];
begin
 select coalesce(array_agg(v),'{}'::text[]) into ignored from jsonb_array_elements_text(coalesce(nullif(current_setting('vb_brand_map.snapshot_ignored_dates',true),''),'[]')::jsonb) v;
 if not ignored <@ array['filing_date','registration_date','uspto_status_date']::text[] then raise exception 'Unowned preservation normalization'; end if;
 for relation in select n.nspname,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users'))
 and c.relname not in ('brand_map_race_runs','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links') order by n.nspname,c.relname loop
  filter_sql:=format('not (coalesce(to_jsonb(t)->>''client_id''=%L,false) or (%L=''public'' and %L=''vb_clients'' and to_jsonb(t)->>''id''=%L) or (%L=''auth'' and %L=''users'' and to_jsonb(t)->>''id'' in (%L,%L)) or (%L=''vb_private'' and (coalesce(to_jsonb(t)->>''user_id'' in (%L,%L),false) or coalesce(to_jsonb(t)->>''actor_id'' in (%L,%L),false))))',
   ${q(m.client_id)},relation.nspname,relation.relname,${q(m.client_id)},relation.nspname,relation.relname,${q(m.user_id)},${q(m.staff_id)},relation.nspname,${q(m.user_id)},${q(m.staff_id)},${q(m.user_id)},${q(m.staff_id)});
  row_sql:=case when relation.nspname='public' and relation.relname='vb_marks' then format('(to_jsonb(t)-%L::text[])',ignored) else 'to_jsonb(t)' end;
  execute format('select count(*),coalesce(sum(octet_length(%s::text)),0) from %I.%I t where %s',row_sql,relation.nspname,relation.relname,filter_sql) into row_count,bytes;
  if row_count>10000 or bytes>16777216 then raise exception 'Preservation snapshot exceeds reviewed test limits'; end if;
  execute format('select encode(sha256(convert_to(coalesce(string_agg(%s::text,E''\\n'' order by %s::text),''''),''UTF8'')),''hex'') from %I.%I t where %s',row_sql,row_sql,relation.nspname,relation.relname,filter_sql) into row_digest;
  result:=result||jsonb_build_object(relation.nspname||'.'||relation.relname,jsonb_build_object('count',row_count,'digest',row_digest));
 end loop;
 return result;
end $bm_snapshot$;
revoke all on function pg_temp.brand_map_preservation_snapshot() from public,anon,authenticated,service_role;
`;
}
export function buildSetup(m,migration,privacy,o={}) {
  validateManifest(m);if(digest(migration)!==draftHash)throw Error('Reviewed backend source changed.');
  const p=options(o);if(p.enabled)verifyGateReports(m,o.gateReports);
  const temporaryUspto=usptoPrerequisite(o);
  const draft=splitSql(migration).slice(2,-1).join('\n');
  const assetIds=m.cases.flatMap(c=>c.assets),markIds=m.cases.map(c=>c.mark_id).filter(Boolean);
  return start(m,o,'setup')+`set local lock_timeout='3s';\nset local statement_timeout='30s';
${snapshot(m,migration,privacy)}
do $bm_setup_guard$ declare pre jsonb; begin
 if (${schemaDigestSql}) is distinct from ${q(p.schema)} then raise exception 'Test schema changed since preflight'; end if;
 pre:=(${preflightExpression});
 if not (pre->'missing_columns' <@ ${j(dateColumns.map(c=>'public.vb_marks.'+c))}) or pre->'missing_functions'<>'[]'::jsonb or pre->'brand_map_collisions'<>'[]'::jsonb or pre->>'client_and_mark_rls'<>'true' or to_regclass(${q(table)}) is not null then raise exception 'Missing dependencies or preexisting draft objects'; end if;
 ${temporaryUspto?`if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='vb_save_uspto_mark') then raise exception 'USPTO prerequisite already exists: do not replace or claim it'; end if;`:`if to_regprocedure('public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)') is null then raise exception 'Existing compatible USPTO save path required'; end if;`}
 if exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname in ('filing_date','registration_date','uspto_status_date') and not attisdropped and atttypid<>'date'::regtype) then raise exception 'Unexpected date column type'; end if;
 if exists(select 1 from auth.users where id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid) or email in (${q('bm-race-'+m.run_id+'-client@example.invalid')},${q('bm-race-'+m.run_id+'-staff@example.invalid')})) or exists(select 1 from public.vb_clients where id=${q(m.client_id)}::uuid) or exists(select 1 from public.vb_marks where id in (${markIds.map(id=>q(id)+'::uuid').join(',')})) then raise exception 'Fixture identity collision'; end if;
 perform set_config('vb_brand_map.baseline_schema',(${schemaDigestSql}),true);
 perform set_config('vb_brand_map.snapshot_ignored_dates','[]',true);
 perform set_config('vb_brand_map.baseline_rows',pg_temp.brand_map_preservation_snapshot()::text,true);
 perform set_config('vb_brand_map.baseline_extensions',(${extensionState})::text,true);
 perform set_config('vb_brand_map.added_dates',(select coalesce(jsonb_agg(name),'[]'::jsonb)::text from unnest(array['filing_date','registration_date','uspto_status_date']) name where not exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname=name and not attisdropped)),true);
end $bm_setup_guard$;
do $bm_dates$ declare col text; begin
 for col in select jsonb_array_elements_text(current_setting('vb_brand_map.added_dates')::jsonb) loop execute format('alter table public.vb_marks add column %I date',col); end loop;
end $bm_dates$;
${temporaryUspto}
${draft}
create table ${table}(run_id uuid primary key,payload jsonb not null);
alter table ${table} enable row level security;
revoke all on ${table} from public,anon,authenticated,service_role;
insert into auth.users(id,email) values (${q(m.user_id)}::uuid,${q('bm-race-'+m.run_id+'-client@example.invalid')}),(${q(m.staff_id)}::uuid,${q('bm-race-'+m.run_id+'-staff@example.invalid')});
insert into vb_private.staff_members(user_id) values(${q(m.staff_id)}::uuid);
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values(${q(m.client_id)}::uuid,${q('Brand Map race '+m.run_id)},'business','Synthetic concurrency fixture',true);
insert into vb_private.client_memberships(client_id,user_id) values(${q(m.client_id)}::uuid,${q(m.user_id)}::uuid);
insert into public.vb_brand_assets(id,client_id,name,kind,business_use,source_kind) values
${assetIds.map((id,i)=>`(${q(id)}::uuid,${q(m.client_id)}::uuid,${q('Concurrent asset '+i)},'product','in_use','manual_client')`).join(',\n')};
insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner) values
${m.cases.filter(c=>c.mark_id).map(c=>`(${q(c.mark_id)}::uuid,${q(m.client_id)}::uuid,${q(c.scenario==='review-and-status-refresh'?'Status refresh mark':'Concurrency legal mark')},'word','inactive','Test owner')`).join(',\n')};
insert into ${table}(run_id,payload) select ${q(m.run_id)}::uuid,jsonb_build_object('fixture_manifest',${j(m)},'draft_hash',${q(draftHash)},'temporary_uspto',${Boolean(temporaryUspto)},'uspto_source_hash',${temporaryUspto?q(usptoHash):"null"},'baseline_schema',current_setting('vb_brand_map.baseline_schema'),'baseline_rows',current_setting('vb_brand_map.baseline_rows')::jsonb,'baseline_extensions',current_setting('vb_brand_map.baseline_extensions')::jsonb,'added_dates',current_setting('vb_brand_map.added_dates')::jsonb,'installed_schema',(${schemaDigestSql}),'completed','{}'::jsonb,'overlap','{}'::jsonb);
drop function pg_temp.brand_map_preservation_snapshot();
select jsonb_build_object('status','TEMPORARY_SETUP_CREATED','run_id',${q(m.run_id)},'assets',${assetIds.length},'marks',${markIds.length},'real_logins_created',0) as brand_map_setup;
commit;
`;
}
export function buildRace(m,c,o={}) {
  validateManifest(m);if(m.cases[c.index-1]!==c)throw Error('Use the manifest case reference.');
  const [winnerAction,loserAction]=actions(m,c);
  const ctlLabel=m.label+'-'+c.index+'-controller',winLabel=m.label+'-'+c.index+'-winner',loseLabel=m.label+'-'+c.index+'-loser';
  const controller=start(m,o,c.index+'-controller')+runGuard(m)+freshCase(m,c)+`do $bm_controller$ declare deadline timestamptz:=clock_timestamp()+interval '20 seconds'; w integer; l integer; proof jsonb; begin
 if not pg_try_advisory_xact_lock(${gate(m,c)}) then raise exception 'Controller gate already in use'; end if;
 loop
  perform pg_stat_clear_snapshot();
  select pid into w from pg_stat_activity where datname=current_database() and usename='postgres' and application_name=${q(winLabel)} and state='active' and wait_event_type='Lock';
  select pid into l from pg_stat_activity where datname=current_database() and usename='postgres' and application_name=${q(loseLabel)} and state='active' and wait_event_type='Lock';
  if w is not null and l is not null and w<>l and w<>pg_backend_pid() and l<>pg_backend_pid() and pg_blocking_pids(w)=array[pg_backend_pid()] and pg_blocking_pids(l)=array[w] and exists(select 1 from pg_locks where pid=w and locktype='advisory' and classid=${m.namespace}::oid and objid=${c.index}::oid and objsubid=2 and not granted) then exit; end if;
  if clock_timestamp()>deadline then raise exception 'No verified intended overlap within deadline'; end if;
  perform pg_sleep(0.1);
 end loop;
 ${c.scenario==='membership-revocation'?`update vb_private.client_memberships set active=false where client_id=${q(m.client_id)}::uuid and user_id=${q(m.user_id)}::uuid and active; if not found then raise exception 'Fixture membership was not revoked'; end if;`:''}
 proof:=jsonb_build_object('status','OVERLAP_CONFIRMED','run_id',${q(m.run_id)},'case_id',${q(c.id)},'actor','controller','pid',pg_backend_pid(),'winner_pid',w,'loser_pid',l,'winner_blocked_by',pg_backend_pid(),'loser_blocked_by',w,'revocation_before_gate_release',${c.scenario==='membership-revocation'});
 update ${table} set payload=jsonb_set(payload,array['overlap',${q(c.id)}],proof) where run_id=${q(m.run_id)}::uuid;
 perform set_config('vb_brand_map.race_report',proof::text,true);
end $bm_controller$;
${reportSelect}commit;
`;
  const winner=start(m,o,c.index+'-winner',c.isolation)+runGuard(m)+freshCase(m,c)+`do $bm_controller_exists$ begin
 if (select count(*) from (${gateOwner(m,c,'controller')}) controller)<>1 then raise exception 'Controller does not own this gate'; end if;
end $bm_controller_exists$;
`+actorSql(m,c)+`do $bm_winner$ begin
 execute ${q(winnerAction)};
 perform pg_advisory_xact_lock(${gate(m,c)});
 ${saveReport(m,c,'winner',"'status','WINNER_COMMITTED','action_performed',true,'controller_gate_released',true")}
end $bm_winner$;
${reportSelect}commit;
`;
  const loserAuth=claims(m,['direct-mark-update','uspto-import','review-and-status-refresh'].includes(c.scenario));
  const loser=start(m,o,c.index+'-loser',c.isolation)+runGuard(m)+freshCase(m,c)+awaitWinner(m,c)+loserAuth+`do $bm_loser$ declare read_result jsonb; outcome text:='00000'; begin
 read_result:=public.vb_read_brand_map(${q(m.client_id)}::uuid);
 if read_result->>'client_id' is distinct from ${q(m.client_id)} then raise exception 'Scoped initial read failed'; end if;
 ${c.expected_code==='00000'?`execute ${q(loserAction)};`:`begin
 execute ${q(loserAction)};
 raise exception using errcode='VB002',message='Invalid competing write unexpectedly succeeded';
 exception when sqlstate ${q(c.expected_code)} then outcome:=sqlstate;
 end;`}
 ${saveReport(m,c,'loser',"'status','LOSER_RESULT','initial_read_succeeded',true,'sqlstate',outcome")}
end $bm_loser$;
${reportSelect}${c.expected_code==='00000'?'commit':'rollback'};
`;
  return {controller,winner,loser};
}

export function verifyCaseReports(m,c,reports) {
  validateManifest(m);
  if(!m.cases.some(x=>x===c))throw Error('Unknown case.');
  if(!exactKeys(reports,['controller','winner','loser']))throw Error('Unexpected race participants.');
  const {controller:ctl,winner:w,loser:l}=reports;
  for(const [actor,r,keys] of [['controller',ctl,['status','run_id','case_id','actor','pid','winner_pid','loser_pid','winner_blocked_by','loser_blocked_by','revocation_before_gate_release']],['winner',w,['run_id','case_id','actor','pid','isolation','status','action_performed','controller_gate_released']],['loser',l,['run_id','case_id','actor','pid','isolation','status','initial_read_succeeded','sqlstate']]]){
    if(!r||Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k))||r.run_id!==m.run_id||r.case_id!==c.id||r.actor!==actor||!Number.isInteger(r.pid)||r.pid<1)throw Error('Incomplete, foreign or unexpected report fields.');
  }
  if(new Set([ctl.pid,w.pid,l.pid]).size!==3||ctl.status!=='OVERLAP_CONFIRMED'||ctl.winner_pid!==w.pid||ctl.loser_pid!==l.pid||ctl.winner_blocked_by!==ctl.pid||ctl.loser_blocked_by!==w.pid||ctl.revocation_before_gate_release!==(c.scenario==='membership-revocation')||w.status!=='WINNER_COMMITTED'||w.action_performed!==true||w.controller_gate_released!==true||l.status!=='LOSER_RESULT'||l.initial_read_succeeded!==true||l.sqlstate!==c.expected_code||w.isolation!==c.isolation||l.isolation!==c.isolation)throw Error('Wrong overlap, isolation, action or SQLSTATE evidence.');
  return reports;
}
function postcondition(m,c) {
  const a=q(c.assets[0])+'::uuid',mark=q(c.mark_id)+'::uuid';
  switch(c.scenario){
    case 'cycle':return `(select count(*)=1 from public.vb_brand_relationships where client_id=${q(m.client_id)}::uuid and child_asset_id in (${c.assets.map(id=>q(id)+'::uuid').join(',')}) and parent_asset_id is not null)`;
    case 'stale-edit':return `(select name='Winning name' and version=2 from public.vb_brand_assets where id=${a})`;
    case 'membership-revocation':return `(select version=1 from public.vb_brand_assets where id=${a}) and (select not active from vb_private.client_memberships where client_id=${q(m.client_id)}::uuid and user_id=${q(m.user_id)}::uuid)`;
    case 'direct-mark-update':case 'uspto-import':return `(select record_owner='Changed owner' from public.vb_marks where id=${mark}) and (select mark_id is null from public.vb_brand_legal_links where asset_id=${a})`;
    case 'review-and-status-refresh':return `(select status='pending' and record_owner='Test owner' from public.vb_marks where id=${mark}) and (select mark_id=${mark} and reviewed_mark_fingerprint=vb_private.brand_map_mark_fingerprint(mr) and reviewed_asset_identity_revision=a.identity_revision from public.vb_brand_legal_links l join public.vb_marks mr on mr.id=l.mark_id join public.vb_brand_assets a on a.id=l.asset_id where l.asset_id=${a})`;
  }
}
export function buildVerification(m,c,reports,o={}) {
  const r=reports?verifyCaseReports(m,c,reports):null;
  return start(m,o,c.index+'-verify')+runGuard(m)+`do $bm_verify$ declare r jsonb:=${r?j(r):"null::jsonb"}; saved jsonb; begin
 if r is null then raise exception 'Full validated participant reports required'; end if;
 if exists(select 1 from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and application_name in (${['controller','winner','loser'].map(actor=>q(m.label+'-'+c.index+'-'+actor)).join(',')}) and state<>'idle') then raise exception 'Participants have not ended their transactions'; end if;
 select payload->'overlap'->${q(c.id)} into saved from ${table} where run_id=${q(m.run_id)}::uuid;
 if saved is distinct from r->'controller' then raise exception 'Controller proof did not commit or differs'; end if;
 if (${postcondition(m,c)}) is not true then raise exception 'Race state assertion failed'; end if;
 ${c.scenario==='membership-revocation'?`update vb_private.client_memberships set active=true where client_id=${q(m.client_id)}::uuid and user_id=${q(m.user_id)}::uuid and not active; if not found then raise exception 'Fixture membership restoration failed'; end if;`:''}
 update ${table} set payload=jsonb_set(payload,array['completed',${q(c.id)}],jsonb_build_object('reports',r,'state_assertion',true)) where run_id=${q(m.run_id)}::uuid;
 perform set_config('vb_brand_map.race_report',jsonb_build_object('status','CASE_PASS','run_id',${q(m.run_id)},'case_id',${q(c.id)},'postcondition_verified',true)::text,true);
end $bm_verify$;
${reportSelect}commit;
`;
}
export function buildGateRehearsal(m,o={}) {
  const c={index:100,id:'gate-rehearsal',isolation:'read committed'},dataKey=101;
  const controller=start(m,o,'100-controller','read committed',true)+`do $bm_gate_controller$ declare deadline timestamptz:=clock_timestamp()+interval '20 seconds'; w integer; l integer; begin
 if not pg_try_advisory_xact_lock(${gate(m,c)}) then raise exception 'Rehearsal gate in use'; end if;
 loop
  perform pg_stat_clear_snapshot();
  select pid into w from pg_stat_activity where datname=current_database() and usename='postgres' and application_name=${q(m.label+'-100-winner')} and state='active' and wait_event_type='Lock';
  select pid into l from pg_stat_activity where datname=current_database() and usename='postgres' and application_name=${q(m.label+'-100-loser')} and state='active' and wait_event_type='Lock';
  if w is not null and l is not null and w<>l and pg_blocking_pids(w)=array[pg_backend_pid()] and pg_blocking_pids(l)=array[w] then exit; end if;
  if clock_timestamp()>deadline then raise exception 'Controlled release rehearsal failed'; end if;
  perform pg_sleep(0.1);
 end loop;
 ${saveReport(m,c,'controller',"'status','GATE_OVERLAP','winner_pid',w,'loser_pid',l,'winner_blocked_by',pg_backend_pid(),'loser_blocked_by',w")}
end $bm_gate_controller$;
${reportSelect}commit;
`;
  const winner=start(m,o,'100-winner','read committed',true)+`do $bm_gate_winner$ begin
 if (select count(*) from (${gateOwner(m,c,'controller')}) controller)<>1 then raise exception 'Rehearsal controller gate missing'; end if;
 if not pg_try_advisory_xact_lock(${m.namespace},${dataKey}) then raise exception 'Rehearsal data lock in use'; end if;
 perform pg_advisory_xact_lock(${gate(m,c)});
 ${saveReport(m,c,'winner',"'status','GATE_RELEASED'")}
end $bm_gate_winner$;
${reportSelect}commit;
`;
  const loser=start(m,o,'100-loser','read committed',true)+awaitWinner(m,c)+`do $bm_gate_loser$ begin
 perform pg_advisory_xact_lock(${m.namespace},${dataKey});
 ${saveReport(m,c,'loser',"'status','GATE_RELEASED'")}
end $bm_gate_loser$;
${reportSelect}commit;
`;
  return {controller,winner,loser};
}
export function verifyGateReports(m,r) {
  validateManifest(m);
  if(!exactKeys(r,['controller','winner','loser']))throw Error('Unexpected rehearsal participants.');
  for(const [actor,keys] of [['controller',['run_id','case_id','actor','pid','isolation','status','winner_pid','loser_pid','winner_blocked_by','loser_blocked_by']],['winner',['run_id','case_id','actor','pid','isolation','status']],['loser',['run_id','case_id','actor','pid','isolation','status']]])if(!exactKeys(r[actor],keys))throw Error('Unexpected rehearsal fields.');
  const {controller:c,winner:w,loser:l}=r||{};
  if(!c||!w||!l||[c,w,l].some(x=>x.run_id!==m.run_id||x.case_id!=='gate-rehearsal'||!Number.isInteger(x.pid)||x.pid<1||x.isolation!=='read committed')||new Set([c.pid,w.pid,l.pid]).size!==3||c.actor!=='controller'||w.actor!=='winner'||l.actor!=='loser'||c.status!=='GATE_OVERLAP'||w.status!=='GATE_RELEASED'||l.status!=='GATE_RELEASED'||c.winner_pid!==w.pid||c.loser_pid!==l.pid||c.winner_blocked_by!==c.pid||c.loser_blocked_by!==w.pid)throw Error('Incomplete controlled-release rehearsal evidence.');
  return true;
}
export function buildCleanup(m,migration,privacy,o={}) {
  const assetIds=m.cases.flatMap(c=>c.assets),markIds=m.cases.map(c=>c.mark_id).filter(Boolean);
  const assets=assetIds.map(id=>q(id)+'::uuid').join(','),marks=markIds.map(id=>q(id)+'::uuid').join(',');
  return start(m,o,'cleanup')+`set local lock_timeout='3s';\nset local statement_timeout='30s';
${runGuard(m)}
${snapshot(m,migration,privacy)}
do $bm_cleanup_locks$ declare rel record; begin
 for rel in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and ((n.nspname='public' and c.relname like 'vb_%') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) order by n.nspname,c.relname loop
  execute format('lock table %I.%I in share row exclusive mode',rel.nspname,rel.relname);
 end loop;
end $bm_cleanup_locks$;
do $bm_cleanup_checks$ declare r jsonb; rel record; unexpected boolean; col text; begin
 select payload into strict r from ${table} where run_id=${q(m.run_id)}::uuid for update;
 perform set_config('vb_brand_map.snapshot_ignored_dates',(r->'added_dates')::text,true);
 if (select count(*) from ${table})<>1 then raise exception 'Manifest table contains another run'; end if;
 if exists(select 1 from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and application_name like ${q(m.label+'-%')} and state<>'idle') then raise exception 'Run sessions still active'; end if;
 for col in select jsonb_array_elements_text(r->'added_dates') loop
  if col not in ('filing_date','registration_date','uspto_status_date') then raise exception 'Unowned date field'; end if;
  execute format('select exists(select 1 from public.vb_marks where client_id is distinct from $1 and %I is not null)',col) into unexpected using ${q(m.client_id)}::uuid;
  if unexpected then raise exception 'Other feature uses temporary date fields; cleanup refused'; end if;
 end loop;
 if pg_temp.brand_map_preservation_snapshot() is distinct from r->'baseline_rows' then raise exception 'Preexisting records changed: do not clean shared work'; end if;
 if (select count(*) from public.vb_brand_assets)<>${assetIds.length} or exists(select 1 from public.vb_brand_assets where client_id<>${q(m.client_id)}::uuid or id not in (${assets}) or source_kind<>'manual_client')
 or exists(select 1 from public.vb_brand_relationships where client_id<>${q(m.client_id)}::uuid or child_asset_id not in (${assets}) or (parent_asset_id is not null and parent_asset_id not in (${assets})))
 or exists(select 1 from public.vb_brand_legal_links where client_id<>${q(m.client_id)}::uuid or asset_id not in (${assets}) or (mark_id is not null and mark_id not in (${marks})))
 then raise exception 'Unowned records use the new Brand Map tables'; end if;
 if exists(select 1 from public.vb_marks where client_id=${q(m.client_id)}::uuid and id not in (${marks}))
 or exists(select 1 from vb_private.client_memberships where (client_id=${q(m.client_id)}::uuid and user_id<>${q(m.user_id)}::uuid) or (user_id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid) and client_id<>${q(m.client_id)}::uuid))
 or exists(select 1 from vb_private.audit_events where actor_id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid) and client_id is distinct from ${q(m.client_id)}::uuid)
 or exists(select 1 from vb_private.audit_events where client_id=${q(m.client_id)}::uuid and ((actor_id is not null and actor_id not in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)) or table_name not in ('vb_clients','vb_marks','vb_service_preferences','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links') or (record_id not in (${q(m.client_id)}::uuid,${assets},${marks}) and not exists(select 1 from public.vb_brand_relationships s where audit_events.table_name='vb_brand_relationships' and s.id=audit_events.record_id and s.client_id=audit_events.client_id and audit_events.current_data->>'id'=s.id::text and audit_events.current_data->>'client_id'=s.client_id::text and audit_events.current_data->>'child_asset_id'=s.child_asset_id::text and (audit_events.previous_data is null or (audit_events.previous_data->>'id'=s.id::text and audit_events.previous_data->>'client_id'=s.client_id::text and audit_events.previous_data->>'child_asset_id'=s.child_asset_id::text))) and not exists(select 1 from public.vb_brand_legal_links s where audit_events.table_name='vb_brand_legal_links' and s.id=audit_events.record_id and s.client_id=audit_events.client_id and audit_events.current_data->>'id'=s.id::text and audit_events.current_data->>'client_id'=s.client_id::text and audit_events.current_data->>'asset_id'=s.asset_id::text and (audit_events.previous_data is null or (audit_events.previous_data->>'id'=s.id::text and audit_events.previous_data->>'client_id'=s.client_id::text and audit_events.previous_data->>'asset_id'=s.asset_id::text))))))
 or exists(select 1 from public.vb_service_preferences where client_id=${q(m.client_id)}::uuid and enabled)
 then raise exception 'Foreign fixture references: cleanup refused'; end if;
 if exists(select 1 from auth.identities where user_id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)) or exists(select 1 from auth.sessions where user_id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)) then raise exception 'SQL-only fixture became an actual Auth account; use supported Auth cleanup'; end if;
 for rel in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('public','vb_private') and c.relname not in ('vb_clients','vb_marks','vb_service_preferences','vb_brand_assets','vb_brand_relationships','vb_brand_legal_links','client_memberships','staff_members','audit_events','brand_map_race_runs') and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='client_id' and not a.attisdropped) loop
  execute format('select exists(select 1 from %I.%I where client_id=$1)',rel.nspname,rel.relname) into unexpected using ${q(m.client_id)}::uuid;
  if unexpected then raise exception 'Other feature records depend on this fixture; cleanup refused'; end if;
 end loop;
 perform set_config('vb_brand_map.cleanup_manifest',r::text,true);
end $bm_cleanup_checks$;
delete from public.vb_brand_legal_links where client_id=${q(m.client_id)}::uuid and asset_id in (${assets});
delete from public.vb_brand_relationships where client_id=${q(m.client_id)}::uuid and child_asset_id in (${assets});
delete from public.vb_brand_assets where client_id=${q(m.client_id)}::uuid and id in (${assets});
delete from public.vb_marks where client_id=${q(m.client_id)}::uuid and id in (${marks});
delete from vb_private.audit_events where client_id=${q(m.client_id)}::uuid;
delete from public.vb_service_preferences where client_id=${q(m.client_id)}::uuid;
delete from vb_private.client_memberships where client_id=${q(m.client_id)}::uuid and user_id=${q(m.user_id)}::uuid;
delete from public.vb_clients where id=${q(m.client_id)}::uuid and name=${q('Brand Map race '+m.run_id)};
delete from vb_private.staff_members where user_id=${q(m.staff_id)}::uuid;
delete from auth.users where id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid) and email in (${q('bm-race-'+m.run_id+'-client@example.invalid')},${q('bm-race-'+m.run_id+'-staff@example.invalid')}) and coalesce(encrypted_password,'')='';
${functions.slice(0,5).map(fn=>'drop function '+fn+';').join('\n')}
${brandTables.map(t=>'drop table '+t+';').join('\n')}
${functions.slice(5).map(fn=>'drop function '+fn+';').join('\n')}
do $bm_remove_uspto$ declare r jsonb:=current_setting('vb_brand_map.cleanup_manifest')::jsonb; begin
 if r->>'temporary_uspto'='true' then
  if r->>'uspto_source_hash' is distinct from ${q(usptoHash)} or to_regprocedure(${q(usptoSignature)}) is null then raise exception 'USPTO prerequisite ownership changed'; end if;
  execute 'drop function public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)';
 end if;
end $bm_remove_uspto$;
alter table public.vb_marks drop constraint vb_marks_id_client_unique;
do $bm_remove_dates$ declare col text; begin
 for col in select jsonb_array_elements_text(current_setting('vb_brand_map.cleanup_manifest')::jsonb->'added_dates') loop
  if col not in ('filing_date','registration_date','uspto_status_date') then raise exception 'Unowned date field'; end if;
  execute format('alter table public.vb_marks drop column %I',col);
 end loop;
end $bm_remove_dates$;
drop table ${table};
do $bm_cleanup_result$ declare r jsonb:=current_setting('vb_brand_map.cleanup_manifest')::jsonb; begin
 if (${schemaDigestSql}) is distinct from r->>'baseline_schema' or (${extensionState}) is distinct from r->'baseline_extensions' or pg_temp.brand_map_preservation_snapshot() is distinct from r->'baseline_rows' then raise exception 'Preservation check failed: cleanup transaction rolls back'; end if;
 if exists(select 1 from auth.users where id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)) or exists(select 1 from public.vb_clients where id=${q(m.client_id)}::uuid) or exists(select 1 from public.vb_marks where id in (${marks})) or exists(select 1 from vb_private.audit_events where client_id=${q(m.client_id)}::uuid) then raise exception 'Fixture leftovers'; end if;
 perform set_config('vb_brand_map.race_report',jsonb_build_object('status','CLEANUP_VERIFIED','run_id',${q(m.run_id)},'preexisting_rows_and_rules_preserved',true,'audit_sequence_gaps_possible',true,'completed_cases',r->'completed')::text,true);
end $bm_cleanup_result$;
${reportSelect}drop function pg_temp.brand_map_preservation_snapshot();
commit;
`;
}
export function postcheck(m) {
 validateManifest(m);
 return `-- Read-only independent confirmation; verify exact BCM Test URL.
begin read only;
set local statement_timeout='30s';
select jsonb_build_object('project_expected',${q(TEST_PROJECT)},'database_identity',(select system_identifier::text from pg_control_system()),'schema_digest',(${schemaDigestSql}),'extension_state',(${extensionState}),'uspto_save_available',to_regprocedure(${q(usptoSignature)}) is not null,'manifest_absent',to_regclass(${q(table)}) is null,'owned_functions_absent',${functions.map(fn=>`to_regprocedure(${q(fn)}) is null`).join(' and ')},'owned_tables_absent',${brandTables.map(t=>`to_regclass(${q(t)}) is null`).join(' and ')},'remaining_users',(select count(*) from auth.users where id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)),'remaining_clients',(select count(*) from public.vb_clients where id=${q(m.client_id)}::uuid),'remaining_marks',(select count(*) from public.vb_marks where id in (${m.cases.map(c=>c.mark_id).filter(Boolean).map(id=>q(id)+'::uuid').join(',')})),'remaining_memberships',(select count(*) from vb_private.client_memberships where client_id=${q(m.client_id)}::uuid or user_id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)),'remaining_staff',(select count(*) from vb_private.staff_members where user_id=${q(m.staff_id)}::uuid),'remaining_preferences',(select count(*) from public.vb_service_preferences where client_id=${q(m.client_id)}::uuid),'remaining_audit_rows',(select count(*) from vb_private.audit_events where client_id=${q(m.client_id)}::uuid or actor_id in (${q(m.user_id)}::uuid,${q(m.staff_id)}::uuid)),'remaining_active_run_connections',(select count(*) from pg_stat_activity where pid<>pg_backend_pid() and datname=current_database() and application_name like ${q(m.label+'-%')} and state<>'idle')) as brand_map_race_postcheck;
rollback;
`;
}
export function verifyCompletedRun(m,caseReports,cleanup,after,before) {
 validateManifest(m);
 if(!Array.isArray(caseReports)||caseReports.length!==12||new Set(caseReports.map(r=>r.case_id)).size!==12)throw Error('All 12 distinct independent case results required.');
 for(const c of m.cases){const r=caseReports.find(x=>x.case_id===c.id);if(!exactKeys(r,['status','run_id','case_id','postcondition_verified'])||r.status!=='CASE_PASS'||r.run_id!==m.run_id||r.postcondition_verified!==true)throw Error('Missing independent database state evidence.');}
 if(!exactKeys(cleanup,['status','run_id','preexisting_rows_and_rules_preserved','audit_sequence_gaps_possible','completed_cases'])||cleanup.status!=='CLEANUP_VERIFIED'||cleanup.run_id!==m.run_id||cleanup.preexisting_rows_and_rules_preserved!==true||cleanup.audit_sequence_gaps_possible!==true||!exactKeys(cleanup.completed_cases,m.cases.map(c=>c.id)))throw Error('Cleanup or full committed coverage is missing.');
 for(const c of m.cases){const x=cleanup.completed_cases[c.id];if(!exactKeys(x,['reports','state_assertion'])||x.state_assertion!==true)throw Error('Missing saved state assertion.');verifyCaseReports(m,c,x.reports);}
 if(before?.operator_expected_project!==TEST_PROJECT||before.database_name!=='postgres'||before.executor_role!=='postgres'||! /^[1-9][0-9]{14,19}$/.test(before.database_identity||'')||! /^[a-f0-9]{64}$/.test(before.schema_digest||'')||!Array.isArray(before.prerequisite_state?.extensions))throw Error('Fresh preflight evidence missing.');
 if(before.race_prerequisites&&after?.uspto_save_available!==before.race_prerequisites.uspto_save_available)throw Error('USPTO prerequisite was not restored.');
 if(after?.project_expected!==TEST_PROJECT||after.database_identity!==before.database_identity||after.schema_digest!==before.schema_digest||JSON.stringify(after.extension_state)!==JSON.stringify(before.prerequisite_state.extensions)||['manifest_absent','owned_functions_absent','owned_tables_absent'].some(k=>after[k]!==true)||['remaining_users','remaining_clients','remaining_marks','remaining_memberships','remaining_staff','remaining_preferences','remaining_audit_rows','remaining_active_run_connections'].some(k=>after[k]!==0))throw Error('Independent restoration/leftover confirmation failed.');
 return {status:'PASS',run_id:m.run_id,simultaneous_edit_cases:12,real_client_login_checks:0,cleanup_verified:true};
}
export function racePreflightSql() {
 const sql=preflightSql(),suffix=') as brand_map_readonly_preflight;';
 if(!sql.includes(suffix))throw Error('Preflight structure changed.');
 return sql.replace(suffix,`, 'race_prerequisites',jsonb_build_object('uspto_save_available',to_regprocedure('public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)') is not null,'auth_fixture_columns_available',not exists(select 1 from (values ('users','id'),('users','email'),('users','encrypted_password'),('identities','user_id'),('sessions','user_id')) required(tbl,col) where not exists(select 1 from information_schema.columns where table_schema='auth' and table_name=required.tbl and column_name=required.col)),'control_table_absent',to_regclass('vb_private.brand_map_race_runs') is null)
`+suffix);
}
export async function sources() {
 const [migration,privacy]=await loadSources();
 const localConcurrency=await readFile(new URL('../brand-map/concurrency.test.mjs',import.meta.url),'utf8');
 if(digest(migration)!==draftHash||digest(privacy)!==privacyHash||digest(localConcurrency)!==concurrencyHash) throw Error('Reviewed source changed.');
 const usptoSource=await readFile(new URL('./uspto-save.reviewed.sql',import.meta.url),'utf8');
 if(digest(usptoSource)!==usptoHash)throw Error('Reviewed USPTO source changed.');
 return {migration,privacy,localConcurrency,usptoSource};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==2)throw Error('Preparation CLI accepts no enabling or credential arguments.');
 const m=manifest(),s=await sources(),files={};
 files['00-readonly-preflight.sql']=racePreflightSql();
 for(const [actor,sql] of Object.entries(buildGateRehearsal(m)))files['gate-rehearsal/'+actor+'.BLOCKED.sql']=sql;
 files['01-setup.BLOCKED.sql']=buildSetup(m,s.migration,s.privacy);
 for(const c of m.cases){for(const [actor,sql] of Object.entries(buildRace(m,c)))files['cases/'+String(c.index).padStart(2,'0')+'-'+actor+'.BLOCKED.sql']=sql;files['cases/'+String(c.index).padStart(2,'0')+'-verify.BLOCKED.sql']=buildVerification(m,c,null);}
 files['02-cleanup.BLOCKED.sql']=buildCleanup(m,s.migration,s.privacy);
 files['03-readonly-postcheck.sql']=postcheck(m);
 for(const [name,value] of Object.entries(files)){const url=new URL('./prepared/'+name,import.meta.url);await mkdir(new URL('.',url),{recursive:true});await writeFile(url,value);}
 await writeFile(new URL('./prepared/fixture-manifest.json',import.meta.url),JSON.stringify(m,null,2)+'\n');
 await writeFile(new URL('./prepared/source-manifest.json',import.meta.url),JSON.stringify({prepared_only:true,project:TEST_PROJECT,run_id:m.run_id,source_hashes:{migration:digest(s.migration),privacy:digest(s.privacy),local_concurrency:digest(s.localConcurrency)},file_hashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,digest(v)])),database_runs:0,actual_login_runs:0},null,2)+'\n');
 console.log('Prepared blocked rehearsal, setup, 12 race triplets/verifiers, cleanup and read-only confirmation. No database connection.');
}
