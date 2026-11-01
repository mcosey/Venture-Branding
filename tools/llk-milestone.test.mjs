import test from 'node:test';
import assert from 'node:assert/strict';
import {savedMilestones,emptyProgress,taskProgressIndex,milestoneStatus} from '../free/assets/llk-data.mjs';
import {renderSavedMilestone} from '../free/assets/llk-milestone.mjs';
import {Node,mockDocument,flatten} from './fixtures/llk-dom.mjs';

test('every working checklist uses the same enabled controls, progress summary and category breadcrumb',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  for(const m of savedMilestones){
   const main=new Node('main'),progress=emptyProgress(),changed=[],expandedTasks=new Set();
   renderSavedMilestone(main,{milestone:m,progress,accountBacked:true,expandedTasks,onCheck:(...args)=>changed.push(args),onNotes:()=>{}});
   const nodes=flatten(main),inputs=nodes.filter(n=>n.tag==='input');
   assert.equal(inputs.length,m.tasks.length);assert.ok(inputs.every(n=>!n.disabled&&!n.checked));
   const firstDisclosure=nodes.find(n=>n.tag==='details');
   if(firstDisclosure){firstDisclosure.open=true;firstDisclosure.events.toggle();assert.equal(changed.length,0);assert.ok(expandedTasks.has(m.id+':0'));}
   inputs[0].checked=true;inputs[0].events.change();
   assert.deepEqual(changed,[[m.id,0]]);assert.equal(progress.tasks[m.id][taskProgressIndex(m,0)],true);
   const restored=new Node('main');renderSavedMilestone(restored,{milestone:m,progress,accountBacked:true,expandedTasks,onCheck:()=>{},onNotes:()=>{}});
   const fresh=flatten(restored);assert.equal(fresh.find(n=>n.tag==='input').checked,true);
   assert.equal(fresh.find(n=>n.tag==='progress').value,1);
   assert.ok(fresh.some(n=>n.tag==='a'&&n.href==='#category/'+(m.categoryId||'formation')));
   if(firstDisclosure)assert.equal(fresh.find(n=>n.tag==='details').open,true);
   assert.equal(milestoneStatus(progress,m).done,1);
   assert.equal(fresh.filter(n=>n.tag==='a'&&n.attrs.class==='resource').length,m.resources.length);
   assert.equal(fresh.some(n=>n.tag==='textarea'),m.planner!==false);
  }
 }finally{globalThis.document=previous;}
});
