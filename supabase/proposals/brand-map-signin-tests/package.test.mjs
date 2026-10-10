// Local safety/flow tests. Mock replies are NOT hosted sign-in/privacy evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {manifest,bindAccounts,setup,withdraw,verification,cleanupData,cleanupObjects,postcheck,runtimeConfig,verifyReports,signinPreflight,interruptedInventory,cleanupInterrupted,verifyCompleted} from './package.mjs';
import {PROJECT,ORIGIN,CASES,PAYLOAD,business,validateConfig,validateKey,validateManifest,validateMap,renderMap,safeEvidence} from './contract.mjs';
import {createRunner} from './runner.mjs';
import {loadSources,splitSql,code,digest} from '../brand-map-hosted/package.mjs';
const [source]=await loadSources(),unbound=manifest();
const observed=Object.fromEntries(['A','B'].map(a=>[a,{id:randomUUID(),email:unbound.users[a].email,confirmed:true,created_for_this_run:true}]));
const m=bindAccounts(unbound,observed),key='sb_publishable_local_mock_only_123456';
const activation={approved:true,accountsApproved:true,testWindowConfirmed:true,observedUrl:`https://supabase.com/dashboard/project/${PROJECT}/sql/new`,databaseIdentity:'7692130048193495360',schemaDigest:'a'.repeat(64)};
const config=runtimeConfig(m,{status:'SETUP_CREATED',run_id:m.run_id,project:PROJECT,database_identity:activation.databaseIdentity,installed_schema:'b'.repeat(64)},{...activation,setupIndependentlyVerified:true});
const clone=x=>structuredClone(x);
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.ownerDocument={createElement:tag=>new Element(tag)};this.text='';}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text+this.children.map(c=>c.textContent).join('');}
 get childElementCount(){return this.children.length;}
 replaceChildren(){this.children=[];this.text='';}
 append(...nodes){this.children.push(...nodes);}
 querySelector(){return this.children.find(c=>['img','script','iframe'].includes(c.tagName))||this.children.map(c=>c.querySelector()).find(Boolean)||null;}
 set innerHTML(value){throw Error('Unsafe HTML assignment');}
}
function mapFor(actor,created=[]){
 const assets=m.assets[actor]?.map((id,i)=>({id,client_id:m.clients[actor],name:actor==='A'&&i===1?PAYLOAD:`${m.label}-${actor}-asset-${i}`,kind:'product',description:'',business_use:'in_use',version:1,identity_revision:1,source_kind:'manual_client',created_at:'synthetic',updated_at:'synthetic'}))||[];
 assets.push(...created);
 const marks=(m.marks[actor]||[]).map((id,i)=>({id,client_id:m.clients[actor],name:`${m.label}-${actor}-mark-${i}`,mark_type:'word',status:'inactive',uspto_status_text:null,application_number:null,registration_number:null,record_owner:'Test owner',source:'manual',source_checked_at:null,filing_date:null,registration_date:null,uspto_status_date:null,updated_at:'synthetic'}));
 return {client_id:m.clients[actor],assets,marks,relationships:assets.map(a=>({id:randomUUID(),child_asset_id:a.id,parent_asset_id:null,state:null,version:1,confirmed_by_role:null,confirmed_at:null})),legal_links:assets.map(a=>({id:randomUUID(),asset_id:a.id,mark_id:null,version:1,reviewed_at:null,reviewed_by_role:null,review_state:'not_linked',linked_record_available:false,linked_record_status:null})),counts:{assets:assets.length,legal_records:marks.length,linked_legal_records:0}};
}
function mockService(){
 const created={A:[],B:[]},withdrawn={A:false,B:false},requests=[];let networkFailure=false,unexpectedCode=false,extraField=false;
 const reply=(status,data)=>({status,headers:{get:()=>status===204?'':'application/json'},text:async()=>data===null?'':JSON.stringify(data)});
 const deny=()=>reply(403,{code:unexpectedCode?'XX000':'42501',message:'Brand Map unavailable for this account.',details:null,hint:null});
 async function fetcher(url,opt){
  requests.push({url,method:opt.method,authenticated:Boolean(opt.headers.Authorization)});
  if(networkFailure)throw Error('network mock failure');
  assert.ok(url.startsWith(ORIGIN+'/'));assert.equal(opt.credentials,'omit');assert.equal(opt.redirect,'error');assert.equal(opt.cache,'no-store');
  const actor=opt.headers.Authorization?.endsWith('mock_A')?'A':opt.headers.Authorization?.endsWith('mock_B')?'B':null;
  const args=opt.body?JSON.parse(opt.body):{};
  if(url.endsWith('/auth/v1/token?grant_type=password')){const a=['A','B'].find(a=>args.email===m.users[a].email);return reply(200,{access_token:'mock_'+a,refresh_token:'mock_refresh_private',token_type:'bearer',expires_in:3600});}
  if(url.endsWith('/auth/v1/user'))return reply(200,{id:m.users[actor].id,email:m.users[actor].email});
  if(url.endsWith('/auth/v1/logout?scope=local'))return reply(204,null);
  if(!actor)return deny();
  if(opt.headers['Accept-Profile']==='vb_private')return reply(406,{code:'PGRST106',message:'Schema not exposed'});
  if(/rpc\/brand_map_/.test(url))return reply(404,{code:'PGRST202',message:'Not found'});
  if(!url.includes('/rpc/'))return deny();
  const own=args.target_client===m.clients[actor],empty=actor==='A'&&args.target_client===m.clients.C;
  if(url.endsWith('/vb_read_brand_map')){
   if((!own&&!empty)||withdrawn[actor])return deny();
   const map=mapFor(empty?'C':actor,empty?[]:created[actor]);if(extraField)map.audit_events=[];return reply(200,map);
  }
  if(!own || withdrawn[actor])return deny();
  if(url.endsWith('/vb_save_brand_asset')){
   if(Object.keys(args.details).some(k=>!['name','kind','description','business_use'].includes(k)))return reply(400,{code:'22023'});
   if(args.target_asset===null){const asset={...mapFor(actor).assets[0],id:randomUUID(),...args.details};created[actor].push(asset);return reply(200,{id:asset.id,version:1,identity_revision:1});}
   const asset=created[actor].find(x=>x.id===args.target_asset);if(!asset)return deny();
   if(args.expected_version!==asset.version)return reply(500,{code:'40001'});
   Object.assign(asset,args.details,{version:asset.version+1,identity_revision:asset.identity_revision+1});return reply(200,{id:asset.id,version:asset.version,identity_revision:asset.identity_revision});
  }
  return deny();
 }
 return {fetcher,requests,withdrawn,created,setNetworkFailure:()=>networkFailure=true,setUnexpectedCode:()=>unexpectedCode=true,setExtraField:()=>extraField=true};
}
test('manifest binds only newly created confirmed accounts and rejects foreign/reused IDs',()=>{
 validateManifest(unbound);assert.throws(()=>validateManifest(unbound,true));validateManifest(m,true);
 for(const edit of [x=>x.project='omvkwiosonatswocbdgx',x=>x.users.A.id=x.clients.A,x=>x.users.A.email='real@example.com',x=>x.password='sensitive',x=>x.assets.B.push(randomUUID())]){const bad=clone(m);edit(bad);assert.throws(()=>validateManifest(bad,true));}
 const bad=clone(observed);bad.A.created_for_this_run=false;assert.throws(()=>bindAccounts(unbound,bad));
});
test('browser blocks all live calls until setup approval and rejects privileged/legacy keys',()=>{
 for(const bad of [{...config,execution_approved:false},{...config,setup_verified:false},{...config,project:'omvkwiosonatswocbdgx'},{...config,secret:'unsafe'}])assert.throws(()=>validateConfig(bad));
 for(const bad of ['sb_secret_abcdef123456','eyJhbGciOiJIUzI1NiJ9.unsafe.unsafe','https://other.example',''])assert.throws(()=>validateKey(bad));
 validateKey(key);let calls=0;assert.throws(()=>createRunner({...config,execution_approved:false},key,'A',{fetcher:()=>{calls++;}}));assert.equal(calls,0);
});
test('SQL batches default-block before helper definitions or writes and split completely',()=>{
 for(const sql of [setup(unbound,source),withdraw(unbound,'A'),withdraw(unbound,'B'),verification(unbound),cleanupData(unbound),cleanupObjects(unbound),postcheck(unbound),interruptedInventory(unbound),cleanupInterrupted(unbound)]){
  const statements=splitSql(sql).map(code),i=statements.findIndex(x=>x.startsWith('do $bm_login_target$'));assert.ok(i>0);assert.match(statements[i],/if false is not true/);assert.ok(statements.slice(0,i).every(x=>/^(begin|set local)\b/.test(x)));assert.doesNotMatch(sql,/create extension|drop schema|truncate|\bcascade\b|insert into auth\.|delete from auth\.|update auth\.|setval\(/i);
 }
 const ro=postcheck(m,activation);assert.match(ro,/begin read only/);assert.doesNotMatch(ro,/create function|drop function|\bdelete\b|\binsert\b|\bupdate\b/i);
});
test('activation needs observed exact Test URL, account approval, fresh pins and identity binding',()=>{
 for(const delta of [{observedUrl:activation.observedUrl.replace(PROJECT,'omvkwiosonatswocbdgx')},{observedUrl:activation.observedUrl.replace(PROJECT,'yjhzhflyuxcxugfgspby')},{accountsApproved:false},{testWindowConfirmed:false},{databaseIdentity:'123'},{schemaDigest:'bad'}])assert.throws(()=>setup(m,source,{...activation,...delta}));
 assert.throws(()=>setup(unbound,source,activation));assert.throws(()=>setup(m,source+'\n',activation));
 assert.throws(()=>runtimeConfig(m,{},{...activation,setupIndependentlyVerified:true}));assert.throws(()=>verification(m,null,activation));assert.throws(()=>cleanupData(m,null,activation));
});
test('setup keeps reviewed backend exact, has no USPTO helper and does not provision Auth',()=>{
 const sql=setup(m,source,activation);for(const statement of splitSql(source).slice(2,-1))assert.ok(sql.includes(statement));
 assert.doesNotMatch(sql,/create function public.vb_save_uspto_mark|insert into auth.users/);assert.match(sql,/email_confirmed_at is not null/);assert.match(sql,/client_memberships where user_id in/);assert.match(sql,/share row exclusive mode/);assert.match(signinPreflight(unbound),/auth_user_triggers/);
});
test('cleanup requires independent results, ownership, foreign-use checks and supported Auth removal',()=>{
 const data=cleanupData(m),objects=cleanupObjects(m);assert.match(data,/Independent verification absent/);assert.match(data,/Other feature uses test fixture/);assert.match(data,/Unowned audit activity/);assert.match(data,/Preexisting rows changed/);assert.match(objects,/Remove disposable accounts through supported Auth administration first/);assert.match(objects,/auth.identities/);assert.match(objects,/auth.sessions/);assert.match(objects,/auth.mfa_factors/);assert.match(objects,/Fixtures or foreign Brand Map records remain/);assert.match(objects,/Restoration failed; rollback/);assert.match(cleanupObjects(m,{rehearsal:true}),/rollback;\s*$/);
});
test('safe projection rejects private fields, foreign slots and inconsistent counts; rendering uses text',()=>{
 const map=mapFor('A');validateMap(map,m,'A',m.assets.A,m.marks.A);
 for(const mutate of [x=>x.assets[0].created_by=m.users.A.id,x=>x.assets[0].client_id=m.clients.B,x=>x.relationships[0].child_asset_id=m.assets.B[0],x=>x.counts.assets=0,x=>x.legal_links[0].mark_id=m.marks.A[0]]){const bad=clone(map);mutate(bad);assert.throws(()=>validateMap(bad,m,'A',m.assets.A,m.marks.A));}
 const view=new Element();renderMap(view,map);assert.ok(view.textContent.includes(PAYLOAD));assert.equal(view.querySelector('img,script'),null);assert.throws(()=>safeEvidence({case_id:'A-own-read',actor:'A',status:'PASS',checks:1,fresh_logins:1,token:'mock'}));
});
let reports;
test('mock-only two-tab flow covers the exact 22 cases with fresh sign-ins and same-token revocation',async()=>{
 const service=mockService(),out={};
 for(const actor of ['A','B']){
  const view=new Element(),runner=createRunner(config,key,actor,{fetcher:service.fetcher,view});
  await assert.rejects(runner.initial(),/Sign in first/); // stopped runner is intentionally discarded.
  const fresh=createRunner(config,key,actor,{fetcher:service.fetcher,view});
  await fresh.login('mock_password_private');await fresh.initial();assert.equal(fresh.stats().phase,'awaiting-fresh-login');assert.equal(view.childElementCount,0);
  await fresh.login('mock_password_private');await fresh.adversarial();service.withdrawn[actor]=true;await fresh.accessChange();await fresh.finish();assert.equal(view.childElementCount,0);assert.equal(fresh.stats().signed_in,false);
  out[actor]=fresh.report();assert.doesNotMatch(JSON.stringify(out[actor]),/mock_password|mock_refresh|mock_A|mock_B|Authorization|access_token/);
 }
 reports=out;assert.equal(new Set(Object.values(out).flatMap(r=>r.cases.map(x=>x.case_id))).size,22);verifyReports(m,out);
 assert.ok(service.requests.every(x=>x.url.startsWith(ORIGIN+'/')));
 assert.match(verification(m,out,activation),/STATE_VERIFIED/);assert.match(cleanupData(m,out,activation),/DATA_CLEANED_AUTH_REMOVAL_PENDING/);
});
test('unexpected server errors, transport failures and private response fields stop without passes',async()=>{
 for(const mode of ['setNetworkFailure','setUnexpectedCode','setExtraField']){
  const service=mockService(),runner=createRunner(config,key,'A',{fetcher:service.fetcher,view:new Element()});await runner.login('mock_password_private');service[mode]();
  await assert.rejects(runner.initial());assert.equal(runner.stats().phase,'failed');assert.ok(!runner.report().cases.some(c=>c.case_id==='A-foreign-read'));await assert.rejects(runner.initial(),/stopped/);await runner.clear().catch(()=>{});assert.equal(runner.stats().signed_in,false);
 }
});
test('report verifier rejects missing/duplicated/under-counted cases and partial sign-outs',()=>{
 for(const mutate of [x=>x.A.cases.pop(),x=>x.A.cases[0].checks=999,x=>x.A.cases[0].fresh_logins=2,x=>x.A.phase='failed',x=>x.B.real_signins=1,x=>x.B.created_asset=x.A.created_asset,x=>x.A.cases[0].token='mock',x=>x.A.cases[1]=x.A.cases[0]]){const bad=clone(reports);mutate(bad);assert.throws(()=>verifyReports(m,bad));}
});
test('page and runner have no persistent sessions, third-party scripts or production imports',async()=>{
 const html=await readFile(new URL('index.html',import.meta.url),'utf8'),js=await readFile(new URL('runner.mjs',import.meta.url),'utf8'),page=await readFile(new URL('page.mjs',import.meta.url),'utf8');
 assert.match(html,/connect-src 'self' https:\/\/imvkhicfmidzbzsbhkzs.supabase.co/);assert.doesNotMatch(html+js+page,/localStorage|sessionStorage|auth\/config|service_role|sb_secret_|innerHTML|document.write|eval\(/);assert.match(js,/getUser proves identity/);assert.match(js,/Auth token is no longer valid/);assert.match(js,/requests===before/);
 assert.equal(digest(source),'21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3');
});

test('interrupted cleanup uses a fresh reviewed owned-state pin and never needs a fictional pass',()=>{
 const inventory={status:'INTERRUPTED_INVENTORY',run_id:m.run_id,owned_state_digest:'c'.repeat(64),asset_ids:[...m.assets.A,...m.assets.B,randomUUID()],asset_count:4,mark_count:3};
 assert.throws(()=>cleanupInterrupted(m,inventory,activation));
 const sql=cleanupInterrupted(m,inventory,{...activation,interruptedOwnershipReviewed:true,rehearsal:true});
 assert.match(sql,/Interrupted fixture state changed/);assert.match(sql,/Unowned\/interconnected fixture records/);assert.match(sql,/cases_passed_not_claimed/);assert.match(sql,/rollback;\s*$/);assert.doesNotMatch(sql,/delete from auth\.|update auth\.|\bcascade\b/i);
 assert.throws(()=>cleanupInterrupted(m,{...inventory,asset_ids:[m.assets.A[0]]},{...activation,interruptedOwnershipReviewed:true}));
 const ro=interruptedInventory(m,activation);assert.match(ro,/begin read only/);assert.doesNotMatch(ro,/create function|delete from|update |insert into/);
});

test('completed-run claim needs separate state/cleanup and exact independent restoration evidence',()=>{
 const before={operator_expected_project:PROJECT,database_identity:activation.databaseIdentity,schema_digest:'a'.repeat(64),prerequisite_state:{extensions:[]}};
 const state={status:'STATE_VERIFIED',run_id:m.run_id,cases:22,rejected_writes_unchanged:true,preexisting_rows_preserved:true};
 const data={status:'DATA_CLEANED_AUTH_REMOVAL_PENDING',run_id:m.run_id};
 const objects={status:'OBJECTS_CLEANED',run_id:m.run_id,preexisting_rows_and_schema_preserved:true,baseline_rows:{'public.vb_marks':{count:2,digest:'d'.repeat(64)}}};
 const after={status:'POSTCHECK',project:PROJECT,run_id:m.run_id,database_identity:before.database_identity,schema_digest:before.schema_digest,extensions:[],preservation_rows:clone(objects.baseline_rows),owned_objects_absent:true,...Object.fromEntries(['remaining_users','remaining_identities','remaining_sessions','remaining_mfa_factors','remaining_clients','remaining_marks','remaining_memberships','remaining_audit_rows','remaining_preferences','remaining_active_connections'].map(k=>[k,0]))};
 assert.equal(verifyCompleted(m,reports,state,data,objects,after,before).signin_api_cases,22);
 for(const mutate of [x=>x.remaining_users=1,x=>x.remaining_sessions=1,x=>x.schema_digest='f'.repeat(64),x=>x.owned_objects_absent=false,x=>x.preservation_rows['public.vb_marks'].count=3]){const bad=clone(after);mutate(bad);assert.throws(()=>verifyCompleted(m,reports,state,data,objects,bad,before));}
 assert.throws(()=>verifyCompleted(m,reports,null,data,objects,after,before));assert.throws(()=>verifyCompleted(m,reports,state,{...data,status:'INTERRUPTED_DATA_CLEANED_AUTH_REMOVAL_PENDING'},objects,after,before));
});
