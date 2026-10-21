import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceRepository,loadMaintenancePublications} from '../auth/maintenance.mjs';
import {createDigestRepository} from '../auth/digest.mjs';
import {createDraftStore} from '../attorney/preflight/draft-store.mjs';
import {verifiedEntry,onboardMember,loadMemberCompanies,saveMemberCompany} from '../auth/member-account.mjs';

const privateText='PRIVATE owner company@example.test Bearer credential https://private.example/legal';
const uuid='10000000-0000-4000-8000-000000000001',reference='VB-'+uuid;
const maintenanceInput={description:privateText,windowStart:'2026-10-01',windowEnd:'2027-03-31',deadline:'2027-03-31',nextStep:privateText,status:'Upcoming',source:privateText};
const scope={clientId:privateText,markId:privateText};
const digestInput={categories:['use_history'],frequency:'weekly',delivery:'account'};
function capture(){const events=[];return {events,diagnostics:{sink:event=>events.push(event),makeReference:()=>uuid,clock:()=>0}};}
function database(role='staff'){
 const state={reply:()=>({data:{id:'entry',revision:4,version:7}}),query:()=>({data:[]}),calls:[]};
 const db={auth:{getUser:async()=>({data:{user:{id:privateText}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:role==='staff'?'aal2':'aal1',nextLevel:role==='staff'?'aal2':'aal1'}})}},
  async rpc(name,args){state.calls.push({name,args});return name==='vb_session_role'?{data:role}:state.reply(name,args);},
  from(table){const query={select(){return this},eq(){return this},is(){return this},order(){return this},limit(){return this},maybeSingle(){return this},single(){return this},update(){return this},then(resolve,reject){return Promise.resolve().then(()=>state.query(table)).then(resolve,reject)}};return query;}
 };
 return {db,state};
}
function privateFailure(mode,code='40001'){
 return ()=>{if(mode==='thrown')throw Object.assign(Error(privateText),{supportReference:reference});return {error:{code,message:privateText,details:privateText,hint:privateText}};};
}
async function safeRejection(work,capture,feature,stage,code){
 await assert.rejects(work,error=>error.message.includes(reference)&&!error.message.includes('PRIVATE')&&(!code||error.code===code));
 assert.equal(capture.events.length,1);assert.equal(capture.events[0].feature,feature);assert.equal(capture.events[0].stage,stage);
 assert(!JSON.stringify(capture.events).includes('PRIVATE'));assert(!JSON.stringify(capture.events).includes('company@example'));
 assert(Object.keys(capture.events[0]).every(key=>['schema','release','feature','stage','outcome','category','reference','elapsed_ms','http_status'].includes(key)));
}

for(const mode of ['returned','thrown'])test(`Maintenance ${mode} failures use fixed operations and exclude dates, notes and identity`,async()=>{
 for(const stage of ['drafts_load','draft_save','publish','withdraw']){
  const f=capture(),{db,state}=database(),repo=createMaintenanceRepository(db,{enabled:true,diagnostics:f.diagnostics});
  state.reply=()=>({data:[{id:'entry',version:7}]});await repo.list(scope);state.reply=privateFailure(mode);
  const action={drafts_load:()=>repo.list(scope),draft_save:()=>repo.save(scope,'entry',maintenanceInput),publish:()=>repo.publish(scope,'entry',true),withdraw:()=>repo.withdraw(scope,'entry')}[stage];
  await safeRejection(action(),f,'maintenance',stage);
 }
 const f=capture(),{db,state}=database('client');state.query=privateFailure(mode);
 await safeRejection(loadMaintenancePublications(db,privateText,{enabled:true,diagnostics:f.diagnostics}),f,'maintenance','publications_load');
});

for(const mode of ['returned','thrown'])test(`Inbox/digest ${mode} failures never log recipients or message contents`,async()=>{
 for(const stage of ['preferences_load','preferences_save','sample','inbox_load','message_open']){
  const f=capture(),{db,state}=database('client'),repo=createDigestRepository(db,{enabled:true,diagnostics:f.diagnostics});state.reply=state.query=privateFailure(mode);
  const action={preferences_load:()=>repo.preferences(privateText),preferences_save:()=>repo.save(privateText,7,digestInput),sample:()=>repo.sample(privateText,7),inbox_load:()=>repo.inbox(privateText),message_open:()=>repo.open(privateText,privateText)}[stage];
  await safeRejection(action(),f,'digest',stage);
 }
});

for(const mode of ['returned','thrown'])test(`Filing ${mode} failures preserve revision state and exclude application/review contents`,async()=>{
 for(const stage of ['list','load','history','revisions','save','review']){
  const f=capture(),{db,state}=database(),store=createDraftStore(db,privateText,privateText,{diagnostics:f.diagnostics});await store.save({owner:privateText});
  state.reply=state.query=privateFailure(mode,'PT409');
  const action={list:()=>store.list(),load:()=>store.load('draft'),history:()=>store.history(),revisions:()=>store.revisions(),save:()=>store.save({owner:privateText}),review:()=>store.review('resolution',{reason:privateText})}[stage];
  await safeRejection(action(),f,'filing',stage,mode==='returned'?'PT409':null);
  state.reply=()=>({data:{id:'review'}});await store.review('check',{});
  assert.equal(state.calls.at(-1).args.expected_revision,4);
 }
});

for(const mode of ['returned','thrown'])test(`Member ${mode} failures exclude private profile and planning data`,async()=>{
 for(const stage of ['entry','onboarding','profile_load','profile_save']){
  const f=capture(),{db,state}=database('client');state.reply=state.query=privateFailure(mode);
  const action={entry:()=>verifiedEntry(db,{diagnostics:f.diagnostics}),onboarding:()=>onboardMember(db,{full_name:privateText,name:privateText},{diagnostics:f.diagnostics}),profile_load:()=>loadMemberCompanies(db,{diagnostics:f.diagnostics}),profile_save:()=>saveMemberCompany(db,privateText,{name:privateText},{diagnostics:f.diagnostics})}[stage];
  await safeRejection(action(),f,'member',stage);
 }
});

test('ordinary validation, disabled features and initial role denial do not create activity diagnostics',async()=>{
 const f=capture(),{db,state}=database('client');
 assert.equal(createDigestRepository(db,{enabled:false,diagnostics:f.diagnostics}),null);
 assert.equal(createMaintenanceRepository(db,{enabled:false,diagnostics:f.diagnostics}),null);
 const denied=createMaintenanceRepository(db,{enabled:true,diagnostics:f.diagnostics});await assert.rejects(denied.list(scope));
 const digest=createDigestRepository(db,{enabled:true,diagnostics:f.diagnostics});assert.throws(()=>digest.save(privateText,0,{...digestInput,categories:[]}));
 state.reply=()=>({error:{code:'22023',message:privateText}});await assert.rejects(digest.save(privateText,0,digestInput));
 await assert.rejects(onboardMember(db,{name:privateText},{diagnostics:f.diagnostics}));
 const filing=createDraftStore(db,privateText,privateText,{diagnostics:f.diagnostics});await assert.rejects(filing.save({owner:privateText}));
 state.reply=()=>({data:'denied'});await assert.rejects(verifiedEntry(db,{diagnostics:f.diagnostics}));
 assert.equal(f.events.length,0);
});

test('an ended Maintenance or inbox session discards late errors without logging or retrying',async()=>{
 for(const feature of ['maintenance','digest']){
  const f=capture(),{db,state}=database(feature==='maintenance'?'staff':'client');let reject;
  state.reply=()=>new Promise((_resolve,no)=>reject=no);
  const repo=feature==='maintenance'?createMaintenanceRepository(db,{enabled:true,diagnostics:f.diagnostics}):createDigestRepository(db,{enabled:true,diagnostics:f.diagnostics});
  const work=feature==='maintenance'?repo.list(scope):repo.sample(privateText,1);
  await new Promise(setImmediate);repo.clear();reject(Error(privateText));await assert.rejects(work,/session has ended/);
  assert.equal(f.events.length,0);assert.equal(state.calls.filter(call=>call.name!=='vb_session_role').length,1);
 }
});

test('successful operations keep their existing business results and emit no new success history',async()=>{
 const f=capture(),{db,state}=database('client');
 state.reply=name=>({data:name==='vb_portal_entry'?'member':{id:'message',client_id:privateText}});state.query=()=>({data:[]});
 await verifiedEntry(db,{diagnostics:f.diagnostics});await onboardMember(db,{name:privateText},{diagnostics:f.diagnostics});await loadMemberCompanies(db,{diagnostics:f.diagnostics});
 state.query=()=>({data:{id:'company'}});await saveMemberCompany(db,privateText,{name:privateText},{diagnostics:f.diagnostics});
 const digest=createDigestRepository(db,{enabled:true,diagnostics:f.diagnostics});await digest.save(privateText,0,digestInput);await digest.open(privateText,'message');
 const filing=createDraftStore(db,privateText,privateText,{diagnostics:f.diagnostics});await filing.save({owner:privateText});
 assert.equal(f.events.length,0);
});

test('a failed diagnostic sink cannot change a rejected save or expose its upstream exception',async()=>{
 const {db,state}=database('client');state.query=privateFailure('thrown');
 for(const sink of [()=>{throw Error(privateText)},()=>Promise.reject(Error(privateText))]){
  await assert.rejects(saveMemberCompany(db,privateText,{name:privateText},{diagnostics:{sink,makeReference:()=>uuid}}),error=>error.message.includes(reference)&&!error.message.includes('PRIVATE'));
 }
 await new Promise(setImmediate);
});
