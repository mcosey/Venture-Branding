import test from 'node:test';
import assert from 'node:assert/strict';
import {MAINTENANCE_ENABLED,createMaintenanceRepository,loadMaintenancePublications} from '../auth/maintenance.mjs';
const scope={clientId:'c1',markId:'m1'};
const details={description:'Filing',windowStart:'2026-10-01',windowEnd:'2027-03-31',deadline:'2027-03-31',nextStep:'Discuss use.',status:'Upcoming',source:'PRIVATE'};
function database({role='staff',aal='aal2',user=true,reply}={}){
 const calls=[];
 return {
  calls,
  auth:{getUser:async()=>({data:{user:user?{id:'user'}:null}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal,nextLevel:role==='staff'?'aal2':aal}})}},
  rpc:async(name,args)=>{calls.push({name,args});return name==='vb_session_role'?{data:role}:reply?reply(name,args):{data:[]};},
  from(name){
   calls.push({table:name});
   return {
    select(columns){calls.push({columns});return this},
    eq(field,value){calls.push({field,value});return this},
    is(){return this},
    order(){return Promise.resolve({data:[{id:'one',client_id:'c1',mark_id:'m1',description:'Public',deadline:'2027-03-31',source:'PRIVATE'},{id:'other',client_id:'c2',mark_id:'m2'}],error:null})}
   };
  }
 };
}
test('maintenance activation is on; explicit disabled mode issues no maintenance queries',async()=>{assert.equal(MAINTENANCE_ENABLED,true);const db=database();assert.equal(createMaintenanceRepository(db,{enabled:false}),null);assert.deepEqual(await loadMaintenancePublications(db,'c1',{enabled:false}),{connected:false,records:[]});assert.deepEqual(db.calls,[]);});
test('every staff mutation uses the latest server version; source stays out of client projection',async()=>{let version=0;const published={...details,verifiedAt:'2026-10-09T12:00:00Z'};const db=database({reply(name,args){if(name==='vb_list_maintenance_drafts')return {data:[]};assert.equal(args.expected_version,version);version++;return {data:{id:'entry',version,revision:1,draft:details,published:name==='vb_publish_maintenance'?published:null}}}});const repo=createMaintenanceRepository(db,{enabled:true});await repo.list(scope);await repo.save(scope,null,details);await repo.publish(scope,'entry',true);assert(!JSON.stringify(repo.clientView(scope,'entry')).includes('PRIVATE'));await repo.withdraw(scope,'entry');assert.equal(repo.clientView(scope,'entry'),null);assert.deepEqual(db.calls.filter(c=>c.args).map(c=>c.args.expected_version).filter(v=>v!==undefined),[0,1,2]);});
test('clients, unsigned users and staff without MFA cannot invoke maintenance RPCs',async()=>{for(const options of [{role:'client',aal:'aal1'},{aal:'aal1'},{user:false}]){const db=database(options),repo=createMaintenanceRepository(db,{enabled:true});await assert.rejects(()=>repo.list(scope));assert(!db.calls.some(c=>c.name==='vb_list_maintenance_drafts'));}});
test('failed saves and stale publications do not replace cached version or public copy',async()=>{let fail=false;const db=database({reply(name){if(fail)return {error:{code:'40001'}};return {data:name==='vb_list_maintenance_drafts'?[{id:'entry',version:7,revision:2,draft:details,published:{...details,verifiedAt:'today'}}]:null};}});const repo=createMaintenanceRepository(db,{enabled:true});await repo.list(scope);fail=true;await assert.rejects(()=>repo.save(scope,'entry',details),/another window/);await assert.rejects(()=>repo.publish(scope,'entry',true),/another window/);assert.equal(repo.clientView(scope,'entry').description,'Filing');assert(db.calls.filter(c=>c.args?.target_entry).every(c=>c.args.expected_version===7));});
test('client read uses a field whitelist and filters client ownership defensively',async()=>{const db=database({role:'client',aal:'aal1'}),result=await loadMaintenancePublications(db,'c1',{enabled:true});assert.equal(result.records.length,1);assert(!JSON.stringify(result).includes('PRIVATE'));assert(!db.calls.find(c=>c.columns).columns.includes('source'));assert(db.calls.some(c=>c.table==='vb_maintenance_publications'));});
test('sign-out clearing rejects late reads and removes cached versions',async()=>{let complete;const db=database({reply:()=>new Promise(resolve=>complete=resolve)}),repo=createMaintenanceRepository(db,{enabled:true});const pending=repo.list(scope);await new Promise(resolve=>setImmediate(resolve));repo.clear();complete({data:[]});await assert.rejects(()=>pending,/session has ended/);await assert.rejects(()=>repo.publish(scope,'entry',true),/reopen/);});
