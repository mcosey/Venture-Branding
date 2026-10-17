import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountProgressStore,mergeBrowserProgress,readAccountProgress} from '../free/assets/llk-progress-store.mjs';
import {emptyProgress} from '../free/assets/llk-data.mjs';
function fixture(){
 const rows=new Map(),calls=[],states=[];let failure=false,counter=0;
 const db={from:()=>({select:()=>({eq:async(_,company)=>({data:[...rows.values()].filter(row=>row.company_id===company)})})}),rpc:async(name,args)=>{
  if(name==='vb_account_access')return {data:'member'};
  calls.push(args);if(failure)return {error:{code:'NETWORK'}};
  const old=rows.get(args.milestone);
  if(old&&old.updated_at!==args.expected_updated_at)return {error:{code:'40001'}};
  const updated_at='revision-'+(++counter);rows.set(args.milestone,{company_id:args.company,milestone_id:args.milestone,progress:args.details,updated_at});return {data:updated_at};
 }};
 const store=createAccountProgressStore({db,companyId:'own-company',onState:state=>states.push(state),delay:10000});
 return {db,store,rows,calls,states,setFailure:value=>{failure=value;}};
}
test('account save and fresh session load retain checkmarks and notes',async()=>{
 const f=fixture(),progress=await f.store.load();progress.tasks.entity=[true,false,false,false];progress.notes.entity='Questions for counsel';
 f.store.queue('entity',progress);assert.equal(f.store.state,'saving');await f.store.flush();assert.equal(f.store.state,'saved');
 const other=createAccountProgressStore({db:f.db,companyId:'own-company'});const loaded=await other.load();assert.equal(loaded.tasks.entity[0],true);assert.equal(loaded.notes.entity,'Questions for counsel');
});
test('rapid notes are coalesced and the latest text is saved',async()=>{
 const f=fixture(),progress=await f.store.load();
 for(let i=0;i<20;i++){progress.notes.entity='Draft '+i;f.store.queue('entity',progress);}
 await f.store.flush();assert.equal(f.calls.length,1);assert.equal(f.rows.get('entity').progress.notes,'Draft 19');
});
test('failed saves retain pending work and become saved only after explicit retry succeeds',async()=>{
 const f=fixture(),progress=await f.store.load();f.setFailure(true);progress.notes.entity='Unsaved note';f.store.queue('entity',progress);assert.equal(await f.store.flush(),false);
 assert.equal(f.store.state,'error');assert.equal(f.store.hasPending,true);assert.equal(f.rows.size,0);
 f.setFailure(false);await f.store.retry();assert.equal(f.store.state,'saved');assert.equal(f.rows.get('entity').progress.notes,'Unsaved note');
});
test('stale tab cannot overwrite newer progress and must explicitly reload',async()=>{
 const f=fixture(),progress=await f.store.load();progress.notes.entity='First';f.store.queue('entity',progress);await f.store.flush();
 const stale=createAccountProgressStore({db:f.db,companyId:'own-company'}),staleProgress=await stale.load();
 progress.notes.entity='Newer device';f.store.queue('entity',progress);await f.store.flush();
 staleProgress.notes.entity='Older device';stale.queue('entity',staleProgress);await stale.flush();assert.equal(stale.state,'conflict');
 assert.equal(f.rows.get('entity').progress.notes,'Newer device');assert.equal(await stale.retry(),false);assert.equal((await stale.load()).notes.entity,'Newer device');
});
test('load failure cannot create blank progress writes',async()=>{
 const f=fixture();f.db.from=()=>({select:()=>({eq:async()=>({error:{code:'NETWORK'}})})});
 await assert.rejects(f.store.load());assert.equal(f.store.state,'load-error');assert.throws(()=>f.store.queue('entity',emptyProgress()));assert.equal(f.calls.length,0);
});
test('unexpected account scope or malformed rows fail closed',()=>{
 assert.throws(()=>readAccountProgress([{company_id:'another-company',milestone_id:'entity'}],'own-company'));
 assert.throws(()=>readAccountProgress([{company_id:'own-company',milestone_id:'entity',progress:{version:2},updated_at:'token'}],'own-company'));
});
test('explicit import keeps account checkmarks and existing account notes',()=>{
 const account=emptyProgress(),browser=emptyProgress();account.tasks.entity=[true,false,false,false];account.notes.entity='Account note';browser.tasks.entity=[false,true,false,false];browser.notes.entity='Browser note';browser.notes.founders='Another question';
 const merged=mergeBrowserProgress(account,browser);assert.deepEqual(merged.tasks.entity,[true,true,false,false]);assert.equal(merged.notes.entity,'Account note');assert.equal(merged.notes.founders,'Another question');assert.equal(account.tasks.entity[1],false);
});
test('reset saves empty progress and persists across another session',async()=>{
 const f=fixture(),progress=await f.store.load();progress.notes.entity='Question';progress.tasks.entity=[true,true,true,true];f.store.queue('entity',progress);await f.store.flush();
 f.store.queue('entity',emptyProgress());await f.store.flush();const restored=await f.store.load();assert.equal(restored.notes.entity,'');assert.equal(restored.tasks.entity.some(Boolean),false);
});
