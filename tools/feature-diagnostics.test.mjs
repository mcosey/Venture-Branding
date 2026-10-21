import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticRequest,isDiagnosticError} from '../shared/diagnostics.mjs';
import {createWatchRepository} from '../auth/watch.mjs';
import {createEvidenceRepository} from '../auth/evidence.mjs';
import {createEngagementAdmin} from '../auth/engagement-admin.mjs';
import {loadAiWorkspace,runAiResearch,reviewAiFinding,setAiMonitoring} from '../auth/bcm-ai.mjs';
import {loadReviewedMap} from '../portal/assets/brand-map-reviewed.mjs';

const privateText='PRIVATE company@example.test Bearer secret https://private.example/legal image/path';
const id='10000000-0000-4000-8000-000000000001',reference='VB-'+id;
const testConfig={environment:'bcm-test',memberAccountsEnabled:true,url:'https://imvkhicfmidzbzsbhkzs.supabase.co'};
const production='https://omvkwiosonatswocbdgx.supabase.co';
const values={client_id:id,engagement_title:privateText,matter_title:privateText,recipient_email:'person@example.test'};
const file=new Blob(['private image'],{type:'image/png'});file.name='private.png';
const details={kind:'photo',capturedOn:'2020-01-01',notes:privateText};
const watchState={settings:{version:7}};
function capture(){const events=[];return {events,diagnostics:{sink:event=>events.push(event),makeReference:()=>id,clock:()=>0}};}
function fixture(role='client'){
 const state={reply:()=>({data:{}}),query:()=>({data:[]}),calls:[],role,aal:role==='staff'?'aal2':'aal1'};
 const call=(name,args)=>{state.calls.push({name,args});return state.reply(name,args);};
 const db={supabaseUrl:production,auth:{getUser:async()=>({data:{user:{id:privateText}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:state.aal,nextLevel:role==='staff'?'aal2':'aal1'}})}},
  rpc:async(name,args)=>name==='vb_session_role'?{data:state.role}:call(name,args),
  functions:{invoke:async(name,args)=>call(name,args)},storage:{from:()=>({download:async path=>call('download',path)})},
  from(table){return {select(){return this},eq(){return this},is(){return this},not(){return this},order(){return this},limit(){return this},maybeSingle(){return this},then(resolve,reject){return Promise.resolve().then(()=>{state.calls.push({name:table});return state.query(table);}).then(resolve,reject);}}}
 };
 return {db,state};
}
function failure(mode,code='40001'){return ()=>{if(mode==='thrown')throw Object.assign(Error(privateText),{supportReference:reference});return {error:{code,message:privateText,details:privateText}};};}
async function safeFailure(work,f,feature,stage){
 await assert.rejects(work,error=>isDiagnosticError(error)&&error.message.includes(reference)&&!error.message.includes('PRIVATE'));
 assert.equal(f.events.length,1);assert.equal(f.events[0].feature,feature);assert.equal(f.events[0].stage,stage);
 assert(!JSON.stringify(f.events).includes('PRIVATE'));
 assert.deepEqual(Object.keys(f.events[0]).sort(),['schema','release','feature','stage','outcome','category','reference','elapsed_ms'].sort());
}
function productionBrowser(){globalThis.window={VB_AUTH_CONFIG:{environment:'bcm-production',bcmEnabled:true}};}

for(const mode of ['returned','thrown']){
 test(`Watch ${mode} failures identify the operation without mark IDs, notes or configuration data`,async()=>{
  for(const stage of ['snapshot_load','configuration_save','review']){
   const f=capture(),{db,state}=fixture('staff'),repo=createWatchRepository(db,'staff',{enabled:true,diagnostics:f.diagnostics});state.reply=failure(mode);
   await safeFailure(({snapshot_load:()=>repo.load(privateText),configuration_save:()=>repo.save(privateText,watchState,[privateText],true),review:()=>repo.review(privateText,{id:privateText,version:7},'publish',privateText,privateText)})[stage](),f,'watch',stage);
   assert.equal(state.calls.length,1);
  }
 });
 test(`Evidence ${mode} failures exclude images, upload metadata and private paths`,async()=>{
  for(const stage of ['list','upload','remove','image']){
   const f=capture(),{db,state}=fixture(),repo=createEvidenceRepository(db,'client',{enabled:true,diagnostics:f.diagnostics});state.reply=state.query=failure(mode);
   await safeFailure(({list:()=>repo.list(privateText,privateText),upload:()=>repo.upload(privateText,privateText,file,details,privateText),remove:()=>repo.remove(privateText,privateText),image:()=>repo.image({object_path:privateText})})[stage](),f,'evidence',stage);
   assert.equal(state.calls.length,1);
  }
 });
 test(`Engagement ${mode} failures preserve single-attempt saves and recipient boundaries`,async()=>{
  for(const stage of ['drafts_load','draft_save','close','revoke','send']){
   const f=capture(),{db,state}=fixture('staff'),repo=createEngagementAdmin(db,testConfig,'127.0.0.1',{diagnostics:f.diagnostics});state.reply=failure(mode);
   await safeFailure(({drafts_load:()=>repo.read(),draft_save:()=>repo.save(id,7,values),close:()=>repo.close(id,'active'),revoke:()=>repo.revoke(id),send:()=>repo.send(id,7,{contact_email:'person@example.test',updated_at:'version'})})[stage](),f,'engagement',stage);
   assert.equal(state.calls.length,1);
  }
 });
 test(`Research ${mode} failures exclude observations, provider payloads and review notes`,async()=>{
  productionBrowser();
  for(const stage of ['workspace_load','manual_run','review','monitoring_save','reviewed_load']){
   const f=capture(),{db,state}=fixture(stage==='review'?'staff':'client');state.reply=state.query=failure(mode);
   await safeFailure(({workspace_load:()=>loadAiWorkspace(db,'client',id,{diagnostics:f.diagnostics}),manual_run:()=>runAiResearch(db,id,7,{diagnostics:f.diagnostics}),review:()=>reviewAiFinding(db,{id:privateText,revision:7},'publish',privateText,null,{diagnostics:f.diagnostics}),monitoring_save:()=>setAiMonitoring(db,id,7,9,true,{diagnostics:f.diagnostics}),reviewed_load:()=>loadReviewedMap(db,id,{diagnostics:f.diagnostics})})[stage](),f,'research',stage);
   assert.equal(state.calls.length,1);
  }
  // A failure in one dependency of the workspace batch is also diagnosed.
  const f=capture(),{db,state}=fixture();state.query=table=>table==='vb_clients'?{data:[{id}]}:failure(mode)();state.reply=failure(mode);
  await safeFailure(loadAiWorkspace(db,'client',id,{diagnostics:f.diagnostics}),f,'research','workspace_load');
 });
}

test('valid server references survive delivery/upload/research errors without duplicate browser events',async()=>{
 productionBrowser();
 for(const operation of ['upload','send','research'])for(const location of ['data','context']){
  const f=capture(),{db,state}=fixture(operation==='send'?'staff':'client');
  state.reply=()=>location==='data'?{data:{supportReference:reference,error:privateText},error:{message:privateText}}:{error:{context:{json:async()=>({supportReference:reference,error:privateText})}}};
  const work=operation==='upload'?createEvidenceRepository(db,'client',{enabled:true,diagnostics:f.diagnostics}).upload(id,id,file,details,id):operation==='send'?createEngagementAdmin(db,testConfig,'127.0.0.1',{diagnostics:f.diagnostics}).send(id,7,{contact_email:'person@example.test',updated_at:'version'}):runAiResearch(db,id,7,{diagnostics:f.diagnostics});
  await assert.rejects(work,error=>isDiagnosticError(error)&&error.supportReference===reference&&!error.message.includes('PRIVATE'));
  assert.equal(f.events.length,0);assert.equal(state.calls.length,1);
 }
});

test('unsafe references and malformed success bodies become safe local failures',async()=>{
 for(const result of [null,{}, {data:{supportReference:privateText}}, {error:{context:{json:async()=>({supportReference:privateText})}}}]){
  const f=capture();await safeFailure(diagnosticRequest('evidence','upload',async()=>result,{message:'Upload failed.',diagnostics:f.diagnostics,serverReference:true,valid:r=>Boolean(r?.data?.evidence?.uploaded_at)}),f,'evidence','upload');
 }
 productionBrowser();const f=capture(),{db,state}=fixture();state.query=table=>table==='vb_clients'?{data:[{id}]}:null;
 await safeFailure(loadAiWorkspace(db,'client',id,{diagnostics:f.diagnostics}),f,'research','workspace_load');
 assert.equal(f.events[0].category,'invalid_response');
});

test('Watch and evidence discard late errors after clear, including delayed server-reference reads',async()=>{
 for(const feature of ['watch','evidence'])for(const delayedBody of [false,true]){
  const f=capture(),{db,state}=fixture();let release,bodyStarted;
  const started=new Promise(resolve=>bodyStarted=resolve);
  state.reply=()=>delayedBody?{error:{context:{json:()=>{bodyStarted();return new Promise(resolve=>release=resolve);}}}}:new Promise((_resolve,reject)=>{release=reject;bodyStarted();});
  const repo=feature==='watch'?createWatchRepository(db,'client',{enabled:true,diagnostics:f.diagnostics}):createEvidenceRepository(db,'client',{enabled:true,diagnostics:f.diagnostics});
  // Watch has no server-reference body; use its regular deferred RPC path.
  if(feature==='watch'&&delayedBody)continue;
  const work=feature==='watch'?repo.load(id):repo.upload(id,id,file,details,id);
  await started;repo.clear();release(delayedBody?{supportReference:reference}:Error(privateText));
  await assert.rejects(work,/session (has )?ended/);assert.equal(f.events.length,0);assert.equal(state.calls.length,1);
 }
});

test('disabled gates, input validation, stale selections, initial role/MFA denial and SQL validation stay quiet',async()=>{
 productionBrowser();const f=capture(),{db,state}=fixture('staff');
 await assert.rejects(createWatchRepository(db,'staff',{enabled:false,diagnostics:f.diagnostics}).load(id));
 assert.equal(createEvidenceRepository(db,'client',{enabled:false,diagnostics:f.diagnostics}),null);
 await assert.rejects(createEvidenceRepository(db,'client',{enabled:true,diagnostics:f.diagnostics}).upload(id,id,null,details,id));
 const watch=createWatchRepository(db,'staff',{enabled:true,diagnostics:f.diagnostics});assert.throws(()=>watch.save(id,{scoped:true,configurations:[]},[],true,{}));
 const admin=createEngagementAdmin(db,testConfig,'127.0.0.1',{diagnostics:f.diagnostics});await assert.rejects(admin.save(id,7,{}));
 await assert.rejects(createEngagementAdmin(db,testConfig,'example.com',{diagnostics:f.diagnostics}).read());
 state.aal='aal1';await assert.rejects(admin.read());state.aal='aal2';state.role='client';await assert.rejects(admin.read());
 state.reply=()=>({error:{code:'22023',message:privateText}});await assert.rejects(createWatchRepository(db,'client',{enabled:true,diagnostics:f.diagnostics}).load(id));
 await assert.rejects(setAiMonitoring(db,id,0,1,true,{diagnostics:f.diagnostics}));
 assert.equal(f.events.length,0);
});

test('successful saves and loads retain exact inputs, results and post-read access checks without telemetry',async()=>{
 productionBrowser();const f=capture(),{db,state}=fixture('staff');
 const admin=createEngagementAdmin(db,testConfig,'127.0.0.1',{diagnostics:f.diagnostics});state.reply=()=>({data:{id,revision:8}});assert.equal((await admin.save(id,7,values)).revision,8);
 assert.equal(state.calls.at(-1).args.expected_revision,7);
 const watch=createWatchRepository(db,'staff',{enabled:true,diagnostics:f.diagnostics});await watch.save(id,watchState,[privateText],false);
 assert.deepEqual(state.calls.at(-1),{name:'vb_watch_save',args:{target_client:id,expected_version:7,selected_marks:[privateText],monitoring:false}});
 state.role='client';state.query=()=>({data:[{id,client_id:id,mark_id:id},{client_id:'other',mark_id:id}]});
 const evidence=createEvidenceRepository(db,'client',{enabled:true,diagnostics:f.diagnostics});assert.equal((await evidence.list(id,id)).length,1);
 state.reply=()=>({data:{evidence:{uploaded_at:'saved',id}}});assert.equal((await evidence.upload(id,id,file,details,id)).id,id);
 const form=state.calls.at(-1).args.body;assert.equal(form.get('client'),id);assert.equal(JSON.parse(form.get('details')).notes,privateText);
 state.reply=()=>({data:{status:'completed'}});assert.equal((await runAiResearch(db,id,7,{diagnostics:f.diagnostics})).status,'completed');
 state.reply=()=>({data:{client_id:id,enabled:false}});assert.equal((await setAiMonitoring(db,id,7,9,false,{diagnostics:f.diagnostics})).enabled,false);
 state.query=()=>({data:[]});await loadReviewedMap(db,id,{diagnostics:f.diagnostics});
 state.query=()=>{state.role='member';return {data:[]};};await assert.rejects(loadReviewedMap(db,id,{diagnostics:f.diagnostics}),/does not have access/);
 assert.equal(f.events.length,0);
});

test('a failed console sink preserves the original failure and never retries a business operation',async()=>{
 const {db,state}=fixture();state.reply=failure('thrown');
 for(const sink of [()=>{throw Error(privateText)},()=>Promise.reject(Error(privateText))]){
  const diagnostics={sink,makeReference:()=>id};
  await assert.rejects(createWatchRepository(db,'client',{enabled:true,diagnostics}).load(id),error=>error.message.includes(reference)&&!error.message.includes('PRIVATE'));
 }
 await new Promise(setImmediate);assert.equal(state.calls.length,2);
});
