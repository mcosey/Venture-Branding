import test from 'node:test';
import assert from 'node:assert/strict';
import {createChecklistItem} from '../free/assets/llk-checklist.mjs';
import {mockDocument,flatten} from './fixtures/llk-dom.mjs';
test('opening task context never marks the task complete or invokes the save callback',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const changes=[],toggles=[];
  const row=createChecklistItem({title:'Choose an entity.',detail:'A short explanation.',index:2,checked:false,onChange:v=>changes.push(v),onToggle:v=>toggles.push(v)});
  const nodes=flatten(row),input=nodes.find(n=>n.tag==='input'),details=nodes.find(n=>n.tag==='details'),summary=nodes.find(n=>n.tag==='summary');
  assert.equal(input.attrs['aria-labelledby'],summary.id);assert.equal(details.open,false);
  details.open=true;details.events.toggle();assert.deepEqual(toggles,[true]);assert.equal(input.checked,false);assert.deepEqual(changes,[]);
  input.checked=true;input.events.change();assert.deepEqual(changes,[true]);assert.equal(details.open,true);
  details.open=false;details.events.toggle();assert.deepEqual(toggles,[true,false]);assert.deepEqual(changes,[true]);
  const rebuilt=flatten(createChecklistItem({title:'Choose an entity.',detail:'A short explanation.',index:2,checked:true,open:true,onChange:()=>{}}));
  assert.equal(rebuilt.find(n=>n.tag==='details').open,true);assert.equal(rebuilt.find(n=>n.tag==='input').checked,true);
 }finally{globalThis.document=previous;}
});
test('milestones without task context retain their existing checkbox labels',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const changes=[],row=createChecklistItem({title:'An existing task.',index:0,checked:true,onChange:v=>changes.push(v)});
  assert.equal(row.tag,'label');assert.equal(flatten(row).some(n=>n.tag==='details'),false);
  const input=flatten(row).find(n=>n.tag==='input');input.checked=false;input.events.change();assert.deepEqual(changes,[false]);
 }finally{globalThis.document=previous;}
});
