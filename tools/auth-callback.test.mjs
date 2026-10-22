import {createDiagnostics,isDiagnosticError} from '../shared/diagnostics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {nextStep,validConfiguration} from '../auth/flow.mjs';
import {pendingInvitation,invitationDestination} from '../auth/invitation-route.mjs';
import {memberAccountsEnabled,workspaceFor} from '../auth/member-account.mjs';
const source=(await readFile(new URL('../auth/auth.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'').replace(/initialize\(\);\s*$/,'await initialize();');
async function run({hash='',search='',session=true,fail='',configured=true,sdkAvailable=true,waitForSession}={}){
 const nodes=new Map(),storage=new Map(),events=[],diagnosticEvents=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:id,value:'',dataset:{},hidden:false,disabled:id==='auth-controls',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){},removeAttribute(){},replaceChildren(){},add(){}});return nodes.get(id)};
 const config={environment:'bcm-test',memberAccountsEnabled:true,url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_example'};
 const db={auth:{async getSession(){events.push('consume');if(waitForSession)await waitForSession;if(fail==='session')return {error:Error('synthetic')};return {data:{session:session?{}:null}}},async getUser(){if(fail==='identity')throw Error('synthetic');return {data:{user:{id:'synthetic'}}}},mfa:{async getAuthenticatorAssuranceLevel(){return {data:{currentLevel:'aal1',nextLevel:'aal1'}}}},onAuthStateChange(){},async signOut(){return {}},async signInWithPassword(){events.push('signin-request');return {error:{}};},async resetPasswordForEmail(){events.push('recovery-request');return {};}}};
 const diagnostic=feature=>createDiagnostics(feature,{sink:event=>diagnosticEvents.push(event)});
 const context={createDiagnostics:diagnostic,isDiagnosticError,document:{body:{dataset:{audience:'client'}},getElementById:node,querySelectorAll:()=>[]},window:{VB_AUTH_CONFIG:configured?config:{},supabase:sdkAvailable?{createClient(){events.push('sdk');if(fail==='sdk')throw Error('synthetic SDK failure');return db}}:null},location:{hash,search,hostname:'127.0.0.1',origin:'http://127.0.0.1:8893',pathname:'/login.html',replace:route=>events.push('route:'+route)},history:{replaceState(_a,_b,path){events.push('clean:'+path)}},sessionStorage:{setItem:(key,value)=>storage.set(key,value),getItem:key=>storage.get(key)},URLSearchParams,nextStep,validConfiguration,pendingInvitation,invitationDestination,memberAccountsEnabled,workspaceFor,verifiedEntry:async()=>{if(fail==='entry')throw Error('synthetic');if(fail==='entry-diagnostic')throw diagnostic('member').error('entry','Account setup unavailable. Please try again.');return {entry:'member'}},requireAccess:async()=>{},showFlowLoading:()=>()=>{},setTimeout};
 node('auth-controls');node('auth-unavailable');
 const work=vm.runInNewContext('(async()=>{'+source+'})()',context);return {work,node,nodes,events,storage,diagnosticEvents};
}
test('valid callbacks are consumed before cleanup and retain invitation continuity',async()=>{
 const invitation='10000000-0000-0000-0000-000000000001';let release;const wait=new Promise(r=>release=r);
 const f=await run({hash:'#access_token=SYNTHETIC&type=signup',search:'?invitation='+invitation,waitForSession:wait});
 assert.deepEqual(f.events,['sdk','consume']);release();await f.work;
 assert(f.events.includes('route:invitation.html?invitation='+invitation));assert.equal(f.events.at(-1),'clean:/login.html');assert([...f.storage.values()].includes(invitation));
});
test('initialization, identity and access failures all clean the callback and allow retry',async()=>{
 for(const fail of ['session','identity','entry']){const f=await run({fail,hash:'#error=access_denied&error_description=SYNTHETIC'});await f.work;assert.equal(f.events.at(-1),'clean:/login.html');assert.equal(f.nodes.get('signin').hidden,false);assert.match(f.nodes.get('message').textContent,/try again/);}
});
test('expired returns are cleaned and explain that a new link is needed',async()=>{
 const f=await run({session:false,hash:'#error=access_denied'});await f.work;assert.equal(f.events.at(-1),'clean:/login.html');assert.match(f.nodes.get('message').textContent,/expired/);
});
test('recovery callbacks retain password setup after URL cleanup',async()=>{
 const f=await run({hash:'#access_token=SYNTHETIC&type=recovery'});await f.work;assert.equal(f.nodes.get('set-password').hidden,false);assert.equal(f.events.at(-1),'clean:/login.html');assert(!f.events.some(x=>x.startsWith('route:')));
});
test('unavailable SDK configuration cleans unusable callback state without creating a client',async()=>{
 const f=await run({configured:false,hash:'#error=synthetic'});await f.work;assert.deepEqual(f.events,['clean:/login.html']);assert.match(f.nodes.get('message').textContent,/setup is not available/);
});

test('an already diagnosed Member failure keeps one reference rather than adding a second Auth event',async()=>{
 const f=await run({fail:'entry-diagnostic',hash:'#access_token=SYNTHETIC'});await f.work;
 assert.equal(f.diagnosticEvents.length,1);assert.equal(f.diagnosticEvents[0].feature,'member');
 assert(f.nodes.get('message').textContent.includes(f.diagnosticEvents[0].reference));
 assert.equal(f.events.at(-1),'clean:/login.html');
});

test('both static sign-in pages prevent GET fallback and keep every account form disabled without scripts',async()=>{
 for(const page of ['login.html','attorney-login.html']){
  const html=await readFile(new URL('../'+page,import.meta.url),'utf8');
  const locked=html.match(/<fieldset\b([^>]*)>([\s\S]*?)<\/fieldset>/i);
  assert(locked,page);assert.match(locked[1],/\bid="auth-controls"/);assert.match(locked[1],/\bdisabled(?:\s|$)/);
  // A first legend is exempt from disabled fieldset behavior; credentials must
  // never be placed there. No script runs in this static-failure check.
  assert(!/<legend\b/i.test(locked[2]),page);
  const forms=[...html.matchAll(/<form\b([^>]*)>/gi)];assert.equal(forms.length,4,page);
  assert.equal([...locked[2].matchAll(/<form\b/gi)].length,forms.length,page);
  for(const [,attributes]of forms){assert.match(attributes,/\bmethod="post"/i);assert(!/\bformmethod=/i.test(attributes));}
  assert(!/\bformmethod=/i.test(html),page);
  for(const id of ['email','password','recovery-email','new-password','confirm-password','current-password','password-nonce','code']){
   assert(locked[2].includes('id="'+id+'"'),page+': '+id);
  }
  const fallback=html.match(/<p\b[^>]*id="auth-unavailable"([^>]*)>([^<]+)<\/p>/);
  assert(fallback,page);assert(!/\bhidden\b/.test(fallback[1]));assert.match(fallback[2],/reload this page or contact Venture Branding/);
 }
});

test('startup cannot unlock credential controls before handlers and Auth initialization finish',async()=>{
 let release;const wait=new Promise(resolve=>release=resolve);
 const f=await run({session:false,waitForSession:wait});
 assert.equal(f.nodes.get('auth-controls').disabled,true);
 for(const id of ['signin','recovery','set-password','verify'])assert.equal(typeof f.nodes.get(id).listeners.submit,'function');
 release();await f.work;
 assert.equal(f.nodes.get('auth-controls').disabled,false);assert.equal(f.nodes.get('auth-unavailable').hidden,true);
});

test('missing library, bad configuration and constructor failure leave controls locked with reload guidance',async()=>{
 for(const options of [{configured:false},{sdkAvailable:false},{fail:'sdk'}]){
  const f=await run({...options,hash:'#error=synthetic'});
  if(options.fail)await assert.rejects(f.work,/synthetic SDK failure/);else await f.work;
  assert.equal(f.nodes.get('auth-controls').disabled,true);
  assert.equal(f.nodes.get('auth-unavailable').hidden,false);
  assert.equal(f.events.at(-1),'clean:/login.html');
  assert(!f.events.includes('signin-request'));
 }
});

test('recoverable initial session or access errors permit retry only with submit interception attached',async()=>{
 for(const fail of ['session','identity','entry']){
  const f=await run({fail});await f.work;
  assert.equal(f.nodes.get('auth-controls').disabled,false);
  assert.equal(f.nodes.get('signin').hidden,false);
  assert.equal(typeof f.nodes.get('signin').listeners.submit,'function');
 }
});

test('ready sign-in and recovery submissions prevent native navigation before making Auth calls',async()=>{
 const f=await run({session:false});await f.work;
 f.node('email').value='fixture@example.test';f.node('password').value='Synthetic-only-password';
 let prevented=0;
 f.nodes.get('signin').listeners.submit({preventDefault(){prevented++;}});
 assert.equal(prevented,1);await new Promise(setImmediate);
 assert(f.events.includes('signin-request'));assert.equal(f.nodes.get('password').value,'');
 f.node('recovery-email').value='fixture@example.test';
 f.nodes.get('recovery').listeners.submit({preventDefault(){prevented++;}});
 assert.equal(prevented,2);await new Promise(setImmediate);
 assert(f.events.includes('recovery-request'));
});
