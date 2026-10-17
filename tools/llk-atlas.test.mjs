import test from 'node:test';
import assert from 'node:assert/strict';
import {createMasterAtlas,atlasLayout,atlasTasks,ringPoint,atlasRoute} from '../free/assets/llk-atlas.mjs';
import {icon} from '../free/assets/llk-icons.mjs';
import {categories,categoryTasks,milestones,emptyProgress,milestoneStatus} from '../free/assets/llk-data.mjs';
// A tiny DOM stand-in verifies that the renderer builds real anchors and valid text nodes.
import {Node,mockDocument,flatten} from './fixtures/llk-dom.mjs';
export {Node,mockDocument,flatten};
export function buildAtlas(businessName=''){return createMasterAtlas({businessName,categories,categoryTasks,milestones,progress:emptyProgress(),milestoneStatus,listView:false,onToggle:()=>{},icon});}
test('single SVG renderer constructs all working links and a separate mobile list',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{const nodes=flatten(buildAtlas());const svg=nodes.filter(n=>n.tag==='svg'&&n.attrs.class==='atlas-drawing');assert.equal(svg.length,1);const paths=flatten(svg[0]).filter(n=>n.tag==='a').map(n=>n.attrs.href);assert.ok(paths.includes('#business'));for(const m of milestones)assert.equal(paths.filter(h=>h==='#milestone/'+m.id).length,1);for(const c of categories)assert.ok(paths.includes('#category/'+c.id));assert.ok(nodes.some(n=>n.attrs.class==='atlas-accessible-list'));assert.ok(nodes.some(n=>n.tag==='tspan'&&n.textContent==='Offer letters'));}
 finally{globalThis.document=previous;}
});
test('explicit label placements cover each existing task once, with room around the map',()=>{
 for(const category of categories){const c=atlasLayout[category.id],specs=atlasTasks[category.id];assert.equal(specs.length,categoryTasks[category.id].length);assert.equal(new Set(specs.map(s=>s.index)).size,specs.length);
 for(const spec of specs){assert.ok(categoryTasks[category.id][spec.index]);const p=ringPoint(c,spec.angle);const x=p.x+spec.dx,y=p.y+spec.dy;assert.ok(x>60&&x<1220);assert.ok(y>20&&y+17*(spec.lines.length-1)<890);}
 const [start,end]=atlasRoute({x:640,y:440},c,119,104);assert.ok(Math.hypot(start.x-640,start.y-440)>118);assert.ok(Math.hypot(end.x-c.x,end.y-c.y)>103);
 }
});

test('Fundraising and Ongoing Obligations milestones occupy the southern half of their rings',()=>{
 for(const id of ['fundraising','compliance'])for(const task of atlasTasks[id]){const point=ringPoint(atlasLayout[id],task.angle);assert.ok(point.y>atlasLayout[id].y);assert.ok(task.dy>0);}
});

test('every middle milestone aligns outward with the business/category connection',async()=>{
 const {atlasBusiness,outwardAxis}=await import('../free/assets/llk-atlas.mjs');
 for(const [id,specs]of Object.entries(atlasTasks)){
  const center=atlasLayout[id],axis=outwardAxis(center),offset=angle=>((angle-axis+540)%360)-180;
  const ordered=specs.slice().sort((a,b)=>offset(a.angle)-offset(b.angle));
  const middle=ordered[(ordered.length-1)/2],point=ringPoint(center,middle.angle);
  const vx=center.x-atlasBusiness.x,vy=center.y-atlasBusiness.y,wx=point.x-center.x,wy=point.y-center.y;
  assert.ok(Math.abs(vx*wy-vy*wx)<1e-7,id+' is collinear');
  assert.ok(vx*wx+vy*wy>0,id+' faces outward');
  for(let i=0;i<ordered.length;i++)assert.ok(Math.abs(offset(ordered[i].angle)+offset(ordered[ordered.length-1-i].angle))<1e-7,id+' is symmetric');
 }
});

test('connection bloom regions include positive width and height even on vertical paths',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{const regions=flatten(buildAtlas()).filter(n=>n.tag==='filter'&&n.attrs.id?.startsWith('atlas-connection-bloom-'));assert.equal(regions.length,categories.length);for(const f of regions){assert.equal(f.attrs.filterUnits,'userSpaceOnUse');assert.ok(Number(f.attrs.width)>=40);assert.ok(Number(f.attrs.height)>=40);}}
 finally{globalThis.document=previous;}
});

test('the whole business circle opens the business route by click or Enter',()=>{
 const previous={document:globalThis.document,window:globalThis.window};globalThis.document=mockDocument;globalThis.window={location:{hash:''}};
 try{const nodes=flatten(buildAtlas()),business=nodes.find(n=>n.tag==='a'&&n.attrs.href==='#business');assert.ok(business);assert.ok(flatten(business).some(n=>n.attrs.class==='business-hit-target'&&n.attrs['pointer-events']==='all'));business.events.click({button:0,preventDefault(){}});assert.equal(window.location.hash,'#business');window.location.hash='';business.events.keydown({key:'Enter',preventDefault(){}});assert.equal(window.location.hash,'#business');}
 finally{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('core fills are centered so lighting does not form a lower crescent',()=>{
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{const gradients=flatten(buildAtlas()).filter(n=>n.tag==='radialGradient'&&n.attrs.id?.startsWith('atlas-core-')&&!n.attrs.id.endsWith('-halo'));assert.equal(gradients.length,8);for(const gradient of gradients){assert.equal(gradient.attrs.cx,'50%');assert.equal(gradient.attrs.cy,'50%');assert.equal(gradient.attrs.r,'50%');}}
 finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('the saved company name replaces the center label while retaining the profile link',async()=>{
 const {companyLabel}=await import('../free/assets/llk-atlas.mjs');
 assert.deepEqual(companyLabel(''),['Your','business']);assert.deepEqual(companyLabel('Cotivate'),['Cotivate']);assert.ok(companyLabel('A very long company name that needs to fit the circle').length<=3);
 const previous=globalThis.document;globalThis.document=mockDocument;
 try{const business=flatten(buildAtlas('Cotivate')).find(n=>n.tag==='a'&&n.attrs.href==='#business');assert.ok(flatten(business).some(n=>n.tag==='tspan'&&n.textContent==='Cotivate'));assert.equal(business.attrs['aria-label'],'Cotivate — edit company profile');}
 finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
