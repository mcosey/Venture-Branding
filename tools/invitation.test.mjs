import test from 'node:test';
import assert from 'node:assert/strict';
import {createInviteHandler} from '../supabase/functions/client-invite/handler.mjs';
const body={clientId:'10000000-0000-0000-0000-000000000001',email:'client@example.com',expectedUpdatedAt:'2026-10-05T00:00:00Z',confirmSend:true};
function harness({role='staff',user=true,reserveError=false,sendError=false,finishError=false,redirect='http://127.0.0.1:8000/login.html'}={}){
 const calls=[];
 const db={auth:{getUser:async()=>({data:{user:user?{id:'staff'}:null}})},rpc:async(name,args)=>{calls.push({name,args});return name==='vb_session_role'?{data:role}:reserveError?{error:{message:'private detail'}}:{data:'ticket'};}};
 const admin={auth:{admin:{inviteUserByEmail:async(email,opts)=>{calls.push({name:'email',email,opts});return sendError?{error:{message:'private SMTP detail'}}:{data:{user:{id:'invited'}}};}}},rpc:async(name,args)=>{calls.push({name,args});return finishError&&args.succeeded?{error:{message:'conflict'}}:{data:null};}};
 const handler=createInviteHandler({env:key=>({VB_CLIENT_INVITE_REDIRECT:redirect,SUPABASE_SERVICE_ROLE_KEY:'server-only',SUPABASE_URL:'url',SUPABASE_ANON_KEY:'public'}[key]),createClient:(url,key)=>{calls.push({name:'create',key});return key==='server-only'?admin:db;}});
 return {calls,run:async(overrides={},headers={Authorization:'Bearer test',Origin:'http://127.0.0.1:8000'})=>handler(new Request('https://example.test',{method:'POST',headers,body:JSON.stringify({...body,...overrides})}))};
}
test('unauthenticated, client, and staff without MFA cannot reserve or send',async()=>{
 for(const settings of [{role:'client'},{role:'denied'},{user:false}]){const h=harness(settings);assert.ok([401,403].includes((await h.run()).status));assert.equal(h.calls.filter(c=>c.name==='email'||c.name==='vb_prepare_client_invite'||c.key==='server-only').length,0);}
 const h=harness();assert.equal((await h.run({},{})).status,401);assert.equal(h.calls.length,0);
});
test('requires confirmation and accepts only configured origin and redirect',async()=>{
 const h=harness();assert.equal((await h.run({confirmSend:false})).status,400);assert.equal(h.calls.some(c=>c.name==='email'),false);
 assert.equal((await h.run({},{Origin:'https://untrusted.example'})).status,403);
 for(const redirect of ['', 'https://untrusted.example/login.html','http://127.0.0.1:8000/login.html?next=bad']){const x=harness({redirect});assert.equal((await x.run()).status,503);assert.equal(x.calls.some(c=>c.name==='vb_prepare_client_invite'),false);}
});
test('reserve refusal cannot deliver mail or use admin credentials',async()=>{const h=harness({reserveError:true});assert.equal((await h.run()).status,409);assert.equal(h.calls.some(c=>c.key==='server-only'||c.name==='email'),false);});
test('successful invitation uses fixed redirect and finishes with returned identity',async()=>{
 const h=harness();const r=await h.run({redirectTo:'https://ignored.example',userId:'forged'});assert.equal(r.status,200);
 assert.deepEqual(h.calls.find(c=>c.name==='email').opts,{redirectTo:'http://127.0.0.1:8000/login.html'});
 assert.deepEqual(h.calls.find(c=>c.name==='vb_complete_client_invite').args,{ticket:'ticket',invited_user:'invited',succeeded:true});
 assert.deepEqual(await r.json(),{sent:true});
});
test('delivery failure records failure and never grants access or leaks upstream errors',async()=>{
 const h=harness({sendError:true});const r=await h.run();assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private|server-only/);assert.equal(h.calls.some(c=>c.args?.succeeded===true),false);assert.equal(h.calls.at(-1).args.succeeded,false);
});
test('post-email membership conflict is reported accurately and recorded for recovery',async()=>{const h=harness({finishError:true});const r=await h.run();assert.equal(r.status,409);assert.match(await r.text(),/email was sent/);assert.equal(h.calls.at(-1).args.succeeded,false);});
