import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brandMilestones,isTrademarkProtectionRoute,renderTrademarkProtection} from '../free/assets/llk-trademark.mjs';
import {categoryTasks,milestones} from '../free/assets/llk-data.mjs';
import {atlasTasks} from '../free/assets/llk-atlas.mjs';
import {icon} from '../free/assets/llk-icons.mjs';
import {Node,mockDocument,flatten} from './fixtures/llk-dom.mjs';

test('Brand Protection has one linked trademark node without borrowing Formation progress',()=>{
 assert.equal(categoryTasks.brand.length,1);assert.equal(atlasTasks.brand.length,1);
 assert.equal(brandMilestones.length,1);
 assert.equal(categoryTasks.brand[0].href,brandMilestones[0].href);
 assert.ok(isTrademarkProtectionRoute(brandMilestones[0].href));
 assert.equal(isTrademarkProtectionRoute('#category/brand'),false);
 assert.equal(categoryTasks.brand[0].id,undefined);
 assert.equal(milestones.some(m=>m.id===brandMilestones[0].id),false);
 const source=fs.readFileSync(new URL('../free/assets/llk.mjs',import.meta.url),'utf8');
 assert.ok(source.includes('if(isTrademarkProtectionRoute(location.hash)){renderTrademarkProtection(main);return;}'));
 assert.ok(source.includes('input[type=checkbox]:not([data-review-only])'));
});

test('trademark review uses expandable context and existing resources without unsupported saving',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const main=new Node('main');renderTrademarkProtection(main);const nodes=flatten(main);
  assert.equal(nodes.find(n=>n.tag==='h1').textContent,'Trademark Protection');
  assert.ok(nodes.some(n=>n.attrs.class==='workspace-summary'));
  assert.ok(nodes.some(n=>n.attrs.class==='milestone-layout'));
  const inputs=nodes.filter(n=>n.tag==='input'),details=nodes.filter(n=>n.tag==='details');
  assert.equal(inputs.length,6);assert.equal(details.length,6);
  assert.ok(inputs.every(n=>n.disabled&&n.checked===false&&n.attrs['data-review-only']==='true'));
  assert.equal(new Set(inputs.map(n=>n.id)).size,6);
  for(const input of inputs)assert.ok(nodes.some(n=>n.id===input.attrs['aria-labelledby']));
  assert.ok(details.every(n=>!n.open&&n.children[0].tag==='summary'&&n.children[1].textContent.length>0));
  assert.equal(nodes.some(n=>['textarea','form','progress'].includes(n.tag)),false);
  const resources=nodes.filter(n=>n.tag==='a'&&n.attrs.class==='resource');assert.equal(resources.length,7);
  for(const a of resources){assert.ok(fs.existsSync(new URL('../free/'+a.href,import.meta.url)),a.href);assert.equal(a.textContent.includes('↗'),false);}
  assert.ok(nodes.some(n=>n.tag==='a'&&n.href==='#category/brand'));
  const paths=id=>flatten(icon(id)).filter(n=>n.tag==='path').map(n=>n.attrs.d);
  assert.deepEqual(paths('trademarks'),paths('brand'));
 }finally{globalThis.document=previous;}
});
