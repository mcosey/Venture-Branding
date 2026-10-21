import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnostics,databaseCategory,isDiagnosticError,supportMessage} from '../shared/diagnostics.mjs';
import {saveContact} from '../auth/account.mjs';
import {loadRecords} from '../auth/connection.mjs';
import {completePendingSignup,SIGNUP_NOTICE} from '../auth/member-account.mjs';
import {createAccountProgressStore} from '../free/assets/llk-progress-store.mjs';
import {emptyProgress} from '../free/assets/llk-data.mjs';
const uuid='10000000-0000-4000-8000-000000000001',reference='VB-'+uuid;
const privateText='PRIVATE password=secret Bearer token email@example.test https://private.example/notes';
function capture(){const events=[];let now=100;return {events,options:{sink:event=>events.push(event),clock:()=>now+=7,makeReference:()=>uuid}};}
test('only allowlisted fields enter an immutable bounded diagnostic event',()=>{
 const f=capture(),d=createDiagnostics('uspto',f.options);
 assert.equal(d.failure('fetch','unavailable',503),reference);
 assert.deepEqual(f.events,[{schema:1,release:'2026-10-21-diagnostics-3',feature:'uspto',stage:'fetch',outcome:'failure',category:'unavailable',reference,elapsed_ms:7,http_status:503}]);
 assert(Object.isFrozen(f.events[0]));
 d.failure(privateText,'unavailable',503);d.failure('fetch',privateText,503);
 assert.equal(f.events.length,1);
 for(let i=0;i<100;i++)d.failure('save','conflict',409);
 assert.equal(f.events.length,2);assert(!JSON.stringify(f.events).includes('PRIVATE'));
});
test('untrusted reference, status and clock values are discarded, without coercion',()=>{
 const events=[],d=createDiagnostics('account',{sink:e=>events.push(e),makeReference:()=>privateText,clock:()=>Infinity});
 assert.equal(d.failure('contact_save','unavailable',privateText),null);
 assert.equal(events[0].reference,null);assert.equal(events[0].elapsed_ms,0);assert(!('http_status'in events[0]));
 assert.equal(supportMessage('Retry.',privateText),'Retry.');assert.match(supportMessage('Retry.',reference),/Reference: VB-/);
 assert.throws(()=>createDiagnostics('__proto__'));
});
test('failed synchronous and asynchronous sinks cannot change an operation result',async()=>{
 for(const sink of [()=>{throw Error(privateText);},()=>Promise.reject(Error(privateText))]){
  const d=createDiagnostics('account',{sink,makeReference:()=>uuid,clock:()=>{throw Error(privateText);}});
  assert.equal(d.failure('contact_save','unavailable'),reference);
  const e=d.error('contact_save','Retry.');assert(isDiagnosticError(e));assert(!isDiagnosticError(Object.assign(Error(privateText),{supportReference:reference})));
  await new Promise(resolve=>setImmediate(resolve));
 }
 assert.deepEqual(['40001','23505','42501',privateText].map(databaseCategory),['conflict','conflict','permission','unavailable']);
});
function clientDb(rpc){return {auth:{getUser:async()=>({data:{user:{email:privateText}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})}},rpc:async(name,args)=>name==='vb_session_role'?{data:'client'}:rpc(name,args)};}
test('contact failure categorizes SQL conflict without recording or exposing contact data',async()=>{
 const f=capture(),db=clientDb(async()=>({error:{code:'40001',message:privateText,details:privateText}}));
 await assert.rejects(saveContact(db,{id:privateText},privateText,'person@example.test',{diagnostics:f.options}),e=>e.message.includes('changed elsewhere')&&e.supportReference===reference&&!e.message.includes('PRIVATE'));
 assert.equal(f.events.length,1);assert.equal(f.events[0].category,'conflict');assert(!JSON.stringify(f.events).includes('PRIVATE'));
});
test('transport errors cannot spoof a safe contact error; successful contact saves log nothing',async()=>{
 const f=capture();
 await assert.rejects(saveContact(clientDb(async()=>{throw Object.assign(Error(privateText),{supportReference:reference});}),{id:'client'},'Name','',{diagnostics:f.options}),e=>!e.message.includes('PRIVATE'));
 const good=capture(),value={contact_name:'Name'};
 assert.equal(await saveContact(clientDb(async()=>({data:value})),{id:'client'},'Name','',{diagnostics:good.options}),value);assert.equal(good.events.length,0);
});
test('record-load errors identify the failed dependency without rows, names or query strings',async()=>{
 const f=capture(),db=clientDb(async()=>({}));
 db.from=table=>({select(){return this},is(){return this},order(){return this},range:async()=>table==='vb_marks'?{error:{message:privateText}}:{data:[],count:0}});
 await assert.rejects(loadRecords(db,'client',{diagnostics:f.options}),e=>e.message.includes(reference)&&!e.message.includes('PRIVATE'));
 assert.equal(f.events.length,1);assert.equal(f.events[0].stage,'marks');assert(!JSON.stringify(f.events).includes('PRIVATE'));
});
test('onboarding diagnostics exclude the profile, raw signup draft and account identity',async()=>{
 const f=capture(),db={rpc:async()=>({error:{message:privateText}})};
 const raw=JSON.stringify({notice:SIGNUP_NOTICE,email:'person@example.test',profile:{full_name:privateText,name:'Company'}});
 await assert.rejects(completePendingSignup(db,{email:'person@example.test'},raw,{diagnostics:f.options}),e=>e.message.includes(reference)&&!e.message.includes('PRIVATE'));
 assert.equal(f.events[0].stage,'onboarding');assert(!JSON.stringify(f.events).includes('PRIVATE'));
});
test('private Kit notes stay pending after failed save and never enter diagnostics',async()=>{
 const f=capture(),db={rpc:async name=>name==='vb_account_access'?{data:'member'}:{error:{code:'40001',message:privateText}},from:()=>({select:()=>({eq:async()=>({data:[]})})})};
 const store=createAccountProgressStore({db,companyId:privateText,delay:10000,diagnostics:f.options});
 const progress=await store.load();progress.notes.entity=privateText;store.queue('entity',progress);
 assert.equal(await store.flush(),false);assert.equal(store.state,'conflict');assert.equal(store.hasPending,true);
 assert.equal(f.events[0].stage,'progress_save');assert(!JSON.stringify(f.events).includes('PRIVATE'));
});
