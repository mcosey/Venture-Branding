import test from 'node:test';
import assert from 'node:assert/strict';
import {clientFallback} from '../auth/client-fallback.mjs';
import {loadRecords} from '../auth/connection.mjs';
const config={memberAccountsEnabled:true,environment:'bcm-test',url:'https://imvkhicfmidzbzsbhkzs.supabase.co'};
test('Final engagement closure returns an authenticated Test user to Member home',async()=>{
 assert.equal(await clientFallback({rpc:async()=>({data:'member'})},config,'127.0.0.1'),'member.html');
});
test('An account needing verified setup returns to registration',async()=>{
 assert.equal(await clientFallback({rpc:async()=>({data:'onboarding'})},config,'localhost'),'signup.html');
});
test('Denial, staff/client routing, injected routes and request failure do not become Member access',async()=>{
 for(const data of ['denied','staff','client','https://example.test','__proto__',null])assert.equal(await clientFallback({rpc:async()=>({data})},config,'localhost'),null);
 assert.equal(await clientFallback({rpc:async()=>({data:'member',error:Error('Offline')})},config,'localhost'),null);
 assert.equal(await clientFallback({rpc:async()=>{throw Error('Offline');}},config,'localhost'),null);
});
test('Production and unrelated hosts never call the new Test fallback',async()=>{
 const db={rpc:async()=>{throw Error('Unexpected request');}};
 for(const [c,h] of [[{...config,environment:'production'},'localhost'],[{...config,url:'https://omvkwiosonatswocbdgx.supabase.co'},'localhost'],[config,'example.test']])assert.equal(await clientFallback(db,c,h),null);
});
test('Shared client access gate redirects Alumni before loading any client table',async()=>{
 const previous=globalThis.window;let redirect,tableRead=false;
 globalThis.window={VB_AUTH_CONFIG:config,location:{hostname:'localhost',replace:value=>{redirect=value;}}};
 const db={auth:{getUser:async()=>({data:{user:{id:'verified-user'}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{nextLevel:'aal1',currentLevel:'aal1'}})}},rpc:async name=>({data:name==='vb_session_role'?'denied':'member'}),from:()=>{tableRead=true;throw Error('Client data must not load');}};
 try{await assert.rejects(()=>loadRecords(db,'client'),/does not have access/);assert.equal(redirect,'member.html');assert.equal(tableRead,false);}finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
