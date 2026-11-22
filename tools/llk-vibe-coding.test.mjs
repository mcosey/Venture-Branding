import test from 'node:test';
import assert from 'node:assert/strict';
import {isVibeConsiderationsRoute,vibeMilestones,renderVibeCoding} from '../free/assets/llk-vibe-coding.mjs';
import {websiteBasics,renderWebsiteBasics} from '../free/assets/llk-website.mjs';
import {categories,categoryTasks,savedMilestones} from '../free/assets/llk-data.mjs';
import {atlasTasks} from '../free/assets/llk-atlas.mjs';
import {icon} from '../free/assets/llk-icons.mjs';
import {Node,mockDocument,flatten} from './fixtures/llk-dom.mjs';
test('Web & App links to both reading guides without registering them for saved progress',()=>{
 const c=categories.find(c=>c.id==='contracts'),tasks=categoryTasks[c.id];
 assert.equal(c.name,'Web & App');assert.equal(c.href,undefined);assert.equal(tasks.length,2);assert.equal(atlasTasks[c.id].length,2);
 assert.equal(vibeMilestones.length,1);assert.equal(tasks[0].href,vibeMilestones[0].href);
 assert.ok(isVibeConsiderationsRoute(tasks[0].href));assert.equal(vibeMilestones[0].name,'Vibe Coding');assert.equal(vibeMilestones[0].id,'considerations');
 assert.equal(tasks[1].href,websiteBasics.href);assert.ok(!savedMilestones.includes(websiteBasics));
 assert.ok(!savedMilestones.includes(vibeMilestones[0]));assert.ok(isVibeConsiderationsRoute('#milestone/considerations'));
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


test('Website Basics provides four expandable considerations and a resource without unfinished saving controls',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{const main=new Node('main');renderWebsiteBasics(main);const nodes=flatten(main);
 assert.ok(nodes.some(n=>n.tag==='h1'&&n.textContent==='Website Basics'));
 assert.ok(nodes.some(n=>n.tag==='a'&&n.href==='#category/contracts'));
 assert.ok(nodes.some(n=>n.tag==='h2'&&n.textContent==='Website Considerations'));
 for(const topic of ['Accessibility','Terms of Service','Privacy Policy','Cookies and tracking'])assert.ok(nodes.some(n=>n.tag==='summary'&&n.textContent===topic));
 assert.equal(nodes.filter(n=>n.tag==='details').length,4);
 assert.ok(nodes.filter(n=>n.tag==='details').every(n=>n.children.some(child=>child.tag==='p'&&child.textContent.length>100)));
 assert.ok(nodes.some(n=>n.tag==='a'&&n.href==='../blog/posts/the-legal-risks-of-vibe-coding.html'));
 assert.ok(!nodes.some(n=>n.tag==='input'||n.tag==='textarea'||n.tag==='progress'));
 }finally{globalThis.document=previous;}
});

test('Vibe Coding presents ten expandable considerations without completion or saving controls',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const main=new Node('main');renderVibeCoding(main);
  const nodes=flatten(main);
  assert.ok(nodes.some(n=>n.tag==='h2'&&n.textContent==='Vibe Coding Considerations'));
  assert.equal(nodes.filter(n=>n.tag==='details').length,10);
  assert.ok(!nodes.some(n=>n.tag==='input'||n.tag==='textarea'||n.tag==='progress'||n.tag==='button'));
  assert.ok(!nodes.some(n=>n.textContent==='Milestone checklist'||n.textContent==='Questions for counsel'));
  assert.ok(!nodes.some(n=>n.tag==='a'&&n.href.includes('calendly')));
 }finally{globalThis.document=previous;}
});
