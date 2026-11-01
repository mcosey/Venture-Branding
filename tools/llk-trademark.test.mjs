import test from 'node:test';
import assert from 'node:assert/strict';
import {brandMilestones,isTrademarkProtectionRoute} from '../free/assets/llk-trademark.mjs';
import {categoryTasks,savedMilestones} from '../free/assets/llk-data.mjs';
import {atlasTasks} from '../free/assets/llk-atlas.mjs';
import {icon} from '../free/assets/llk-icons.mjs';
import {mockDocument,flatten} from './fixtures/llk-dom.mjs';

test('Brand Protection has one saved trademark milestone with matching shield icons',()=>{
 assert.equal(categoryTasks.brand.length,1);assert.equal(atlasTasks.brand.length,1);
 assert.equal(brandMilestones.length,1);
 const task=categoryTasks.brand[0];
 assert.equal(task.href,brandMilestones[0].href);assert.equal(task.id,brandMilestones[0].id);
 assert.ok(savedMilestones.includes(brandMilestones[0]));
 assert.ok(isTrademarkProtectionRoute(task.href));assert.equal(isTrademarkProtectionRoute('#category/brand'),false);
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{
  const paths=id=>flatten(icon(id)).filter(n=>n.tag==='path').map(n=>n.attrs.d);
  assert.deepEqual(paths('trademarks'),paths('brand'));
 }finally{globalThis.document=previous;}
});
