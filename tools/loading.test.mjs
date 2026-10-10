import test from 'node:test';
import assert from 'node:assert/strict';
import {setupGate} from '../auth/gate.mjs';
import {brandMapSkeleton} from '../shared/loading.mjs';
import {readFileSync} from 'node:fs';
function fixture(layout){
 const node=()=>({dataset:{},children:[],attributes:{},addEventListener(){},before(n){this.announcement=n;},removeAttribute(k){delete this.attributes[k];},setAttribute(k,v){this.attributes[k]=v;},replaceChildren(...nodes){this.children=nodes;},append(...nodes){this.children.push(...nodes);}});
 const gate=node();if(layout)gate.dataset.loadingLayout=layout;const area=node();let auth;
 globalThis.document={querySelector:()=>gate,querySelectorAll:s=>s==='[data-connected]'?[area]:[],createElement:tag=>{const n=node();if(tag==='template')n.content=node();return n;}};
 const api=setupGate({auth:{onAuthStateChange:fn=>auth=fn}},'client');return {api,gate,area,signout:()=>auth('SIGNED_OUT')};
}
test('normal loading has no failure actions; errors retain sign-in and retry',()=>{
 const {api,gate,area}=fixture();const ticket=api.lock();assert.equal(area.hidden,true);assert.equal(gate.attributes['aria-busy'],'true');assert.equal(gate.children.length,1);
 api.unlock(ticket);assert.equal(area.hidden,false);assert.equal(gate.hidden,true);
 api.lock('Unable to load records.');assert.equal(gate.children.length,3);assert.equal(gate.attributes['aria-busy'],'false');assert.equal(area.hidden,true);
});
test('sign-out and newer requests invalidate earlier unlocks',()=>{
 const {api,area,signout}=fixture('brand-map');const first=api.lock();const second=api.lock();assert.equal(api.unlock(first),false);assert.equal(area.hidden,true);signout();assert.equal(api.current(second),false);assert.equal(api.unlock(second),false);assert.equal(area.hidden,true);
});
test('Brand Map loading restores after error without exposing protected areas',()=>{
 const {api,gate,area}=fixture('brand-map');api.lock('Denied');assert.equal(gate.dataset.loadingLayout,undefined);api.lock();assert.equal(gate.dataset.loadingLayout,'brand-map');assert.equal(gate.children[0].textContent,'Loading Brand Map…');assert.equal(area.hidden,true);
});
test('initial HTML fallback matches shared renderer and contains only decorative placeholders',()=>{
 const skeleton=brandMapSkeleton();const html=readFileSync(new URL('../portal.html',import.meta.url),'utf8');assert(html.includes(skeleton));assert(skeleton.includes('aria-hidden="true"'));assert(!/<(?:button|input|a)[\s>]/.test(skeleton));
});

test('each portal entry ships its destination skeleton with no interactive or private content',async()=>{
 const {pageSkeleton,loadingLabels}=await import('../shared/loading.mjs');
 const files=['portfolio','trademark','account','new-mark','automations','brand-monitor','trademark-watch','watch','watch-finding','use-history','maintenance'];
 for(const file of files){
  const html=readFileSync(new URL('../'+file+'.html',import.meta.url),'utf8');
  const layout=file==='account'?'account':html.match(/data-page="([^"]+)"/)[1];
  const skeleton=pageSkeleton(layout);assert(skeleton);assert(html.includes(skeleton),file);assert(html.includes(`data-loading-layout="${layout}"`));assert(html.includes(`Loading ${loadingLabels[layout]}…`));
  assert(skeleton.includes('aria-hidden="true"'));assert(!/<(?:button|input|select|textarea|a)[\s>]/.test(skeleton),file);
  const {api,gate,area}=fixture(layout);const ticket=api.lock();assert.equal(gate.children[0].textContent,`Loading ${loadingLabels[layout]}…`);assert.equal(area.hidden,true);api.unlock(ticket);assert.equal(area.hidden,false);
 }
 assert.equal(pageSkeleton('<script>'),'');
});

test('attorney skeleton follows requested workspace route and keeps failures actionable',async()=>{
 const {attorneySkeleton}=await import('../shared/loading.mjs');
 const html=readFileSync(new URL('../attorney.html',import.meta.url),'utf8');assert(html.includes(attorneySkeleton()));
 const {gate,area}=fixture('staff-overview');globalThis.location={hash:'#clients'};
 const api=setupGate({auth:{onAuthStateChange(){}}},'staff');api.lock();assert.equal(gate.dataset.loadingLayout,'staff-clients');assert.equal(area.hidden,true);assert.equal(gate.children[0].textContent,'Loading client directory…');
 location.hash='#client-private-id';api.lock();assert.equal(gate.dataset.loadingLayout,'staff-client');assert(!attorneySkeleton('staff-client').includes('private-id'));
 api.lock('Please verify your authenticator at sign-in.');assert.equal(gate.children.length,3);assert.equal(gate.dataset.loadingLayout,undefined);
});

test('repeated loading preserves shapes while invalidating old refresh tickets',()=>{
 const {api,gate,area}=fixture('portfolio');const first=api.lock();const shapes=gate.children[1];const second=api.lock();assert.equal(gate.children[1],shapes);assert.equal(api.unlock(first),false);assert.equal(area.hidden,true);assert.equal(api.unlock(second),true);
 assert.equal(gate.announcement.textContent,'');
});
test('screen reader announcement is outside busy loading content',()=>{
 const {api,gate}=fixture('brand-map');api.lock();assert.equal(gate.announcement.attributes.role,'status');assert.equal(gate.announcement.attributes['aria-live'],'polite');assert.equal(gate.announcement.textContent,'Loading Brand Map…');assert.equal(gate.attributes.role,undefined);assert(!gate.children.includes(gate.announcement));
});
test('startup connection failures remove skeletons and offer recovery',async()=>{
 const {showConnectionError}=await import('../auth/gate.mjs');const {gate,area}=fixture('portfolio');
 showConnectionError('client');assert.equal(gate.dataset.loadingLayout,undefined);assert.equal(gate.attributes['aria-busy'],'false');assert.equal(area.hidden,true);assert.equal(gate.children[1].href,'login.html');assert.equal(gate.children[2].textContent,'Retry');
});
