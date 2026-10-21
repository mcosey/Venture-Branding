import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {createAiBcmHandler,PRODUCTION_URL} from '../supabase/functions/bcm-ai-production/handler.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sdk="import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n";
const sharedImport="import {createAiBcmHandler} from '../bcm-ai-production/handler.mjs';\n";
const script=new URL('./bundle-bcm-ai-production.mjs',import.meta.url).pathname;
const clientId='10000000-0000-0000-0000-000000000001',secret='fixture-only-abcdefghijklmnopqrstuvwxyz';

function entry(source,{bundled=false,envOverrides={}}={}){
 let handler,clients=0;const calls=[];
 const env={SUPABASE_URL:PRODUCTION_URL,BCM_AI_RELEASE_ENABLED:'true',SUPABASE_ANON_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',OPENAI_API_KEY:'fixture-api',BCM_SCHEDULER_SECRET:secret,...envOverrides};
 const createClient=()=>{clients++;return {auth:{getUser:async()=>{calls.push('getUser');return {data:{user:{id:clientId}}};}},rpc:async(name,args)=>{calls.push(name);if(name==='vb_session_role')return {data:'client'};if(name==='vb_begin_bcm_ai_run'){assert.deepEqual(JSON.parse(JSON.stringify(args)),{target_client:clientId,expected_version:1});return {data:null};}assert.equal(name,'vb_claim_bcm_ai_due_run');return {data:null};}};};
 assert(source.startsWith(sdk));source=source.slice(sdk.length);
 if(bundled)source=source.replace(/^export /gm,'');
 else {assert(source.startsWith(sharedImport));source=source.slice(sharedImport.length);}
 vm.runInNewContext(source,{createClient,Response,performance:{now:()=>0},crypto:{randomUUID:()=>clientId},console:{error:()=>assert.fail('Idle research must log nothing')},...(bundled?{}:{createAiBcmHandler}),Deno:{env:{get:key=>env[key]},serve:value=>{assert.equal(handler,undefined);handler=value;}}});
 assert.equal(typeof handler,'function');
 return {handler,calls,get clients(){return clients;}};
}
function request(mode,headers){return new Request('https://fixture.invalid',{method:'POST',headers,body:mode==='scan'?JSON.stringify({clientId,version:1}):'{}'});}

for(const mode of ['scan','schedule']){
 const path=`supabase/functions/bcm-ai-${mode}/index.ts`;
 const credentials=mode==='scan'?{Authorization:'Bearer fixture-user'}:{'x-bcm-scheduler-secret':secret};
 test(`${mode} entrypoint and generated bundle select the original authorization path`,async()=>{
  const bundle=execFileSync(process.execPath,[script,mode],{encoding:'utf8'});
  // Frozen deployment predates diagnostics. Compare observable authorization/RPC
  // behavior, while preserving that historical source untouched.
  const previous=read(`supabase/proposals/bcm-ai-production/deployment/bcm-ai-${mode}.ts`);
  assert.doesNotMatch(bundle,/^import .*from ['"]\.\.?\//m);
  execFileSync(process.execPath,['--input-type=module','--check'],{input:bundle});
  for(const worker of [entry(previous,{bundled:true}),entry(read(path)),entry(bundle,{bundled:true})]){
   const response=await worker.handler(request(mode,credentials));assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'idle'});
   assert.deepEqual(worker.calls,mode==='scan'?['getUser','vb_session_role','vb_begin_bcm_ai_run']:['vb_claim_bcm_ai_due_run']);
   assert.equal(worker.clients,mode==='scan'?2:1);
  }
 });
 test(`${mode} entrypoint rejects the other mode's credentials`,async()=>{
  const worker=entry(read(path));
  const response=await worker.handler(request(mode,mode==='scan'?{'x-bcm-scheduler-secret':secret}:{Authorization:'Bearer fixture-user'}));
  assert.equal(response.status,mode==='scan'?401:403);assert.equal(worker.clients,0);assert.deepEqual(worker.calls,[]);
 });
 test(`${mode} entrypoint keeps Production project and release switches before all database access`,async()=>{
  for(const envOverrides of [{SUPABASE_URL:'https://imvkhicfmidzbzsbhkzs.supabase.co'},{BCM_AI_RELEASE_ENABLED:undefined},{BCM_AI_RELEASE_ENABLED:'false'}]){
   const worker=entry(read(path),{envOverrides});assert.equal((await worker.handler(request(mode,credentials))).status,503);assert.equal(worker.clients,0);assert.deepEqual(worker.calls,[]);
  }
 });
}
test('Production bundler rejects missing, unsupported and extra mode arguments',()=>{
 for(const args of [[],['test'],['scan','schedule']]){
  const result=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/Use scan or schedule/);
 }
});
