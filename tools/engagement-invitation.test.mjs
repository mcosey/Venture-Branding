import test from 'node:test';import assert from 'node:assert/strict';
import {createEngagementInviteHandler} from '../supabase/functions/engagement-invite/handler.mjs';
import {pendingInvitation,invitationDestination,validInvitationId,clearInvitation} from '../auth/invitation-route.mjs';
const ticket='f1910000-0000-0000-0000-000000000001';
function harness({existing=false,role='staff',ready=true,environment='bcm-test',serverOrigin,url=environment==='bcm-production'?'https://omvkwiosonatswocbdgx.supabase.co':'https://imvkhicfmidzbzsbhkzs.supabase.co',reserveError=false,sendError=false}={}){
 const calls=[];const env=k=>({SUPABASE_URL:url,VB_ENGAGEMENT_INVITES_ENABLED:String(ready),VB_ENGAGEMENT_INVITE_ORIGIN:serverOrigin,SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private'}[k]);
 const createClient=(_url,key)=>({auth:{getUser:async()=>({data:{user:{id:'staff'}}}),signInWithOtp:async x=>{calls.push(['otp',x]);return {error:sendError};},admin:{inviteUserByEmail:async(email,options)=>{calls.push(['invite',email,options]);return {error:sendError};}}},rpc:async(name,args)=>{calls.push([name,args]);if(name==='vb_session_role')return {data:role};if(name==='vb_prepare_test_engagement_invite')return reserveError?{error:{}}:{data:ticket};if(name==='vb_test_invite_delivery'){assert.equal(key,'private');return {data:{email:'saved-contact@example.test',existing}};}return {data:null};}});
 const handler=createEngagementInviteHandler({createClient,env,environment});const body={draftId:ticket,revision:1,expectedEmail:'saved-contact@example.test',contactUpdatedAt:'2026-10-17T12:00:00Z',confirmSend:true};
 const request=(overrides={},origin='http://127.0.0.1:8893')=>handler(new Request('https://example.test/engagement-invite',{method:'POST',headers:{origin,authorization:'Bearer private-test-session'},body:JSON.stringify({...body,...overrides})}));return {calls,request};
}
test('Test readiness and project guards prevent any Production delivery',async()=>{for(const settings of [{ready:false},{url:'https://production.supabase.co'}]){const h=harness(settings);assert.equal((await h.request()).status,503);assert.equal(h.calls.length,0);}});
test('unexpected origins and nonstaff do not reserve or send',async()=>{const h=harness();assert.equal((await h.request({},'https://other.test')).status,403);const m=harness({role:'client'});assert.equal((await m.request()).status,403);assert.equal(m.calls.length,1);});
test('no arbitrary email or redirect can be supplied',async()=>{const h=harness();assert.equal((await h.request({email:'other@example.test'})).status,400);assert.equal((await h.request({redirectTo:'https://other.test'})).status,400);assert.equal(h.calls.filter(c=>c[0]!=='vb_session_role').length,0);});
test('new recipient gets fixed local invitation destination without Client grants',async()=>{const h=harness();const result=await h.request();assert.equal(result.status,200);assert.deepEqual(await result.json(),{sent:true});const delivery=h.calls.find(c=>c[0]==='invite');assert.equal(delivery[1],'saved-contact@example.test');assert.equal(delivery[2].redirectTo,'http://127.0.0.1:8893/login.html?invitation='+ticket);assert.equal(h.calls.some(c=>c[0].includes('accept')),false);});
test('existing account receives sign-in email, without account enumeration in response',async()=>{const h=harness({existing:true});const r=await h.request();assert.deepEqual(await r.json(),{sent:true});const call=h.calls.find(c=>c[0]==='otp');assert.equal(call[1].options.shouldCreateUser,false);assert.equal(h.calls.some(c=>c[0]==='invite'),false);});
test('stale contact/revision stops email before any admin delivery',async()=>{const h=harness({reserveError:true});assert.equal((await h.request()).status,409);assert.equal(h.calls.some(c=>['otp','invite','vb_test_invite_delivery'].includes(c[0])),false);});
test('failed delivery never marks an invitation sent',async()=>{const h=harness({sendError:true});assert.equal((await h.request()).status,502);assert.equal(h.calls.find(c=>c[0]==='vb_complete_test_invite_delivery')[1].succeeded,false);});
test('Production invitation entry is disabled without an exact approved server origin',async()=>{
 for(const serverOrigin of [undefined,'*','http://insecure.example','https://user:pass@example.test','https://example.test/path','https://example.test?return=other']){
  const h=harness({environment:'bcm-production',serverOrigin});assert.equal((await h.request()).status,503);assert.equal(h.calls.length,0);
 }
 const wrong=harness({environment:'bcm-production',serverOrigin:'http://127.0.0.1:8894',url:'https://imvkhicfmidzbzsbhkzs.supabase.co'});
 assert.equal((await wrong.request({},'http://127.0.0.1:8894')).status,503);assert.equal(wrong.calls.length,0);
});
test('Production origin is read with current readiness, while unsigned requests cannot reach Auth or delivery',async()=>{
 const values={SUPABASE_URL:'https://omvkwiosonatswocbdgx.supabase.co',VB_ENGAGEMENT_INVITES_ENABLED:'true'};
 const handler=createEngagementInviteHandler({environment:'bcm-production',env:key=>values[key],createClient:()=>{throw Error('Unsigned request reached Auth');}});
 const origin='http://127.0.0.1:8895';
 const request=()=>handler(new Request('https://example.test/engagement-invite',{method:'POST',headers:{origin},body:'{}'}));
 assert.equal((await request()).status,503);
 values.VB_ENGAGEMENT_INVITE_ORIGIN=origin;
 const enabled=await request();assert.equal(enabled.status,401);assert.equal(enabled.headers.get('Access-Control-Allow-Origin'),origin);
 values.VB_ENGAGEMENT_INVITE_ORIGIN='*';assert.equal((await request()).status,503);
});
test('prepared Production delivery preserves saved recipient, MFA and both account paths',async()=>{
 const origin='http://127.0.0.1:8894';
 for(const existing of [false,true]){
  const h=harness({environment:'bcm-production',serverOrigin:origin,existing});
  assert.equal((await h.request({},origin)).status,200);
  const delivered=h.calls.find(c=>c[0]===(existing?'otp':'invite'));
  assert.equal(existing?delivered[1].email:delivered[1],'saved-contact@example.test');
  const options=existing?delivered[1].options:delivered[2];
  assert.equal(options[existing?'emailRedirectTo':'redirectTo'],origin+'/login.html?invitation='+ticket);
  assert.equal(h.calls.some(c=>c[0].includes('accept')),false);
 }
 const member=harness({environment:'bcm-production',serverOrigin:origin,role:'client'});
 assert.equal((await member.request({},origin)).status,403);assert.equal(member.calls.some(c=>c[0]==='invite'),false);
 const wrongOrigin=harness({environment:'bcm-production',serverOrigin:origin});
 assert.equal((await wrongOrigin.request({},'http://127.0.0.1:8893')).status,403);assert.equal(wrongOrigin.calls.length,0);
});
test('only UUID invitation context persists; no external return paths',()=>{const data=new Map();const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};assert.equal(pendingInvitation(storage,'?invitation='+ticket),ticket);assert.equal(pendingInvitation(storage),ticket);assert.equal(invitationDestination('signup.html',ticket),'signup.html?invitation='+ticket);assert.equal(invitationDestination('member.html',ticket),'invitation.html?invitation='+ticket);assert.equal(invitationDestination('attorney-login.html',ticket),'attorney-login.html');assert.equal(validInvitationId('https://other.test'),false);clearInvitation(storage);assert.equal(pendingInvitation(storage),null);});
