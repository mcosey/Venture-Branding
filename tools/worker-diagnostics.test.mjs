import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler as lookup} from '../supabase/functions/uspto-lookup/handler.mjs';
import {createHandler as evidence} from '../supabase/functions/evidence-upload/handler.mjs';
import {createEngagementInviteHandler as engagement} from '../supabase/functions/engagement-invite/handler.mjs';
import {createInviteHandler as invite} from '../supabase/functions/client-invite/handler.mjs';
import {createWatchHandler as watch} from '../supabase/functions/watch-ingest/handler.mjs';
import {createAiBcmHandler as research} from '../supabase/functions/bcm-ai/handler.mjs';
import {createAiBcmHandler as productionResearch,PRODUCTION_URL} from '../supabase/functions/bcm-ai-production/handler.mjs';
const id='10000000-0000-4000-8000-000000000001',ref='VB-'+id,project='https://imvkhicfmidzbzsbhkzs.supabase.co';
const secret='PRIVATE-API-KEY-and-PRIVATE-token',privateData='PRIVATE client@example.test Company notes image/path';
function context(){const events=[];return {events,diagnostics:{sink:e=>events.push(e),makeReference:()=>id,clock:()=>1},env:k=>({SUPABASE_URL:project,SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:secret,USPTO_API_KEY:secret,OPENAI_API_KEY:secret,VB_ALLOWED_ORIGINS:'http://127.0.0.1:8000',VB_CLIENT_INVITE_REDIRECT:'http://127.0.0.1:8000/login.html',VB_ENGAGEMENT_INVITES_ENABLED:'true',WATCH_RELEASE_ENABLED:'true',WATCH_INGEST_KEY:secret+'xxxxxxxxxxxxxxxxxxxxxxxx'}[k])};}
function sdk({role='staff',rpc,send}={}){return ()=>({auth:{getUser:async()=>({data:{user:{id}}}),signInWithOtp:send,admin:{inviteUserByEmail:send}},rpc:async(name,args)=>name==='vb_session_role'?{data:role}:rpc(name,args),from:()=>({select(){return this},eq(){return this},is(){return this},single:async()=>({data:{id,updated_at:'version'}})})});}
const req=(body,origin='http://127.0.0.1:8000')=>new Request('https://worker.test',{method:'POST',headers:{authorization:'Bearer '+secret,origin},body:JSON.stringify(body)});
function clean(f){assert(!JSON.stringify(f.events).includes('PRIVATE'));for(const e of f.events)assert(!Object.keys(e).some(k=>['email','user','client','ticket','url','body','error','stack'].includes(k)));}
test('lookup provider exceptions cannot leak a key even if the message contains USPTO',async()=>{
 const f=context(),handler=lookup({...f,createClient:sdk(),fetchRecord:async()=>{throw Error('USPTO '+secret+' '+privateData);}});
 const response=await handler(req({action:'preview',serial:'01234567',clientId:id})),body=await response.json();
 assert.equal(response.status,400);assert.equal(body.supportReference,ref);assert(!JSON.stringify(body).includes('PRIVATE'));
 assert.equal(f.events[0].stage,'fetch');clean(f);
});
test('successful lookup does not create an activity event and read-only preview never saves',async()=>{
 const f=context();let saves=0;const handler=lookup({...f,createClient:sdk({rpc:async()=>{saves++;return {}}}),fetchRecord:async()=>({name:privateData})});
 assert.equal((await handler(req({action:'preview',serial:'01234567',clientId:id}))).status,200);assert.equal(saves,0);assert.equal(f.events.length,0);
});
test('lookup save conflict is distinguishable without serial, fingerprint or SQL payload in logs',async()=>{
 const f=context(),handler=lookup({...f,createClient:sdk({rpc:async()=>({error:{message:privateData}})}),fetchRecord:async()=>({name:privateData})});
 const preview=await (await handler(req({action:'preview',serial:'01234567',clientId:id}))).json();
 const response=await handler(req({action:'save',serial:'01234567',clientId:id,confirmOwner:true,fingerprint:preview.fingerprint}));
 assert.equal(response.status,409);assert.equal((await response.json()).supportReference,ref);assert.equal(f.events[0].stage,'save');assert.equal(f.events[0].category,'conflict');clean(f);
});
test('engagement email finalization and failed failure-recording share one safe reference',async()=>{
 const f=context(),handler=engagement({...f,createClient:sdk({rpc:async name=>name==='vb_prepare_test_engagement_invite'?{data:id}:name==='vb_test_invite_delivery'?{data:{email:privateData,existing:false}}:(()=>{throw Error(privateData);})(),send:async()=>({})})});
 const r=await handler(req({draftId:id,revision:1,expectedEmail:'person@example.test',contactUpdatedAt:'version',confirmSend:true},'http://127.0.0.1:8893'));
 assert.equal(r.status,500);assert.equal((await r.json()).supportReference,ref);assert.deepEqual(f.events.map(e=>e.stage),['cleanup','finalize']);clean(f);
});
test('legacy invitation returned cleanup error is logged instead of silently disappearing',async()=>{
 const f=context(),handler=invite({...f,createClient:sdk({rpc:async name=>name==='vb_prepare_client_invite'?{data:id}:{error:{message:privateData}},send:async()=>({error:{message:privateData}})})});
 const r=await handler(req({clientId:id,email:'person@example.test',expectedUpdatedAt:'version',confirmSend:true}));
 assert.equal(r.status,502);assert.deepEqual(f.events.map(e=>e.stage),['cleanup','deliver']);assert.equal((await r.json()).supportReference,ref);clean(f);
});
test('failed engagement email plus returned finalization error records both failure stages',async()=>{
 const f=context(),handler=engagement({...f,createClient:sdk({rpc:async name=>name==='vb_prepare_test_engagement_invite'?{data:id}:name==='vb_test_invite_delivery'?{data:{email:privateData,existing:false}}:{error:{message:privateData}},send:async()=>({error:{message:privateData}})})});
 const r=await handler(req({draftId:id,revision:1,expectedEmail:'person@example.test',contactUpdatedAt:'version',confirmSend:true},'http://127.0.0.1:8893'));
 assert.equal(r.status,502);assert.deepEqual(f.events.map(e=>e.stage),['finalize','deliver']);clean(f);
});
test('Watch SQL failure logs one batch-level category without its input or SQL error',async()=>{
 const f=context(),handler=watch({...f,createClient:sdk({rpc:async()=>({error:{message:privateData}})})});
 const r=await handler(new Request('https://worker.test',{method:'POST',headers:{'x-watch-ingest-key':f.env('WATCH_INGEST_KEY')},body:JSON.stringify({action:'inventory'})}));
 assert.equal(r.status,409);assert.equal((await r.json()).supportReference,ref);assert.equal(f.events.length,1);assert.equal(f.events[0].stage,'database');clean(f);
});
test('research failure and cleanup returned error are both visible without research contents',async()=>{
 const f=context(),handler=research({...f,createClient:sdk({role:'client',rpc:async name=>name==='vb_begin_bcm_ai_run'?{data:{ticket:id,settings:{urls:['https://www.harvey.ai/'],exclusions:[],access_mode:'public',frequency:'weekly',categories:['product_names']},known_names:[privateData]}}:name==='vb_bcm_ai_run_is_current'?{data:true}:{error:{message:privateData}}}),research:async()=>{throw Error(privateData);}});
 const r=await handler(req({clientId:id,version:1}));assert.equal(r.status,500);assert.equal((await r.json()).supportReference,ref);assert.deepEqual(f.events.map(e=>e.stage),['cleanup','provider']);clean(f);
});
test('evidence storage failure excludes image bytes, filenames, notes and object paths',async()=>{
 const f=context(),createClient=()=>({auth:{getUser:async()=>({data:{user:{id}}})},rpc:async name=>name==='vb_session_role'?{data:'client'}:{data:{id,uploaded_by:id,object_path:privateData}},storage:{from:()=>({upload:async()=>({error:{message:privateData}}),download:async()=>({error:{message:privateData}})})}});
 const handler=evidence({...f,createClient}),bytes=new Uint8Array(45);bytes.set([137,80,78,71,13,10,26,10]);new DataView(bytes.buffer).setUint32(8,13);bytes.set([73,72,68,82],12);new DataView(bytes.buffer).setUint32(16,1);new DataView(bytes.buffer).setUint32(20,1);bytes.set([73,69,78,68],37);
 const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'PRIVATE.png');form.append('details',JSON.stringify({notes:privateData}));
 const r=await handler(new Request('https://worker.test',{method:'POST',headers:{authorization:'Bearer '+secret,origin:'http://127.0.0.1:8000'},body:form}));
 assert.equal(r.status,503);assert.equal((await r.json()).supportReference,ref);assert.equal(f.events[0].stage,'verify_store');clean(f);
});
test('denied requests do not log identities or create provider/email activity',async()=>{
 for(const factory of [lookup,invite]){const f=context();let calls=0;const handler=factory({...f,createClient:sdk({role:'client'}),fetchRecord:async()=>{calls++;},send:async()=>{calls++;}});assert.equal((await handler(req({}))).status,403);assert.equal(calls,0);assert.equal(f.events.length,0);}
});
test('a broken log sink cannot turn a safe operational failure into an unhandled error',async()=>{
 const f=context(),handler=lookup({...f,diagnostics:{sink:()=>{throw Error(privateData);},makeReference:()=>id},createClient:sdk(),fetchRecord:async()=>{throw Error(privateData);}});
 const r=await handler(req({action:'preview',serial:'01234567',clientId:id}));assert.equal(r.status,400);assert.equal((await r.json()).supportReference,ref);
});

for(const scheduled of [false,true])test(`Production research ${scheduled?'scheduled':'manual'} failures stay private and preserve cleanup`,async()=>{
 for(const cleanupFailure of ['returned','thrown']){
  const f=context(),base=f.env;f.env=k=>({SUPABASE_URL:PRODUCTION_URL,BCM_AI_RELEASE_ENABLED:'true',BCM_SCHEDULER_SECRET:secret+'xxxxxxxxxxxxxxxxxxxxxxxx'}[k]??base(k));let providerCalls=0;const calls=[];
  const handler=productionResearch({...f,scheduled,createClient:sdk({role:'client',rpc:async(name,args)=>{calls.push({name,args});if(['vb_begin_bcm_ai_run','vb_claim_bcm_ai_due_run'].includes(name))return {data:{ticket:id,settings:{urls:['https://www.harvey.ai/'],exclusions:[],access_mode:'public',frequency:'weekly',categories:['product_names']},known_names:[privateData]}};if(name==='vb_bcm_ai_run_is_current')return {data:true};if(cleanupFailure==='thrown')throw Error(privateData);return {error:{message:privateData}};}}),research:async()=>{providerCalls++;throw Error(privateData);}});
  const request=scheduled?new Request('https://worker.test',{method:'POST',headers:{'x-bcm-scheduler-secret':f.env('BCM_SCHEDULER_SECRET')},body:'{}'}):req({clientId:id,version:1});
  const response=await handler(request),body=await response.json();assert.equal(response.status,500);assert.equal(body.supportReference,ref);assert.equal(providerCalls,1);
  assert.deepEqual(f.events.map(e=>e.stage),['cleanup','provider']);assert(f.events.every(e=>e.reference===ref));clean(f);assert(!JSON.stringify(body).includes('PRIVATE'));
  assert.deepEqual(calls.at(-1),{name:'vb_finish_bcm_ai_run',args:{ticket:id,payload:null,failure:true}});
 }
});

test('Production research keeps invalid input, disabled gates and initial identity/role denial quiet',async()=>{
 for(const denied of ['project','release','role','input']){
  const f=context(),base=f.env;let providerCalls=0;
  f.env=k=>({SUPABASE_URL:denied==='project'?project:PRODUCTION_URL,BCM_AI_RELEASE_ENABLED:denied==='release'?'false':'true'}[k]??base(k));
  const handler=productionResearch({...f,createClient:sdk({role:'staff',rpc:async()=>assert.fail('No research RPC on denial')}),research:async()=>providerCalls++});
  const response=await handler(req(denied==='input'?{clientId:privateData}:{clientId:id,version:1}));assert(response.status>=400);assert.equal(f.events.length,0);assert.equal(providerCalls,0);
 }
});
