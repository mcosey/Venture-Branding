import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {verifiedEntry,workspaceFor} from '../auth/member-account.mjs';

function account({entry='client',companies=[],failure=false,memberAccepted=true,invitationValid=true}={}){
 const calls=[];
 const db={auth:{getUser:async()=>({data:{user:{id:'existing',email:'existing@example.test'}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})}},
  rpc:async(name,args)=>{calls.push({name,args});if(name==='vb_member_onboarding_complete')return {data:memberAccepted};if(name==='vb_read_test_engagement_invite')return invitationValid?{data:{client_name:'Invited company'}}:{error:{code:'42501'}};return {data:entry};},
  from:table=>{assert.equal(table,'vb_member_companies');return {select:()=>({order:async()=>failure?{error:{code:'NETWORK'}}:{data:companies}})};}};
 return {db,calls};
}

for(const entry of ['client','member'])test(entry+' without a profile uses shared onboarding without provisioning records',async()=>{
 const f=account({entry});const access=await verifiedEntry(f.db,{requireProfile:true});
 assert.equal(access.entry,'onboarding');assert.deepEqual(access.companies,[]);
 assert.equal(access.onboardingKind,entry==='client'?'client':'member');
 assert.deepEqual(f.calls.map(call=>call.name),['vb_portal_entry']);
});
for(const entry of ['client','member'])test(entry+' with a profile retains its server-authorized workspace',async()=>{
 const companies=[{id:'owned',name:'Planning company'}],f=account({entry,companies});
 const access=await verifiedEntry(f.db,{requireProfile:true});assert.equal(access.entry,entry);assert.deepEqual(access.companies,companies);
});
test('a failed profile read never treats unavailable data as missing onboarding',async()=>{
 const f=account({failure:true});await assert.rejects(verifiedEntry(f.db,{requireProfile:true}));assert.equal(f.calls.length,1);
});
test('denied identity or required MFA cannot reach the profile query',async()=>{
 for(const mode of ['denied','mfa']){
  const f=account({entry:'denied'});let reads=0;f.db.from=()=>{reads++;throw Error('Must not read');};
  if(mode==='mfa')f.db.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'}});
  await assert.rejects(verifiedEntry(f.db,{requireProfile:true}));assert.equal(reads,0);
 }
});
test('nested Legal Launch Kit entry redirects once to root account signup, never a nested URL or login',async()=>{
 const routes=[],source=(await readFile(new URL('../auth/member-session.mjs',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'').replace('export const memberContext=await connect();','await connect();');
 const context={window:{VB_AUTH_CONFIG:{},location:{hostname:'127.0.0.1'}},location:{origin:'http://127.0.0.1:8895',replace:route=>routes.push(route)},URL,
  memberAccountsEnabled:()=>true,memberClient:()=>({}),verifiedEntry:async(_,options)=>{assert.equal(options.requireProfile,true);return {entry:'onboarding'};},workspaceFor};
 await assert.rejects(vm.runInNewContext('(async()=>{'+source+'})()',context),/Account setup required/);
 assert.deepEqual(routes,['http://127.0.0.1:8895/signup.html']);
});

test('an older Client completes a Client profile without Member terms, new credentials or a Client grant',async()=>{
 const previous={window:globalThis.window,location:globalThis.location,document:globalThis.document,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage};
 const nodes=new Map(),create=()=>({value:'',checked:false,children:[],content:{},events:{},dataset:{},replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},focus(){},reportValidity(){return true;}});
 for(const id of ['heading','account-steps','account-intro','client-setup-note','signup-loading','acknowledgments','acknowledgment-confirmation','continue','acknowledgment-form','acknowledgment-step','account-step','account-heading','back','registration-form','full-name','company-name','industry','signup-email','signup-password','confirm-signup-password','create-account','signup-status','password-fields'])nodes.set(id,create());
 const f=account(),routes=[],companies=[];let creates=0;
 f.db.auth.getSession=async()=>({data:{session:{}}});f.db.auth.signUp=async()=>{creates++;};
 f.db.from=()=>({select:()=>({order:async()=>({data:companies})})});
 f.db.rpc=async(name,args)=>{f.calls.push({name,args});if(name==='vb_portal_entry')return {data:'client'};assert.equal(name,'vb_onboard_client');companies.push({id:'planning-company',name:args.profile.name});return {data:'planning-company'};};
 globalThis.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:8893',search:'',replace:route=>routes.push(route)};
 globalThis.window={location:globalThis.location,VB_AUTH_CONFIG:{memberAccountsEnabled:true,environment:'bcm-test',url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_example'},supabase:{createClient:()=>f.db}};
 const storage={getItem:()=>null,removeItem(){},setItem(){throw Error('Existing login must not create a pending signup');}};
 globalThis.sessionStorage=storage;globalThis.localStorage=storage;globalThis.document={getElementById:id=>nodes.get(id),createElement:create};
 try{
  await import('../auth/signup-preview.mjs?shared-onboarding-regression');await new Promise(setImmediate);
  assert.deepEqual(routes,[]);assert.equal(nodes.get('password-fields').hidden,true);assert.equal(nodes.get('signup-email').readOnly,true);
  assert.equal(nodes.get('heading').textContent,'Complete your Client profile');
  assert.equal(nodes.get('create-account').textContent,'Save Client profile');assert.equal(nodes.get('acknowledgment-confirmation').checked,false);
  assert.equal(nodes.get('acknowledgment-step').hidden,true);assert.equal(nodes.get('acknowledgments').children.length,0);assert.equal(nodes.get('back').hidden,true);assert.equal(nodes.get('client-setup-note').hidden,false);
  nodes.get('full-name').value='Existing user';nodes.get('company-name').value='Planning company';
  const submit=()=>nodes.get('registration-form').events.submit({preventDefault(){},currentTarget:nodes.get('registration-form')});
  await submit();
  assert.equal(creates,0);assert.deepEqual(f.calls.map(call=>call.name),['vb_portal_entry','vb_onboard_client']);
  assert.equal(f.calls[1].args.profile.client_id,undefined);assert.equal(f.calls[1].args.profile.role,undefined);assert.equal(f.calls[1].args.notice,undefined);assert.deepEqual(routes,['portal.html']);
  const access=await verifiedEntry(f.db,{requireProfile:true});assert.equal(access.entry,'client');assert.equal(access.companies[0].id,'planning-company');
  await import('../auth/signup-preview.mjs?shared-onboarding-completed-regression');await new Promise(setImmediate);
  assert.equal(routes.at(-1),'portal.html');assert.equal(f.calls.filter(call=>call.name==='vb_onboard_client').length,1);assert.equal(f.calls.filter(call=>call.name==='vb_onboard_test_member').length,0);
 }finally{Object.assign(globalThis,previous);}
});

test('a Client-only alumnus needs Member acceptance before entering free Member onboarding',async()=>{
 const f=account({entry:'member',companies:[{id:'existing-client-profile'}],memberAccepted:false});
 const access=await verifiedEntry(f.db,{requireProfile:true});assert.equal(access.entry,'onboarding');assert.equal(access.onboardingKind,'member');assert.equal(access.companies[0].id,'existing-client-profile');
});
test('a valid invitation selects Client onboarding without recording or repeating Member acceptance',async()=>{
 for(const [companies,expected]of [[[],'onboarding'],[[{id:'member-company'}],'member']]){
  const f=account({entry:'member',companies});const access=await verifiedEntry(f.db,{requireProfile:true,invitationId:'10000000-0000-4000-8000-000000000001'});
  assert.equal(access.onboardingKind,'client');assert.equal(access.entry,expected);assert.deepEqual(f.calls.map(call=>call.name),['vb_portal_entry','vb_read_test_engagement_invite']);
 }
});
test('an invalid invitation cannot select Client setup or fall back to a Member acceptance',async()=>{
 const f=account({entry:'onboarding',invitationValid:false});let reads=0;f.db.from=()=>{reads++;throw Error('No profile query');};
 await assert.rejects(verifiedEntry(f.db,{requireProfile:true,invitationId:'10000000-0000-4000-8000-000000000001'}));assert.equal(reads,0);assert.equal(f.calls.length,2);
});
