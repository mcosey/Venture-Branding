import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderVibeConsiderations,isVibeConsiderationsRoute,vibeMilestones} from '../free/assets/llk-vibe-coding.mjs';
import {categories,categoryTasks} from '../free/assets/llk-data.mjs';
import {atlasTasks} from '../free/assets/llk-atlas.mjs';
import {icon} from '../free/assets/llk-icons.mjs';
import {Node,mockDocument,flatten} from './fixtures/llk-dom.mjs';
test('Vibe Coding has a category overview and one satellite linking to its considerations milestone',()=>{
 const c=categories.find(c=>c.id==='contracts'),tasks=categoryTasks[c.id];
 assert.equal(c.href,undefined);assert.equal(tasks.length,1);assert.equal(atlasTasks[c.id].length,1);
 assert.equal(vibeMilestones.length,1);assert.equal(tasks[0].href,vibeMilestones[0].href);
 assert.ok(isVibeConsiderationsRoute(tasks[0].href));
 assert.equal(isVibeConsiderationsRoute('#category/contracts'),false);
});
test('the considerations page matches milestone sections without drafting tasks or inventing progress',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const main=new Node('main');renderVibeConsiderations(main);const nodes=flatten(main);
  assert.equal(nodes.find(n=>n.tag==='h1').textContent,'Considerations');
  assert.deepEqual(nodes.filter(n=>n.tag==='h2').map(n=>n.textContent),['Vibe Coding','What is this?','Milestone checklist','Resources']);
  assert.ok(nodes.some(n=>n.attrs.class==='workspace-summary'));
  assert.ok(nodes.some(n=>n.attrs.class==='milestone-layout'));
  assert.equal(nodes.some(n=>['input','textarea','form','details','progress'].includes(n.tag)),false);
  const resources=nodes.filter(n=>n.tag==='a'&&n.attrs.class==='resource');assert.equal(resources.length,2);
  for(const a of resources)assert.ok(fs.existsSync(new URL('../free/'+a.href,import.meta.url)),a.href);
  assert.ok(nodes.some(n=>n.tag==='a'&&n.href==='#category/contracts'));
 }finally{globalThis.document=previous;}
});
test('Formation milestone icons match the center building and Vibe Coding uses code icons',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const paths=id=>flatten(icon(id)).filter(n=>n.tag==='path').map(n=>n.attrs.d);
  for(const id of ['entity','founders','governance','equity','consents'])assert.deepEqual(paths(id),paths('business'));
  assert.deepEqual(paths('considerations'),paths('contracts'));
  assert.notDeepEqual(paths('contracts'),paths('business'));
 }finally{globalThis.document=previous;}
});
