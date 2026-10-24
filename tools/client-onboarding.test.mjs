import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PENDING_CLIENT_SIGNUP,PENDING_SIGNUP,matchingClientDraft,completePendingClientSignup} from '../auth/member-account.mjs';
const invitation='10000000-0000-4000-8000-000000000001';
let sequence=0;
async function page({signedIn=false,companies=[],pending=null,saveFailure=false}={},run){
 const previous={window:globalThis.window,location:globalThis.location,document:globalThis.document,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage};
 const nodes=new Map(),calls=[],routes=[],memory=new Map(pending?[[PENDING_CLIENT_SIGNUP,JSON.stringify(pending)]]:[]);
 const create=()=>({value:'',checked:false,children:[],content:{},events:{},dataset:{},hidden:true,replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},focus(){},reportValidity(){return true;}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,create());return nodes.get(id);};
 const db={auth:{getSession:async()=>({data:{session:signedIn?{}:null}}),getUser:async()=>({data:{user:{id:'invited-user',email:'invitee@example.test'}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})},signUp:async args=>{calls.push({name:'auth.signup',args});return {data:{session:null}};}},
  from:()=>({select:()=>({order:async()=>({data:companies})})}),rpc:async(name,args)=>{calls.push({name,args});
   if(name==='vb_portal_entry')return {data:companies.length?'member':'onboarding'};
   if(name==='vb_read_test_engagement_invite')return {data:{client_name:'Separate legal client'}};
   if(name==='vb_onboard_client'){if(saveFailure)return {error:{code:'XX000',message:'PRIVATE DATABASE ERROR'}};companies.push({id:'planning-company',name:args.profile.name});return {data:'planning-company'};}
   throw Error('Unexpected Member acceptance or permission operation: '+name);
  }};
 globalThis.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:8893',search:'?invitation='+invitation,replace:route=>routes.push(route)};
 globalThis.window={location:globalThis.location,VB_AUTH_CONFIG:{memberAccountsEnabled:true,environment:'bcm-test',url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_example'},supabase:{createClient:()=>db}};
 const storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
 globalThis.sessionStorage=storage;globalThis.localStorage=storage;globalThis.document={getElementById:node,createElement:create};
 try{
  await import('../auth/signup-preview.mjs?client-onboarding-test='+(++sequence));await new Promise(setImmediate);
  await run({node,calls,routes,memory,submit:()=>node('registration-form').events.submit({preventDefault(){},currentTarget:node('registration-form')})});
 }finally{Object.assign(globalThis,previous);}
}

test('new invited registration has no Member acceptance and stores a separate email-bound Client draft',async()=>{
 await page({},async f=>{
  assert.equal(f.node('heading').textContent,'Create your Client account');assert.equal(f.node('acknowledgment-step').hidden,true);assert.equal(f.node('acknowledgments').children.length,0);
  for(const [id,value]of [['full-name','Invited user'],['company-name','My planning company'],['signup-email','invitee@example.test'],['signup-password','not-a-real-password'],['confirm-signup-password','not-a-real-password']])f.node(id).value=value;
  assert.equal(f.node('acknowledgment-confirmation').checked,false);await f.submit();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'auth.signup');assert.equal(f.calls[0].args.options.emailRedirectTo,'http://127.0.0.1:8893/login.html?invitation='+invitation);
  assert.equal(f.memory.has(PENDING_SIGNUP),false);const pending=JSON.parse(f.memory.get(PENDING_CLIENT_SIGNUP));
  assert.equal(pending.invitation,invitation);assert.equal(pending.email,'invitee@example.test');assert.equal(pending.notice,undefined);assert.equal(pending.confirmed,undefined);assert.equal(pending.password,undefined);
  assert.equal(f.node('signup-password').value,'');assert.equal(f.node('confirm-signup-password').value,'');
 });
});
test('a verified new invitee resumes only Client setup and then returns to the same invitation',async()=>{
 await page({signedIn:true,pending:{version:1,email:'invitee@example.test',invitation,profile:{full_name:'Invited user',name:'Planning company',industry:''}}},async f=>{
  assert.deepEqual(f.calls.map(call=>call.name),['vb_portal_entry','vb_read_test_engagement_invite','vb_onboard_client']);
  assert.equal(f.calls[2].args.invitation_id,invitation);assert.equal(f.calls[2].args.notice,undefined);assert.equal(f.calls[2].args.confirmed,undefined);
  assert.deepEqual(f.routes,['invitation.html?invitation='+invitation]);assert.equal(f.memory.has(PENDING_CLIENT_SIGNUP),false);
 });
});
test('an existing Member invited to Client access keeps the saved profile and skips registration acknowledgments',async()=>{
 await page({signedIn:true,companies:[{id:'member-company',name:'Existing planning company'}]},async f=>{
  assert.deepEqual(f.calls.map(call=>call.name),['vb_portal_entry','vb_read_test_engagement_invite']);
  assert.deepEqual(f.routes,['invitation.html?invitation='+invitation]);
 });
});
test('Client profile failure stays on the form and never falls back to Member acceptance',async()=>{
 await page({signedIn:true,saveFailure:true},async f=>{
  f.node('full-name').value='Invited user';f.node('company-name').value='Planning company';await f.submit();
  assert.equal(f.calls.at(-1).name,'vb_onboard_client');assert.deepEqual(f.routes,[]);assert.equal(f.node('create-account').disabled,false);
  assert.equal(f.node('signup-status').textContent.includes('PRIVATE DATABASE ERROR'),false);assert.equal(f.node('acknowledgment-confirmation').checked,false);
 });
});
test('Client signup drafts cannot cross emails, invitations, or become Member acceptance',async()=>{
 const raw=JSON.stringify({version:1,email:'invitee@example.test',invitation,profile:{full_name:'Invited user',name:'Planning company'}});let calls=0;
 const db={rpc:async()=>{calls++;return {data:'company'};}};
 assert.equal(matchingClientDraft(raw,'other@example.test',invitation),null);
 assert.equal(await completePendingClientSignup(db,{email:'invitee@example.test'},raw,'20000000-0000-4000-8000-000000000001'),false);assert.equal(calls,0);
});
test('prepared database patch preserves the reviewed invitation body except for the explicit Client setup prerequisite',async()=>{
 const sql=await readFile(new URL('../supabase/proposals/client-onboarding/01-prepared-apply.sql',import.meta.url),'utf8');
 const baselines=JSON.parse(await readFile(new URL('../supabase/proposals/client-onboarding/function-baselines.json',import.meta.url),'utf8'));
 for(const name of ['vb_onboard_test_member','vb_accept_test_engagement_invite']){
  const start=sql.indexOf('create or replace function public.'+name+'('),tail=sql.slice(start),body=tail.split('as $$',2)[1].split('$$;',1)[0];
  assert.equal(createHash('md5').update(body).digest('hex'),baselines[name].new_body_md5);assert.ok(sql.includes(baselines[name].baseline_body_md5));
 }
 const client=sql.split('create function public.vb_onboard_client(',2)[1].split('end $$;',1)[0];
 assert.equal(client.includes('portal_test_onboarding'),false);assert.doesNotMatch(client,/insert into (?:auth\.users|public\.vb_engagements|vb_private\.engagement_grants)/);
 assert.match(client,/vb_private\.test_invite_recipient/);assert.match(client,/public\.vb_account_access\(\)<>'client'/);assert.match(client,/owner_id=uid/);
 assert.match(sql,/revoke all on vb_private\.portal_client_onboarding from public,anon,authenticated/);
});
