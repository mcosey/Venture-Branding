import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraftStore} from '../attorney/preflight/draft-store.mjs';
test('save uses immutable association and advances only after success',async()=>{
 const calls=[];let revision=0;
 const db={async rpc(name,args){calls.push({name,args});return {data:{id:'draft',revision:++revision}};}};
 const store=createDraftStore(db,'client','mark');
 await store.save({mark:'FIRST'});await store.save({mark:'SECOND'});
 assert.equal(calls[0].args.expected_revision,0);assert.equal(calls[1].args.expected_revision,1);
 assert.equal(calls[1].args.target_draft,'draft');assert.equal(calls[1].args.target_client,'client');assert.equal(calls[1].args.target_mark,'mark');
});
for (const conflictCode of ['PT409','40001']) test(`conflict ${conflictCode} never advances local revision or silently retries`,async()=>{
 let count=0;const calls=[];
 const store=createDraftStore({async rpc(n,a){calls.push(a);return ++count===1?{data:{id:'draft',revision:1}}:{error:{code:conflictCode}};}},'client','mark');
 await store.save({});await assert.rejects(store.save({}));await assert.rejects(store.save({}));
 assert.equal(calls[2].expected_revision,1);assert.equal(calls.length,3);
});
test('edits during save cannot mutate the saved snapshot',async()=>{
 let finish;const store=createDraftStore({rpc(){return new Promise(r=>finish=r);}},'c','m');
 const input={owner:{name:'Original'}};const pending=store.save(input);input.owner.name='Changed';finish({data:{id:'d',revision:1}});
 assert.equal((await pending).input.owner.name,'Original');
});
test('concurrent save is rejected rather than creating duplicate drafts',async()=>{
 let finish;let calls=0;
 const store=createDraftStore({rpc(){calls++;return new Promise(r=>finish=r);}},'c','m');
 const first=store.save({});await assert.rejects(store.save({}),/still finishing/);
 finish({data:{id:'d',revision:1}});await first;assert.equal(calls,1);
});
test('review requires a saved version and sends that exact revision',async()=>{
 const calls=[];const store=createDraftStore({async rpc(name,args){calls.push({name,args});return {data:name==='vb_save_filing_draft'?{id:'d',revision:4}:{id:'event'}};}},'c','m');
 await assert.rejects(store.review('check',{}),/Save the draft/);
 await store.save({mark:'ABC'});await store.review('transfer_approval',{check_id:'check'});
 assert.equal(calls[1].args.expected_revision,4);assert.equal(calls[1].args.target_draft,'d');
});
function queryDatabase(tables) {
 const calls=[];
 return {calls,from(table){
  const filters=[];calls.push({table,filters});
  const query={select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},single(){return Promise.resolve(tables[table]);},then(resolve,reject){return Promise.resolve(tables[table]).then(resolve,reject);}};
  return query;
 }};
}
test('reopen loads exact saved snapshot with client and mark filters',async()=>{
 const db=queryDatabase({vb_filing_drafts:{data:{id:'d',revision:7}},vb_filing_revisions:{data:{input:{mark:'SAVED'},revision:7}},vb_filing_reviews:{data:[]}});
 const store=createDraftStore(db,'c','m');const reopened=await store.load('d');
 assert.equal(reopened.input.mark,'SAVED');assert.deepEqual(db.calls[0].filters,[['id','d'],['client_id','c'],['mark_id','m']]);
 assert.deepEqual(db.calls[1].filters,[['draft_id','d'],['revision',7]]);
 await store.history();assert.deepEqual(db.calls[2].filters,[['draft_id','d']]);
});
test('failed reopen cannot replace the current saved revision',async()=>{
 const db=queryDatabase({vb_filing_drafts:{error:{message:'Denied'}}});const args=[];
 db.rpc=async(n,a)=>{args.push(a);return {data:{id:'original',revision:2}};};
 const store=createDraftStore(db,'c','m');await store.save({});await assert.rejects(store.load('other'));await store.review('check',{});
 assert.equal(args[1].target_draft,'original');assert.equal(args[1].expected_revision,2);
});
