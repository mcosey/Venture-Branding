import test from 'node:test';
import assert from 'node:assert/strict';
import {memberAccountsEnabled,workspaceFor,matchingDraft,signupProfile,SIGNUP_NOTICE,verifiedEntry} from '../auth/member-account.mjs';
const config={memberAccountsEnabled:true,environment:'bcm-test',url:'https://imvkhicfmidzbzsbhkzs.supabase.co'};
test('Member registration cannot activate against Production, non-loopback, or an unrecognized project',()=>{
 assert.equal(memberAccountsEnabled(config,'127.0.0.1'),true);
 for(const [c,h]of [[{...config,url:'https://omvkwiosonatswocbdgx.supabase.co'},'localhost'],[config,'example.com'],[{...config,memberAccountsEnabled:false},'localhost'],[{...config,environment:'bcm-production'},'localhost']])assert.equal(memberAccountsEnabled(c,h),false);
});
test('prepared Production Member gate requires an exact opted-in origin and project',()=>{
 const production={...config,environment:'bcm-production',url:'https://omvkwiosonatswocbdgx.supabase.co',memberOrigins:['http://127.0.0.1:8894']};
 assert.equal(memberAccountsEnabled(production,'127.0.0.1','http://127.0.0.1:8894'),true);
 for(const [c,h,o] of [
  [{...production,memberAccountsEnabled:false},'127.0.0.1','http://127.0.0.1:8894'],
  [{...production,memberOrigins:[]},'127.0.0.1','http://127.0.0.1:8894'],
  [production,'127.0.0.1','http://127.0.0.1:8893'],
  [production,'other.example','http://127.0.0.1:8894'],
  [{...production,url:config.url},'127.0.0.1','http://127.0.0.1:8894'],
  [{...production,memberOrigins:['http://insecure.example']},'insecure.example','http://insecure.example'],
  [{...production,memberOrigins:['https://user:pass@example.test']},'example.test','https://user:pass@example.test']
 ])assert.equal(memberAccountsEnabled(c,h,o),false);
});
test('routing accepts only known server-derived entries',()=>{
 assert.equal(workspaceFor('member'),'member.html');assert.equal(workspaceFor('onboarding'),'signup.html');assert.equal(workspaceFor('client'),'portal.html');
 for(const value of ['denied','https://evil.test','__proto__',null])assert.equal(workspaceFor(value),null);
});
test('pending signup details cannot cross verified accounts or notice versions',()=>{
 const raw=JSON.stringify({notice:SIGNUP_NOTICE,email:'one@example.test',profile:{name:'One'}});
 assert.equal(matchingDraft(raw,'two@example.test'),null);assert.equal(matchingDraft('{bad','one@example.test'),null);
 assert.equal(matchingDraft(raw,'ONE@example.test').profile.name,'One');
 assert.equal(matchingDraft(raw.replace(SIGNUP_NOTICE,'old'),'one@example.test'),null);
});
test('profile drops privilege fields and rejects impossible dates',()=>{
 const profile=signupProfile({fullName:'  Member ',companyName:' Company ',role:'staff',client_id:'other',launchDate:'2026-10-16'});
 assert.equal(profile.full_name,'Member');assert.equal(profile.role,undefined);assert.equal(profile.client_id,undefined);
 assert.throws(()=>signupProfile({fullName:'Member',companyName:'Company',launchDate:'2026-02-30'}));
});
test('verified identity and required MFA precede server routing',async()=>{
 let calls=0;const db={auth:{getUser:async()=>({data:{user:{id:'one'}},error:null}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'}})}},rpc:async()=>{calls++;return {data:'member'};}};
 await assert.rejects(verifiedEntry(db));assert.equal(calls,0);
 db.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal2',nextLevel:'aal2'}});
 assert.equal((await verifiedEntry(db)).entry,'member');assert.equal(calls,1);
 db.rpc=async()=>({data:'denied'});await assert.rejects(verifiedEntry(db));
});
test('signup controller sends credentials only to Auth, clears them, and does not persist passwords or final acceptance',async()=>{
 const previous={window:globalThis.window,location:globalThis.location,document:globalThis.document,sessionStorage:globalThis.sessionStorage};
 const nodes=new Map();const create=()=>({value:'',checked:false,children:[],content:{},events:{},replaceChildren(...items){this.children=items;},append(n){this.children.push(n);},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},focus(){},reportValidity(){return true;}});
 const ids=['signup-loading','acknowledgments','acknowledgment-confirmation','continue','acknowledgment-form','acknowledgment-step','account-step','account-heading','back','registration-form','full-name','company-name','industry','launch-date','signup-email','signup-password','confirm-signup-password','create-account','signup-status'];
 for(const id of ids)nodes.set(id,create());nodes.get('signup-status').dataset={};
 const memory=new Map(),requests=[];
 const db={auth:{getSession:async()=>({data:{session:null}}),signUp:async input=>{requests.push(input);return {data:{session:null}};}}};
 globalThis.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:8885'};
 globalThis.window={location:globalThis.location,VB_AUTH_CONFIG:{...config,publishableKey:'sb_publishable_example'},supabase:{createClient:()=>db}};
 globalThis.sessionStorage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 globalThis.document={getElementById:id=>nodes.get(id),createElement:create};
 try{
  await import('../auth/signup-preview.mjs?credential-flow-test');await new Promise(setImmediate);
  for(const [id,value]of [['full-name','Member'],['company-name','Company'],['signup-email','one@example.test'],['signup-password','not-a-real-test-password'],['confirm-signup-password','not-a-real-test-password']])nodes.get(id).value=value;
  nodes.get('acknowledgment-confirmation').checked=true;
  await nodes.get('registration-form').events.submit({preventDefault(){},currentTarget:nodes.get('registration-form')});
  assert.equal(requests.length,1);assert.equal(requests[0].options.emailRedirectTo,'http://127.0.0.1:8885/login.html');
  assert.equal(nodes.get('signup-password').value,'');assert.equal(nodes.get('confirm-signup-password').value,'');
  const stored=[...memory.values()].join('');assert.equal(stored.includes('password'),false);assert.equal(stored.includes('termsVersion'),false);assert.match(nodes.get('signup-status').textContent,/verify your account/);
 }finally{Object.assign(globalThis,previous);}
});

test('verified email return resumes a matching signup across tabs and skips repeated acknowledgments',async()=>{
 const previous={window:globalThis.window,location:globalThis.location,document:globalThis.document,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage};
 const nodes=new Map();const create=()=>({value:'',checked:false,children:[],content:{},events:{},replaceChildren(...items){this.children=items;},append(n){this.children.push(n);},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},focus(){},reportValidity(){return true;}});
 for(const id of ['heading','signup-loading','acknowledgments','acknowledgment-confirmation','continue','acknowledgment-form','acknowledgment-step','account-step','account-heading','back','registration-form','full-name','company-name','industry','signup-email','signup-password','confirm-signup-password','create-account','signup-status','password-fields'])nodes.set(id,create());
 nodes.get('signup-status').dataset={};
 const session=new Map(),persistent=new Map([['vb-member-test-pending-signup-v1',JSON.stringify({notice:SIGNUP_NOTICE,email:'one@example.test',profile:{full_name:'Member',name:'Company',industry:''}})]]);
 const store=memory=>({getItem:key=>memory.get(key),removeItem:key=>memory.delete(key),setItem:(key,value)=>memory.set(key,value)});
 const calls=[],destinations=[];
 const db={auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{id:'one',email:'one@example.test'}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})}},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='vb_portal_entry'?'onboarding':'company-id'};}};
 globalThis.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:8893',replace:value=>destinations.push(value)};
 globalThis.window={location:globalThis.location,VB_AUTH_CONFIG:{...config,publishableKey:'sb_publishable_example'},supabase:{createClient:()=>db}};
 globalThis.sessionStorage=store(session);globalThis.localStorage=store(persistent);
 globalThis.document={getElementById:id=>nodes.get(id),createElement:create};
 try{
  await import('../auth/signup-preview.mjs?verified-return-test');await new Promise(setImmediate);
  assert.deepEqual(destinations,['member.html']);assert.equal(nodes.get('acknowledgment-step').hidden,true);
  assert.equal(calls.find(call=>call.name==='vb_onboard_test_member').args.profile.name,'Company');
  assert.equal(persistent.size,0);assert.equal(session.size,0);
 }finally{Object.assign(globalThis,previous);}
});

test('resume cannot use a draft belonging to a different email',async()=>{
 const {completePendingSignup}=await import('../auth/member-account.mjs');let called=false;
 assert.equal(await completePendingSignup({rpc:async()=>{called=true;}},{email:'other@example.test'},JSON.stringify({notice:SIGNUP_NOTICE,email:'one@example.test',profile:{full_name:'Member',name:'Company'}})),false);
 assert.equal(called,false);
});
