import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {diagnosticRequest,isDiagnosticError,supportMessage} from '../shared/diagnostics.mjs';
const id='10000000-0000-4000-8000-000000000001',reference='VB-'+id;
const privateText='PRIVATE user@example.test Bearer token client details';
const source=readFileSync(new URL('../auth/engagement-invitation.mjs',import.meta.url),'utf8').replace(/^import .+;\n/gm,'').replace(/initialize\(\);\s*$/,'await initialize();');
async function page({read={data:{client_name:'Company',engagement_title:'Engagement',matter_title:'Scope'}},accept={data:{}},entry='member',verifiedFailure=false}={}){
 const nodes=new Map(),events=[],routes=[],calls=[];let cleared=0,loading=0,finished=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,disabled:false,checked:false,listeners:{},addEventListener(type,callback){this.listeners[type]=callback;}});return nodes.get(id);};
 const db={rpc:async(name,args)=>{calls.push({name,args});const result=name==='vb_read_test_engagement_invite'?read:accept;if(result instanceof Error)throw result;return result;}};
 const context={document:{getElementById:node},window:{VB_AUTH_CONFIG:{}},location:{search:'?invitation='+id,hostname:'127.0.0.1',replace:route=>routes.push(route)},sessionStorage:{},memberAccountsEnabled:()=>true,memberClient:()=>db,verifiedEntry:async()=>{if(verifiedFailure)throw Error(privateText);return {entry};},pendingInvitation:()=>id,clearInvitation:()=>cleared++,showFlowLoading:()=>{loading++;return ()=>finished++;},isDiagnosticError,supportMessage,
  diagnosticRequest:(feature,stage,work,options)=>diagnosticRequest(feature,stage,work,{...options,diagnostics:{sink:event=>events.push(event),makeReference:()=>id,clock:()=>0}})};
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 return {nodes,events,routes,calls,node,accept:()=>node('accept-invitation').listeners.click(),get cleared(){return cleared},get loading(){return loading},get finished(){return finished}};
}

test('unavailable, expired and wrong-account invitations share the same quiet message',async()=>{
 const messages=[];
 for(const code of ['22023','42501','40001']){
  const f=await page({read:{error:{code,message:privateText}}});messages.push(f.node('invitation-status').textContent);
  assert.equal(f.events.length,0);assert.equal(f.node('invitation-signin').hidden,false);assert.equal(f.cleared,1);assert.equal(f.loading,f.finished);assert.equal(f.calls.length,1);
 }
 assert.equal(new Set(messages).size,1);assert(!messages[0].includes('PRIVATE'));assert(!messages[0].includes('Reference:'));
});

test('unexpected invitation read and malformed responses get safe references without revealing invitation data',async()=>{
 for(const read of [{error:{code:'XX000',message:privateText}},Error(privateText),{data:null}]){
  const f=await page({read});assert.equal(f.events.length,1);assert.equal(f.events[0].stage,'invitation_load');
  assert(f.node('invitation-status').textContent.includes(reference));assert(!JSON.stringify(f.events).includes('PRIVATE'));assert(!f.node('invitation-status').textContent.includes('PRIVATE'));
  assert.equal(f.node('invitation-details').hidden,true);assert.equal(f.loading,f.finished);
 }
});

test('acceptance needs confirmation, retains the invitation after failure and never retries silently',async()=>{
 for(const accept of [{error:{code:'XX000',message:privateText}},Error(privateText)]){
  const f=await page({accept});await f.accept();assert.equal(f.calls.length,1);
  f.node('invitation-confirm').checked=true;await f.accept();
  assert.equal(f.calls.length,2);assert.equal(f.events.length,1);assert.equal(f.events[0].stage,'invitation_accept');assert.equal(f.cleared,0);assert.equal(f.node('accept-invitation').disabled,false);
  assert(f.node('invitation-status').textContent.includes(reference));assert(!f.node('invitation-status').textContent.includes('PRIVATE'));assert.equal(f.loading,f.finished);assert.deepEqual(f.routes,[]);
 }
});

test('expected stale acceptance and initial identity denial remain quiet',async()=>{
 const f=await page({accept:{error:{code:'40001',message:privateText}}});f.node('invitation-confirm').checked=true;await f.accept();
 assert.equal(f.events.length,0);assert.equal(f.node('accept-invitation').disabled,false);assert(!f.node('invitation-status').textContent.includes('PRIVATE'));
 const denied=await page({verifiedFailure:true});assert.equal(denied.calls.length,0);assert.equal(denied.events.length,0);
});

test('successful acceptance and new-user onboarding keep existing routes and emit no success events',async()=>{
 const f=await page();assert.equal(f.node('invitation-details').hidden,false);f.node('invitation-confirm').checked=true;await f.accept();
 assert.deepEqual(f.routes,['portal.html']);assert.equal(f.cleared,1);assert.equal(f.events.length,0);assert.equal(f.loading,f.finished);
 assert.equal(f.calls[1].name,'vb_accept_test_engagement_invite');assert.deepEqual(JSON.parse(JSON.stringify(f.calls[1].args)),{invitation_id:id,confirmed:true});
 const signup=await page({entry:'onboarding'});assert.deepEqual(signup.routes,['signup.html?invitation='+id]);assert.equal(signup.calls.length,0);assert.equal(signup.events.length,0);
});
