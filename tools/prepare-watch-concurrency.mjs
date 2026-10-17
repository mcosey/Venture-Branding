// Produces reviewable SQL only. No database connection, credentials or execution.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../supabase/proposals/watch-concurrency/',import.meta.url);
await mkdir(root,{recursive:true});
const uuid=(group,n)=>`f2c${group}0000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const cases=['first-save','stale-update','shared-cap','close-before-save','save-before-close','close-before-worker','worker-before-close','legacy-writer'];
const clients=cases.map((name,i)=>({name,n:i+1,cid:uuid('0',i+1),scopes:[1,2].map(j=>({eid:uuid('1',(i+1)*10+j),mid:uuid('2',(i+1)*10+j),marks:Array.from({length:i===2?6:1},(_,k)=>uuid('3',(i+1)*100+j*10+k+1))}))}));
const lit=s=>`'${s.replaceAll("'","''")}'`;
const list=xs=>xs.map(lit).join(',');
const arr=xs=>`array[${list(xs)}]::uuid[]`;
const allC=clients.map(c=>c.cid),allE=clients.flatMap(c=>c.scopes.map(s=>s.eid)),allM=clients.flatMap(c=>c.scopes.flatMap(s=>s.marks));
const post=JSON.parse(await readFile(new URL('../watch-engagement-compatibility/test-postcheck.json',root),'utf8')).result;
const guard=`-- BEGIN HOSTED GUARDS
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'BCM Test only'; end if;
 if to_regclass('vb_private.watch_scope_settings') is null then raise exception 'Installed scoped Watch required'; end if;
 ${Object.entries(post.rpc_fingerprints).map(([fn,hash])=>`if md5(pg_get_functiondef(${lit(fn)}::regprocedure))<>${lit(hash)} then raise exception 'Installed Watch definition changed'; end if;`).join('\n ')}
end $$;
-- END HOSTED GUARDS
`;
const common=`begin;
set local statement_timeout='45s';
set local lock_timeout='30s';
set local idle_in_transaction_session_timeout='45s';
${guard}
select set_config('request.jwt.claims','{}',true);
create or replace function pg_temp.race_assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
`;
const actors=`create temporary table race_actors on commit drop as select
 (select id from auth.users where lower(email)='mithrilzeppelin117@gmail.com') a,
 (select id from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com') b,
 (select user_id from vb_private.staff_members where active order by user_id limit 1) staff;
select pg_temp.race_assert((select a is not null and b is not null and staff is not null and a<>b and a<>staff and b<>staff from race_actors),'Three distinct existing Test identities');
create or replace function pg_temp.race_actor(who text) returns void language sql as $$ select set_config('request.jwt.claims',jsonb_build_object('sub',case who when 'a' then a when 'b' then b else staff end,'role','authenticated','aal',case when who='staff' then 'aal2' else 'aal1' end)::text,true)::text::void from race_actors $$;
grant select on race_actors to authenticated,service_role;
do $$ begin execute format('grant usage on schema %I to authenticated,service_role',(select nspname from pg_namespace where oid=pg_my_temp_schema())); end $$;
`;
const fixtureGuard=c=>`select pg_temp.race_assert(exists(select 1 from public.vb_clients where id=${lit(c.cid)} and name=${lit('DISPOSABLE WATCH RACE — '+c.name)}),'Expected disposable fixture');\n`;
const request=(c,j=0,marks=c.scopes[j].marks)=>`create temporary table race_request on commit drop as select ${lit(c.cid)}::uuid cid,${lit(c.scopes[j].eid)}::uuid eid,s.id cfg,coalesce(s.version,0) ver,${arr(marks)} marks from (select 1) x left join vb_private.watch_scope_settings s on s.client_id=${lit(c.cid)} and s.engagement_id=${lit(c.scopes[j].eid)};
grant select on race_request to authenticated;
`;
const save=monitor=>`select public.vb_watch_save_scoped(cid,eid,cfg,ver,marks,${monitor}) from race_request;\n`;
const close=c=>`select public.vb_close_test_engagement(${lit(c.scopes[0].eid)},'active');\n`;
const gateA=n=>`select pg_advisory_xact_lock(73772132,${n});\n`;
const gateB=n=>`select pg_temp.race_assert(not pg_try_advisory_xact_lock(73772132,${n}),'Session A must still hold the overlap gate');
create temporary table race_overlap on commit drop as select clock_timestamp() started,pg_backend_pid() b_pid,(select pid from pg_locks where locktype='advisory' and classid=73772132 and objid=${n} and objsubid=2 and granted limit 1) a_pid;
select pg_temp.race_assert((select a_pid is not null and a_pid<>b_pid from race_overlap),'Two independent PostgreSQL sessions');
`;
const hold=`reset role;
select pg_sleep(18);
select jsonb_build_object('session_a_pid',pg_backend_pid(),'action_completed_before_commit_at',clock_timestamp()) as session_a_receipt;
commit;
`;
const bReceipt=(n,blocked=true)=>`select pg_temp.race_assert(${blocked?"clock_timestamp()-started>interval '1 second'":"clock_timestamp()-started<interval '14 seconds'"},${lit(blocked?'Competing operation actually waited':'Worker skips locked client promptly')}) from race_overlap;
select jsonb_build_object('case',${n},'a_pid',a_pid,'b_pid',b_pid,'elapsed_seconds',extract(epoch from clock_timestamp()-started),'passed',true) as session_b_receipt from race_overlap;
commit;
`;
const expectError=(sql,code)=>`create temporary table race_error(actual text) on commit drop;
do $$ declare code text:='00000'; begin begin ${sql} exception when others then get stacked diagnostics code=returned_sqlstate; end; insert into race_error values(code); end $$;
select pg_temp.race_assert((select actual=${lit(code)} from race_error),${lit('Expected SQLSTATE '+code)});
`;
const write=async(name,text)=>writeFile(new URL(name,root),text);
let setup=common+actors+`select pg_advisory_xact_lock(73772131);
select pg_temp.race_assert(not exists(select 1 from public.vb_clients where id in(${list(allC)})),'Reserved client IDs unused');
select pg_temp.race_assert(not exists(select 1 from public.vb_engagements where id in(${list(allE)})),'Reserved engagement IDs unused');
select pg_temp.race_assert(not exists(select 1 from public.vb_marks where id in(${list(allM)})),'Reserved mark IDs unused');
select pg_temp.race_assert(not exists(select 1 from vb_private.watch_files where revision=repeat('e',64)),'Reserved synthetic source revision unused');
select pg_temp.race_assert(not exists(select 1 from vb_private.watch_applications where serial in('99170301','99170302')),'Reserved synthetic serials unused');
select pg_temp.race_assert((select enabled from vb_private.watch_config),'Existing Test Watch readiness required; do not change it');
select pg_temp.race_assert((select not ready from vb_private.bcm_scheduler_config where singleton),'Test scheduler must remain disabled');
`;
for(const c of clients){
 setup+=`insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values(${lit(c.cid)},${lit('DISPOSABLE WATCH RACE — '+c.name)},'business','Synthetic concurrency fixture',true);\n`;
 for(const [j,s] of c.scopes.entries())setup+=`insert into public.vb_engagements(id,client_id,title,status,activated_at) values(${lit(s.eid)},${lit(c.cid)},${lit('DISPOSABLE WATCH RACE '+c.n+' '+(j?'B':'A'))},'active',now());
insert into public.vb_matters(id,engagement_id,title) values(${lit(s.mid)},${lit(s.eid)},'Synthetic security boundary');
insert into vb_private.engagement_services(engagement_id,service,enabled) select ${lit(s.eid)},service,true from unnest(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest']) service on conflict(engagement_id,service) do nothing;
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) select ${lit(s.eid)},${j?'b':'a'},'active',now() from race_actors;
`;
 const a=c.scopes[0];
 setup+=`insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled) values(${lit(c.cid)},${lit(a.eid)},${lit(a.mid)},'Fictional Test mapping — October 16, 2026',true);
insert into vb_private.portal_service_bindings(client_id,service,engagement_id,matter_id) select ${lit(c.cid)},service,${lit(a.eid)},${lit(a.mid)} from unnest(array['portfolio','trademark_watch']) service;
`;
 for(const [j,s]of c.scopes.entries()){
  for(const [k,id]of s.marks.entries())setup+=`insert into public.vb_marks(id,client_id,name,mark_type,status) values(${lit(id)},${lit(c.cid)},${lit('VBWCRACEABCDEFGHIJKLMNOPQRSTUVWXYZ'+c.n+(j?'B':'A')+k)},'word','not_filed');\n`;
  if(j)setup+=`update vb_private.legacy_test_record_scopes set engagement_id=${lit(s.eid)},matter_id=${lit(s.mid)} where client_id=${lit(c.cid)} and resource='public.vb_marks' and record_key->>'id' in(${list(s.marks)});\n`;
  if(!(c.n===1&&j===0))setup+=`insert into vb_private.watch_scope_settings(client_id,engagement_id,mark_ids,version,enabled,started_on,next_run_at) values(${lit(c.cid)},${lit(s.eid)},${arr([s.marks[0]])},1,${[4,6,7].includes(c.n)?'true':'false'},${[4,6,7].includes(c.n)?'current_date':'null'},${c.n===6&&j===0?"'-infinity'::timestamptz":[4,6,7].includes(c.n)?"now()+interval '1 year'":'null'});\n`;
 }
 if(c.n===8)setup+=`insert into vb_private.watch_settings(client_id,mark_ids,enabled,version) values(${lit(c.cid)},${arr([a.marks[0]])},false,9);\n`;
}
setup+=`insert into vb_private.watch_files(filename,revision,manifest_revision,data_date,expected,completed_at) select 'apc'||to_char(current_date-n,'YYMMDD')||'.zip',repeat('e',64),repeat('f',64),current_date-n,0,now() from generate_series(0,6) n;
insert into vb_private.watch_applications(serial,name,filing_date,goods,classes,owners,status_code,file_id) select serial,name,current_date,'[]','[]','[]','630',id from vb_private.watch_files cross join (values('99170301','VBWCRACEABCDEFGHIJKLMNOPQRSTUVWXYZ7A0'),('99170302','VBWCRACEABCDEFGHIJKLMNOPQRSTUVWXYZ6B0')) fixture(serial,name) where revision=repeat('e',64) and data_date=current_date;
select 8 as disposable_clients,16 as disposable_engagements,16 as temporary_grants,${allM.length} as fictional_marks;
commit;
`;
await write('01-setup.sql',setup);
for(const c of clients){
 const n=c.n;
 let a=common+actors+fixtureGuard(c)+gateA(n),b=common+actors+fixtureGuard(c)+gateB(n);
 if([1,2,3,5].includes(n)){
  a+=request(c)+`set local role authenticated;\nselect pg_temp.race_actor('a');\n`+save(n===5?'true':'false');
  if([1,2,3].includes(n)){
   b+=request(c,n===3?1:0)+`set local role authenticated;\nselect pg_temp.race_actor('${n===3?'b':'a'}');\n`;
   const cmd='perform public.vb_watch_save_scoped(cid,eid,cfg,ver,marks,false) from race_request;';
   b+=expectError(cmd,n===3?'22023':'40001')+'reset role;\n'+bReceipt(n);
  }else b+=`set local role authenticated;\nselect pg_temp.race_actor('staff');\n`+close(c)+'reset role;\n'+bReceipt(n);
 }else if([4,6].includes(n)){
  a+=`set local role authenticated;\nselect pg_temp.race_actor('staff');\n`+close(c);
  if(n===4)b+=request(c)+`set local role authenticated;\nselect pg_temp.race_actor('a');\n`+expectError('perform public.vb_watch_save_scoped(cid,eid,cfg,ver,marks,true) from race_request;','42501')+'reset role;\n'+bReceipt(n);
  else{
   b+=`-- Only the locked fixture is due. All other schedule changes in this probe roll back.
select pg_advisory_xact_lock(73772131);
update vb_private.watch_scope_settings set next_run_at=now()+interval '1 year' where enabled and client_id<>${lit(c.cid)};
update vb_private.watch_settings set next_run_at=now()+interval '1 year' where enabled;
-- Setup made A due and B future-scheduled. A owns the client lock; worker
-- selection must skip it without waiting. Companion continuation is checked
-- after A commits. This probe must not update A settings (which would wait).
select pg_temp.race_assert(exists(select 1 from vb_private.watch_due_configurations() where engagement_id=${lit(c.scopes[0].eid)}),'Committed pre-closure fixture is due in worker snapshot');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
create temporary table race_worker_result on commit drop as select public.vb_watch_run_due() result;
reset role;
select pg_temp.race_assert((select (result->>'completed_clients')::integer=0 from race_worker_result),'No worker activity while fixture is locked');
select pg_temp.race_assert(clock_timestamp()-started<interval '14 seconds','Worker returned promptly') from race_overlap;
select jsonb_build_object('case',6,'a_pid',a_pid,'b_pid',b_pid,'passed',true,'worker_commits',false) as session_b_receipt from race_overlap;
rollback;
`;
  }
 }else if(n===7){
  a+=`select pg_advisory_xact_lock(73772131);
select pg_temp.race_assert(not exists(select 1 from vb_private.watch_due_configurations() where client_id<>${lit(c.cid)} and next_run_at='-infinity'::timestamptz),'Fixture has unique first worker priority');
update vb_private.watch_scope_settings set next_run_at='-infinity' where engagement_id=${lit(c.scopes[0].eid)};
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
create temporary table race_worker_result on commit drop as select public.vb_watch_run_due() result;
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.race_assert((select (result->>'completed_clients')::integer=1 from race_worker_result),'Worker processed exactly one configuration');
select pg_temp.race_assert((select count(*)=1 from vb_private.watch_runs where client_id=${lit(c.cid)}),'Worker selected only fixture A');
select pg_temp.race_assert(exists(select 1 from vb_private.watch_findings where client_id=${lit(c.cid)} and serial='99170301'),'Synthetic source matched fixture');
`;
  b+=`set local role authenticated;\nselect pg_temp.race_actor('staff');\n`+close(c)+'reset role;\n'+bReceipt(n);
 }else{
  a+=`-- Hold the same client lock an old save waited on at cutover; no migration rerun.
select 1 from public.vb_clients where id=${lit(c.cid)} for update;
`;
  b+=`-- Simulate captured old SQL under its original authenticated claims. Elevated
-- SQL role is needed to reach the private-table trigger; no new helper is granted.
select pg_temp.race_actor('a');
select 1 from public.vb_clients where id=${lit(c.cid)} for update;
`+expectError(`update vb_private.watch_settings set version=version+1,enabled=true,next_run_at=now() where client_id=${lit(c.cid)};`,'42501')+bReceipt(n);
 }
 await write(`${String(n+1).padStart(2,'0')}-${c.name}-A.sql`,a+hold);
 await write(`${String(n+1).padStart(2,'0')}-${c.name}-B.sql`,b);
}
// Full migration-versus-old-writer cannot be replayed safely on the installed Test
// database; case 8 checks the frozen writer after a real independent-session wait.
let verify=common;
for(const c of clients)verify+=fixtureGuard(c);
for(const [idx,c]of clients.entries()){
 const a=c.scopes[0],b=c.scopes[1];
 if(idx===0||idx===1)verify+=`select pg_temp.race_assert((select count(*)=1 and max(version)=${idx===0?1:2} from vb_private.watch_scope_settings where engagement_id=${lit(a.eid)}),'${c.name}: exactly one successful save');\n`;
 if(idx===2)verify+=`select pg_temp.race_assert((select sum(cardinality(mark_ids))=7 from vb_private.watch_scope_settings where client_id=${lit(c.cid)}),'Shared cap race retained six A plus original one B');
select pg_temp.race_assert((select version=1 and mark_ids=${arr([b.marks[0]])} from vb_private.watch_scope_settings where engagement_id=${lit(b.eid)}),'Rejected B save is atomic');\n`;
 if([4,5,6,7].includes(c.n))verify+=`select pg_temp.race_assert((select status='closed' from public.vb_engagements where id=${lit(a.eid)}),'${c.name}: A closed');
select pg_temp.race_assert((select not enabled and next_run_at is null from vb_private.watch_scope_settings where engagement_id=${lit(a.eid)}),'${c.name}: closed schedule stopped');
select pg_temp.race_assert((select status='active' from public.vb_engagements where id=${lit(b.eid)}),'${c.name}: B remains active');\n`;
 if(c.n===7)verify+=`select pg_temp.race_assert((select count(*)=1 from vb_private.watch_runs r join public.vb_engagements e on e.id=${lit(a.eid)} where r.client_id=${lit(c.cid)} and r.checked_at<e.closed_at),'Worker run preceded closure');\n`;
 if(c.n===8)verify+=`select pg_temp.race_assert((select version=9 and not enabled and next_run_at is null from vb_private.watch_settings where client_id=${lit(c.cid)}),'Blocked legacy writer left singleton unchanged');\n`;
}
verify+=`select true as final_fixture_assertions_passed;\nrollback;\n`;
await write('10-verify.sql',verify);
const c6=clients[5],s6=c6.scopes[1];
await write('11-companion-worker-rollback.sql',common+fixtureGuard(c6)+`select pg_advisory_xact_lock(73772131);
update vb_private.watch_scope_settings set next_run_at=now()+interval '1 year' where enabled and client_id<>${lit(c6.cid)};
update vb_private.watch_settings set next_run_at=now()+interval '1 year' where enabled;
update vb_private.watch_scope_settings set next_run_at='-infinity' where engagement_id=${lit(s6.eid)};
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
create temporary table race_worker_result on commit drop as select public.vb_watch_run_due() result;
reset role;
select pg_temp.race_assert((select (result->>'completed_clients')::integer=1 from race_worker_result),'Companion still processes after A closure');
select pg_temp.race_assert(exists(select 1 from vb_private.watch_runs r join vb_private.watch_scope_settings s on s.id=r.configuration_id where s.engagement_id=${lit(s6.eid)}),'Run belongs to active companion');
select true as companion_continuation_passed;\nrollback;\n`);
let cleanup=common+`select pg_advisory_xact_lock(73772131);\n`;
for(const c of clients)cleanup+=`select pg_temp.race_assert(pg_try_advisory_xact_lock(73772132,${c.n}),'Session A must finish before cleanup');\n`;
cleanup+=`select 1 from public.vb_clients where id in(${list(allC)}) order by id for update;\n`;
for(const c of clients)cleanup+=fixtureGuard(c);
cleanup+=`-- Only explicitly reserved disposable IDs. Preserve all existing accounts.
delete from vb_private.watch_review_history where finding_id in(select id from vb_private.watch_findings where client_id in(${list(allC)}));
delete from vb_private.watch_findings where client_id in(${list(allC)});
delete from vb_private.watch_runs where client_id in(${list(allC)});
delete from vb_private.watch_scope_settings where client_id in(${list(allC)});
delete from vb_private.watch_settings where client_id in(${list(allC)});
delete from vb_private.legacy_test_record_scopes where client_id in(${list(allC)});
delete from public.vb_marks where id in(${list(allM)}) and client_id in(${list(allC)});
delete from vb_private.portal_service_bindings where client_id in(${list(allC)});
delete from vb_private.legacy_test_mappings where client_id in(${list(allC)});
delete from vb_private.engagement_grants where engagement_id in(${list(allE)});
delete from vb_private.engagement_services where engagement_id in(${list(allE)});
delete from public.vb_matters where engagement_id in(${list(allE)});
delete from public.vb_engagements where id in(${list(allE)}) and client_id in(${list(allC)});
delete from public.vb_service_preferences where client_id in(${list(allC)});
delete from vb_private.audit_events where client_id in(${list(allC)});
delete from public.vb_clients where id in(${list(allC)});
delete from vb_private.watch_applications where serial in('99170301','99170302') and file_id in(select id from vb_private.watch_files where revision=repeat('e',64));
delete from vb_private.watch_files where revision=repeat('e',64) and manifest_revision=repeat('f',64);
delete from vb_private.portal_lifecycle_events where current_data->>'client_id' in(${list(allC)}) or current_data->>'engagement_id' in(${list(allE)}) or (table_name='vb_engagements' and current_data->>'id' in(${list(allE)}));
select pg_temp.race_assert(not exists(select 1 from public.vb_clients where id in(${list(allC)})),'No disposable clients remain');
select pg_temp.race_assert(not exists(select 1 from public.vb_engagements where id in(${list(allE)})),'No disposable engagements remain');
select pg_temp.race_assert(not exists(select 1 from vb_private.watch_files where revision=repeat('e',64)),'Synthetic source files removed');
select true as cleanup_passed;
commit;
`;
await write('12-cleanup.sql',cleanup);
const preserve=await readFile(new URL('../watch-engagement-compatibility/06-preservation.sql',root),'utf8');
await write('00-preservation.sql',preserve.replace("'is_test',",`'scoped_settings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.watch_scope_settings t),
 'watch_review_history',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.watch_review_history t),
 'all_services',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by engagement_id,service)::text,'')) from vb_private.engagement_services t),
 'all_matters',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.vb_matters t),
 'all_mappings',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by client_id)::text,'')) from vb_private.legacy_test_mappings t),
 'source_application_values',(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by serial),'')) from vb_private.watch_applications t),
 'all_marks',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.vb_marks t),
 'service_preferences',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by client_id,service)::text,'')) from public.vb_service_preferences t),
 'client_audit',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.audit_events t),
 'lifecycle_events',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vb_private.portal_lifecycle_events t),
 'is_test',`));
const files=['00-preservation.sql','01-setup.sql',...clients.flatMap(c=>['A','B'].map(s=>`${String(c.n+1).padStart(2,'0')}-${c.name}-${s}.sql`)),'10-verify.sql','11-companion-worker-rollback.sql','12-cleanup.sql'];
const hashes={};for(const f of files)hashes[f]=createHash('sha256').update(await readFile(new URL(f,root))).digest('hex');
await write('manifest.json',JSON.stringify({status:'prepared-local-only-not-executed-in-Test',project:'imvkhicfmidzbzsbhkzs',cases:clients,files:hashes},null,2)+'\n');
console.log(`Prepared ${files.length} SQL files locally; no database connection or execution.`);
