import test from 'node:test';
import assert from 'node:assert/strict';
import {isVibeConsiderationsRoute,vibeMilestones} from '../free/assets/llk-vibe-coding.mjs';
import {websiteBasics,renderWebsiteBasics} from '../free/assets/llk-website.mjs';
import {categories,categoryTasks,savedMilestones} from '../free/assets/llk-data.mjs';
import {atlasTasks} from '../free/assets/llk-atlas.mjs';
import {icon} from '../free/assets/llk-icons.mjs';
import {Node,mockDocument,flatten} from './fixtures/llk-dom.mjs';
test('Web & App links to Vibe Coding and Website Basics without changing saved progress IDs',()=>{
 const c=categories.find(c=>c.id==='contracts'),tasks=categoryTasks[c.id];
 assert.equal(c.name,'Web & App');assert.equal(c.href,undefined);assert.equal(tasks.length,2);assert.equal(atlasTasks[c.id].length,2);
 assert.equal(vibeMilestones.length,1);assert.equal(tasks[0].href,vibeMilestones[0].href);
 assert.ok(isVibeConsiderationsRoute(tasks[0].href));assert.equal(vibeMilestones[0].name,'Vibe Coding');assert.equal(vibeMilestones[0].id,'considerations');
 assert.equal(tasks[1].href,websiteBasics.href);assert.ok(!savedMilestones.includes(websiteBasics));
 assert.equal(isVibeConsiderationsRoute('#category/contracts'),false);
});
test('Formation milestone icons match the center building and Vibe Coding uses code icons',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const paths=id=>flatten(icon(id)).filter(n=>n.tag==='path').map(n=>n.attrs.d);
  for(const id of ['entity','founders','governance','equity','consents'])assert.deepEqual(paths(id),paths('business'));
  assert.deepEqual(paths('website-basics'),paths('contracts'));
  assert.notDeepEqual(paths('considerations'),paths('contracts'));
  assert.notDeepEqual(paths('contracts'),paths('business'));
 }finally{globalThis.document=previous;}
});


test('Website Basics provides four context sections and a return link without unfinished saving controls',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{const main=new Node('main');renderWebsiteBasics(main);const nodes=flatten(main);
 assert.ok(nodes.some(n=>n.tag==='h1'&&n.textContent==='Website Basics'));
 assert.ok(nodes.some(n=>n.tag==='a'&&n.href==='#category/contracts'));
 for(const topic of ['Accessibility','Terms of Service','Privacy Policy','Cookies and tracking'])assert.ok(nodes.some(n=>n.tag==='h2'&&n.textContent===topic));
 assert.ok(!nodes.some(n=>n.tag==='input'||n.tag==='textarea'||n.tag==='progress'));
 }finally{globalThis.document=previous;}
});
