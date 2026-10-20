import {createDiagnostics} from '../shared/diagnostics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {nextStep,validConfiguration} from '../auth/flow.mjs';
import {pendingInvitation,invitationDestination} from '../auth/invitation-route.mjs';
import {memberAccountsEnabled,workspaceFor} from '../auth/member-account.mjs';
const source=(await readFile(new URL('../auth/auth.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'').replace(/initialize\(\);\s*$/,'await initialize();');
async function run({hash='',search='',session=true,fail='',configured=true,waitForSession}={}){
 const nodes=new Map(),storage=new Map(),events=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:id,value:'',dataset:{},hidden:false,addEventListener(){},setAttribute(){},removeAttribute(){},replaceChildren(){},add(){}});return nodes.get(id)};
 const config={environment:'bcm-test',memberAccountsEnabled:true,url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_example'};
 const db={auth:{async getSession(){events.push('consume');if(waitForSession)await waitForSession;if(fail==='session')return {error:Error('synthetic')};return {data:{session:session?{}:null}}},async getUser(){if(fail==='identity')throw Error('synthetic');return {data:{user:{id:'synthetic'}}}},mfa:{async getAuthenticatorAssuranceLevel(){return {data:{currentLevel:'aal1',nextLevel:'aal1'}}}},onAuthStateChange(){},async signOut(){return {}}}};
 const context={createDiagnostics,document:{body:{dataset:{audience:'client'}},getElementById:node,querySelectorAll:()=>[]},window:{VB_AUTH_CONFIG:configured?config:{},supabase:{createClient(){events.push('sdk');return db}}},location:{hash,search,hostname:'127.0.0.1',pathname:'/login.html',replace:route=>events.push('route:'+route)},history:{replaceState(_a,_b,path){events.push('clean:'+path)}},sessionStorage:{setItem:(key,value)=>storage.set(key,value),getItem:key=>storage.get(key)},URLSearchParams,nextStep,validConfiguration,pendingInvitation,invitationDestination,memberAccountsEnabled,workspaceFor,verifiedEntry:async()=>{if(fail==='entry')throw Error('synthetic');return {entry:'member'}},requireAccess:async()=>{},showFlowLoading:()=>()=>{},setTimeout};
 const work=vm.runInNewContext('(async()=>{'+source+'})()',context);return {work,nodes,events,storage};
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
