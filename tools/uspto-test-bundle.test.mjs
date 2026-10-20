import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const bundle=execFileSync(process.execPath,[fileURLToPath(new URL('./bundle-uspto-dashboard.mjs',import.meta.url)),'--test'],{encoding:'utf8'});
assert.equal(bundle,readFileSync(new URL('../supabase/proposals/diagnostics/uspto-lookup-test.ts',import.meta.url),'utf8'),'New local diagnostic artifact must match the maintained modules and Test entrypoint; the previously deployed parity artifact stays frozen');
const frozen=readFileSync(new URL('../supabase/proposals/test-feature-parity/worker-dashboard-test.ts',import.meta.url));
const installedManifest=JSON.parse(readFileSync(new URL('../supabase/proposals/test-feature-parity/prepared-manifest.json',import.meta.url),'utf8'));
assert.equal(createHash('sha256').update(frozen).digest('hex'),installedManifest.worker_deployment.artifact_sha256,'Keep the exact previously deployed artifact as historical evidence');
// Exercise the emitted entrypoint/handler. Only vendor imports are substituted;
// XML parsing has its own real-parser tests in uspto.test.mjs. No network/Auth.
const runnable=bundle.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const project='https://imvkhicfmidzbzsbhkzs.supabase.co';
const origin='http://127.0.0.1:8893';
const details={action:'preview',serial:'01234567',clientId:'10000000-0000-0000-0000-000000000001'};
function start({url=project,role='staff',validUser=true,extraEnv={}}={}){
 let handler;const state={clients:0,network:0,reads:[],rpc:[]};
 const env={SUPABASE_URL:url,SUPABASE_ANON_KEY:'synthetic-publishable-key',VB_ALLOWED_ORIGINS:'https://unapproved.example',...extraEnv};
 const createClient=(target,key,options)=>{
  state.clients++;assert.equal(target,project);assert.equal(key,'synthetic-publishable-key');assert.equal(options.global.headers.Authorization,'Bearer synthetic-user');
  return {auth:{getUser:async()=>({data:{user:validUser?{id:'synthetic-user'}:null}})},
   rpc:async name=>{state.rpc.push(name);return {data:role};},
   from:()=>({select(){return this;},eq(){return this;},is(){return this;},single:async()=>({data:{id:details.clientId}})})};
 };
 vm.runInNewContext(runnable,{createClient,XMLParser:class{},XMLValidator:{},Request,Response,TextEncoder,TextDecoder,crypto,AbortSignal,
  fetch:()=>{state.network++;throw Error('Network forbidden in Test bundle checks');},
  Deno:{env:{get:key=>{state.reads.push(key);return env[key];}},serve:fn=>{handler=fn;}}});
 assert.equal(typeof handler,'function');return {handler,state};
}
function request({from=origin,auth=true,method='POST'}={}){
 return new Request('https://worker.example.test',{method,headers:{Origin:from,...(auth?{Authorization:'Bearer synthetic-user'}:{})},...(method==='POST'?{body:JSON.stringify(details)}:{})});
}
test('emitted Test bundle refuses Production and missing project configuration',()=>{
 for(const url of ['https://omvkwiosonatswocbdgx.supabase.co','https://other.example',''])assert.throws(()=>start({url}),/BCM Test project required/);
});
test('emitted Test bundle rejects other origins before identity or provider calls',async()=>{
 const h=start();for(const from of ['http://127.0.0.1:8000','http://localhost:8893','https://unapproved.example'])assert.equal((await h.handler(request({from}))).status,403);
 assert.equal(h.state.clients,0);assert.equal(h.state.network,0);
});
test('allowed Test preflight advertises only its loopback origin',async()=>{
 const h=start(),response=await h.handler(request({method:'OPTIONS',auth:false}));assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(h.state.clients,0);assert.equal(h.state.network,0);
});
test('signed-out and invalid identities cannot reach provider or save',async()=>{
 const signedOut=start();assert.equal((await signedOut.handler(request({auth:false}))).status,401);assert.equal(signedOut.state.clients,0);
 const invalid=start({validUser:false});assert.equal((await invalid.handler(request())).status,401);assert.deepEqual(invalid.state.rpc,[]);assert.equal(invalid.state.network,0);
});
test('Client and denied roles cannot reach provider or import functions',async()=>{
 for(const role of ['client','member','denied']){const h=start({role});assert.equal((await h.handler(request())).status,403);assert.deepEqual(h.state.rpc,['vb_session_role']);assert.equal(h.state.network,0);assert.equal(h.state.reads.includes('USPTO_API_KEY'),false);}
});
test('authorized caller without provider setup gets a safe error, never an admin client',async()=>{
 const h=start(),response=await h.handler(request());assert.equal(response.status,503);assert.match((await response.json()).error,/not configured/);assert.equal(h.state.network,0);assert.equal(h.state.reads.includes('SUPABASE_SERVICE_ROLE_KEY'),false);assert.deepEqual(h.state.rpc,['vb_session_role']);
});
