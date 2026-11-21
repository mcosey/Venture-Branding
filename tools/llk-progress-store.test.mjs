import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountProgressStore,mergeBrowserProgress,readAccountProgress} from '../free/assets/llk-progress-store.mjs';
import {emptyProgress,milestones,milestoneStatus,taskProgressIndex} from '../free/assets/llk-data.mjs';
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
 const merged=mergeBrowserProgress(account,browser);assert.deepEqual(merged.tasks.entity.slice(0,4),[true,true,false,false]);assert.ok(merged.tasks.entity.slice(4).every(value=>value===false));assert.equal(merged.notes.entity,'Account note');assert.equal(merged.notes.founders,'Another question');assert.equal(account.tasks.entity[1],false);
});
for(const id of ['entity','governance'])test('revised '+id+' checklist preserves legacy progress and notes without inventing new completion',async()=>{
 const f=fixture(),m=milestones.find(m=>m.id===id);
 f.rows.set(id,{company_id:'own-company',milestone_id:id,progress:{version:1,tasks:[true,true,true,true],notes:'Existing planning note'},updated_at:'legacy-revision'});
 const progress=await f.store.load();assert.equal(milestoneStatus(progress,m).done,0);
 assert.deepEqual(progress.tasks[id].slice(0,4),[true,true,true,true]);assert.equal(progress.notes[id],'Existing planning note');
 progress.tasks[id][taskProgressIndex(m,m.tasks.length-1)]=true;f.store.queue(id,progress);assert.equal(await f.store.flush(),true);
 const restored=await createAccountProgressStore({db:f.db,companyId:'own-company'}).load();
 assert.equal(milestoneStatus(restored,m).done,1);assert.equal(milestoneStatus(restored,m).total,m.tasks.length);
 assert.deepEqual(restored.tasks[id].slice(0,4),[true,true,true,true]);assert.equal(restored.notes[id],'Existing planning note');
});
test('reset saves empty progress and persists across another session',async()=>{
 const f=fixture(),progress=await f.store.load();progress.notes.entity='Question';progress.tasks.entity=[true,true,true,true];f.store.queue('entity',progress);await f.store.flush();
 f.store.queue('entity',emptyProgress());await f.store.flush();const restored=await f.store.load();assert.equal(restored.notes.entity,'');assert.equal(restored.tasks.entity.some(Boolean),false);
});

for(const id of ['trademarks','considerations']){
 test(id+' saves independently, survives a fresh account session and can be unchecked or reset',async()=>{
  const f=fixture(),progress=await f.store.load();progress.tasks.entity[4]=true;progress.notes.entity='Preserve Formation';f.store.queue('entity',progress);await f.store.flush();
  const formation=structuredClone(f.rows.get('entity'));
  const m=(await import('../free/assets/llk-data.mjs')).savedMilestones.find(m=>m.id===id);
  progress.tasks[id]=m.tasks.map(()=>true);f.store.queue(id,progress);assert.equal(await f.store.flush(),true);
  const other=createAccountProgressStore({db:f.db,companyId:'own-company'}),restored=await other.load();
  assert.deepEqual(restored.tasks[id],m.tasks.map(()=>true));assert.equal(milestoneStatus(restored,m).label,'Completed');
  restored.tasks[id][0]=false;other.queue(id,restored);assert.equal(await other.flush(),true);
  const loaded=await f.store.load();assert.equal(loaded.tasks[id][0],false);assert.equal(milestoneStatus(loaded,m).label,'In progress');
  f.store.queue(id,emptyProgress());assert.equal(await f.store.flush(),true);
  assert.equal((await other.load()).tasks[id].some(Boolean),false);assert.deepEqual(f.rows.get('entity'),formation);
 });
 test(id+' retains failed saves for retry and refuses an older session overwrite',async()=>{
  const f=fixture(),progress=await f.store.load();f.setFailure(true);progress.tasks[id][0]=true;
  f.store.queue(id,progress);assert.equal(await f.store.flush(),false);assert.equal(f.store.state,'error');assert.equal(f.rows.size,0);
  f.setFailure(false);assert.equal(await f.store.retry(),true);
  const stale=createAccountProgressStore({db:f.db,companyId:'own-company'}),old=await stale.load();
  progress.tasks[id][1]=true;f.store.queue(id,progress);assert.equal(await f.store.flush(),true);
  old.tasks[id][0]=false;stale.queue(id,old);assert.equal(await stale.flush(),false);assert.equal(stale.state,'conflict');
  assert.deepEqual((await f.store.load()).tasks[id].slice(0,2),[true,true]);
 });
}
test('new milestone browser imports preserve existing account completion without crossing milestone IDs',()=>{
 const account=emptyProgress(),browser=emptyProgress();account.tasks.trademarks=[true,false];browser.tasks.trademarks=[false,true];browser.tasks.considerations=[true,false];
 const merged=mergeBrowserProgress(account,browser);assert.deepEqual(merged.tasks.trademarks,[true,true,false,false,false,false]);
 assert.deepEqual(merged.tasks.considerations,[true,false]);assert.equal(merged.tasks.entity.some(Boolean),false);
});

test('Initial Steps maps retained legacy checkboxes without counting removed items or completing new resolutions',()=>{
 const m=milestones.find(m=>m.id==='consents');
 assert.equal(milestones.some(m=>m.id==='equity'),false);
 const retained=[['equity',3,4],['consents',3,5]];
 for(const [id,oldIndex,newIndex]of retained){
  const old={version:1,tasks:{consents:[false,false,false,false],equity:[false,false,false,false]},notes:{}};
  old.tasks[id][oldIndex]=true;
  const {progress}=readAccountProgress(Object.entries(old.tasks).map(([milestone_id,tasks])=>({company_id:'own-company',milestone_id,progress:{version:1,tasks,notes:''},updated_at:'legacy-'+milestone_id})),'own-company');
  assert.equal(milestoneStatus(progress,m).done,1,id+':'+oldIndex);
  m.tasks.forEach((_,i)=>assert.equal(progress.tasks.consents[taskProgressIndex(m,i)],i===newIndex));
 }
 const removed=readAccountProgress([
  {company_id:'own-company',milestone_id:'consents',progress:{version:1,tasks:[true,true,true,false],notes:''},updated_at:'c'},
  {company_id:'own-company',milestone_id:'equity',progress:{version:1,tasks:[true,true,true,false],notes:''},updated_at:'e'}
 ],'own-company').progress;
 assert.equal(milestoneStatus(removed,m).done,0);
});

test('combined checklist saves and reloads unchecked ownership tasks without resurrecting legacy checks',async()=>{
 const f=fixture(),m=milestones.find(m=>m.id==='consents');
 const oldRow=(id,tasks,notes)=>({company_id:'own-company',milestone_id:id,progress:{version:1,tasks,notes},updated_at:'legacy-'+id});
 f.rows.set('equity',oldRow('equity',[true,true,true,true],'Existing equity note'));
 f.rows.set('consents',oldRow('consents',[true,true,true,true],'Existing decision note'));
 const originalEquity=structuredClone(f.rows.get('equity'));
 const progress=await f.store.load();assert.equal(f.calls.length,0);assert.equal(milestoneStatus(progress,m).done,2);
 progress.tasks.consents[taskProgressIndex(m,4)]=false;
 f.store.queue('consents',progress);assert.equal(await f.store.flush(),true);
 assert.equal(f.calls[0].expected_updated_at,'legacy-consents');
 const fresh=createAccountProgressStore({db:f.db,companyId:'own-company'}),restored=await fresh.load();
 assert.equal(milestoneStatus(restored,m).done,1);
 assert.equal(restored.tasks.consents[taskProgressIndex(m,4)],false);
 assert.equal(restored.notes.consents,'Existing decision note');
 assert.equal(restored.notes.equity,'Existing equity note');
 assert.deepEqual(f.rows.get('equity'),originalEquity);
 fresh.queue('consents',emptyProgress());assert.equal(await fresh.flush(),true);
 assert.equal(milestoneStatus(await f.store.load(),m).done,0);
});

test('combined checklist browser import retains legacy ownership progress and respects later unchecks',()=>{
 const m=milestones.find(m=>m.id==='consents'),browser=emptyProgress();
 browser.tasks.equity=[true,true,true,true];browser.notes.equity='Legacy note';
 const merged=mergeBrowserProgress(emptyProgress(),browser);
 assert.equal(milestoneStatus(merged,m).done,1);assert.equal(merged.notes.equity,'Legacy note');
 merged.tasks.consents[taskProgressIndex(m,4)]=false;
 const restored=readAccountProgress(Object.entries(merged.tasks).map(([milestone_id,tasks])=>({company_id:'own-company',milestone_id,progress:{version:1,tasks,notes:merged.notes[milestone_id]||''},updated_at:'saved-'+milestone_id})),'own-company').progress;
 assert.equal(milestoneStatus(restored,m).done,0);
 assert.equal(restored.tasks.consents[taskProgressIndex(m,4)],false);
});

test('Founder and Governing Documents cuts preserve later checkmarks without reusing removed slots',()=>{
 for(const [id,removed,retained]of [['founders',[14,15],[16,17,18]],['governance',[10],[11]]]){
  const m=milestones.find(m=>m.id===id),tasks=Array(taskProgressIndex(m,m.tasks.length)).fill(false);
  removed.forEach(i=>{tasks[i]=true;});
  const row={company_id:'own-company',milestone_id:id,progress:{version:1,tasks,notes:'Existing note'},updated_at:'legacy'};
  let progress=readAccountProgress([row],'own-company').progress;
  assert.equal(milestoneStatus(progress,m).done,0);
  retained.forEach(i=>{tasks[i]=true;});
  progress=readAccountProgress([row],'own-company').progress;
  assert.equal(milestoneStatus(progress,m).done,retained.length);
  assert.equal(progress.notes[id],'Existing note');
  assert.equal(progress.tasks[id][taskProgressIndex(m,m.tasks.length-1)],true);
 }
});

test('entity choices move to Initial Steps without counting removed tasks or reviving later unchecks',async()=>{
 const entity=milestones.find(m=>m.id==='entity'),steps=milestones.find(m=>m.id==='consents');
 for(let i=0;i<3;i++){
  const f=fixture(),tasks=Array(12).fill(false);tasks[4+i]=true;tasks[9]=true;tasks[11]=true;
  const row={company_id:'own-company',milestone_id:'entity',progress:{version:1,tasks,notes:'Preserve entity notes'},updated_at:'entity-legacy'};
  f.rows.set('entity',structuredClone(row));
  const progress=await f.store.load();
  assert.equal(f.calls.length,0);assert.equal(milestoneStatus(progress,entity).done,0);
  assert.equal(milestoneStatus(progress,steps).done,1);
  assert.equal(progress.tasks.consents[taskProgressIndex(steps,i)],true);
  assert.equal(progress.tasks.consents[taskProgressIndex(steps,3)],false);
  progress.tasks.consents[taskProgressIndex(steps,i)]=false;
  f.store.queue('consents',progress);assert.equal(await f.store.flush(),true);
  const restored=await createAccountProgressStore({db:f.db,companyId:'own-company'}).load();
  assert.equal(milestoneStatus(restored,steps).done,0);
  assert.deepEqual(f.rows.get('entity'),row);
 }
 const retained=readAccountProgress([{company_id:'own-company',milestone_id:'entity',progress:{version:1,tasks:[false,false,false,false,false,false,false,true,true,false,true,false],notes:''},updated_at:'entity-retained'}],'own-company').progress;
 assert.equal(milestoneStatus(retained,entity).done,3);assert.equal(milestoneStatus(retained,steps).done,0);
});
