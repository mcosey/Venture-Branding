import {showRegionLoading} from '../shared/loading.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {renderMaintenance} from '../portal/assets/maintenance.js';
import {renderAgentCards} from '../portal/assets/watch-setup.js';
import {loadRecords} from '../auth/connection.mjs';
class Element{
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 before(node){if(this.parent){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}}

 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.listeners={};this.className='';this._text='';}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
 append(...children){children.forEach(n=>n.parent=this);this.children.push(...children);}prepend(...children){this.children.unshift(...children);}replaceChildren(...children){this._text='';this.children=[...children];}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){this.listeners[k]=fn;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(s.startsWith('.')?c.className.split(' ').includes(s.slice(1)):c.tag===s)?[c]:[],...c.querySelectorAll(s)]);}
 contains(node){return this===node||this.children.some(c=>c.contains(node));}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}click(){if(!this.disabled)this.listeners.click?.();}
}
function page(){globalThis.document={createElement:t=>new Element(t),createElementNS:(_ns,t)=>new Element(t)};return new Element('main');}
const client={id:'client&one',name:'Actual client'};
test('client view has no fictional or calculated dates and preserves client context',()=>{
 const main=page();renderMaintenance(main,client,[],null,false);assert(main.textContent.includes('No verified maintenance dates'));assert(main.textContent.includes('does not mean nothing is due'));assert(!main.textContent.includes('BRIGHT TRAIL'));assert(!main.textContent.includes('2027'));assert(main.textContent.includes('Email reminders are not enabled'));
 const links=main.querySelectorAll('a');assert.equal(links.length,3);for(const link of links)assert.equal(new URL(link.href,'https://test.invalid').searchParams.get('client'),client.id);assert(links.some(l=>l.href.startsWith('new-mark.html?')));
});
test('example view is explicit, cannot start real requests, and reverses cleanly',()=>{
 const main=page();renderMaintenance(main,client,[],null,false);const toggle=main.querySelector('button');toggle.click();assert(main.textContent.includes('Fictional records'));assert(main.textContent.includes('BRIGHT TRAIL'));assert(main.textContent.includes('Example actions are disabled'));const actions=main.querySelectorAll('.maintenance-discuss');assert(actions.every(a=>a.tag==='button'&&a.disabled&&!a.href));assert.equal(toggle.attributes['aria-expanded'],'true');toggle.click();assert(!main.textContent.includes('BRIGHT TRAIL'));assert.equal(toggle.attributes['aria-expanded'],'false');
});
test('switching clients resets example state and removes old client links',()=>{
 const main=page();renderMaintenance(main,client,[],null,false);main.querySelector('button').click();main.replaceChildren();renderMaintenance(main,{id:'client-two',name:'Second'},[],null,false);assert(!main.textContent.includes('BRIGHT TRAIL'));assert(main.querySelectorAll('a').every(l=>new URL(l.href,'https://test.invalid').searchParams.get('client')==='client-two'));
});
test('VB Agents opens maintenance in the selected client workspace',()=>{
 const main=page();renderAgentCards(main,client);const link=main.querySelectorAll('a').find(l=>l.textContent.includes('View Maintenance Reminder'));assert(link);assert.equal(new URL(link.href,'https://test.invalid').pathname,'/maintenance.html');assert.equal(new URL(link.href,'https://test.invalid').searchParams.get('client'),client.id);
});
test('actual controller uses existing gate, blocks unauthorized clients and resets on selection',async()=>{
 const source=(await readFile(new URL('../portal/assets/client.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'');
 async function run({user=true,requested='client&one'}={}){
  const main=page();main.dataset.page='maintenance';const choice=new Element('select');choice.parentElement={};const name=new Element('span');const doc={...document,querySelector:s=>({'main':main,'#client-choice':choice,'#client-name':name}[s]||null),addEventListener(){}};globalThis.document=doc;const queried=[],gates=[];
  const db={auth:{getUser:async()=>({data:{user:user?{id:'signed-in'}:null}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})},onAuthStateChange(){}},rpc:async()=>({data:'client'}),from(table){queried.push(table);return {data:table==='vb_clients'?[client,{id:'client-two',name:'Second'}]:[],select(){return this},order(){return this},is(){return this}}}};
  const context={document:doc,window:{addEventListener(){}},location:{search:'?client='+encodeURIComponent(requested)},URLSearchParams,Option:function(t,v){const n=new Element('option');n.textContent=t;n.value=v;return n},createConnection:()=>db,setupGate:()=>({lock:t=>gates.push(t||'locked'),current:()=>true,unlock:()=>gates.push('unlocked')}),loadRecords,renderMaintenance:(main,client)=>renderMaintenance(main,client,[],null,false)};
  await vm.runInNewContext('(async()=>{'+source+'})()',context);return {main,choice,queried,gates};
 }
 const allowed=await run();assert(allowed.main.textContent.includes('Maintenance Reminder'));assert.equal(allowed.gates.at(-1),'unlocked');allowed.main.querySelector('button').click();allowed.choice.listeners.change({target:{value:'client-two'}});assert(!allowed.main.textContent.includes('BRIGHT TRAIL'));assert(allowed.main.querySelectorAll('a').every(l=>l.href.includes('client-two')));
 const denied=await run({user:false});assert.equal(denied.main.children.length,0);assert.deepEqual(denied.queried,[]);assert.equal(denied.gates.at(-1),'Please sign in again.');const tampered=await run({requested:'someone-else'});assert.equal(tampered.main.children.length,0);assert.equal(tampered.gates.at(-1),'This client is not available to your account.');
});

async function connectedRenderer(loader){
 const source=(await readFile(new URL('../portal/assets/maintenance.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'').replace('export function renderMaintenance','function renderMaintenance');
 return vm.runInNewContext(source+';renderMaintenance',{document:globalThis.document,MAINTENANCE_ENABLED:true,loadMaintenancePublications:loader,showRegionLoading});
}
const publication={mark_id:'m1',description:'Verified filing',window_start:'2026-10-01',window_end:'2027-03-31',deadline:'2027-03-31',next_step:'Discuss use.',status:'Upcoming',verified_at:'2026-10-09T12:00:00Z'};
test('connected client screen displays only accessible marks and real publication links',async()=>{
 const main=page(),render=await connectedRenderer(async()=>({records:[publication,{...publication,mark_id:'archived'},{...publication,mark_id:'other'}]}));
 render(main,client,[{id:'m1',name:'Actual mark',client_id:client.id},{id:'archived',name:'Old mark',client_id:client.id,archived_at:'today'},{id:'other',name:'Other client mark',client_id:'different'}],{});
 await new Promise(resolve=>setImmediate(resolve));
 assert(!main.textContent.includes('Loading maintenance dates'));assert(main.textContent.includes('Actual mark'));assert(main.textContent.includes('Verified filing'));
 assert(!main.textContent.includes('Old mark'));assert(!main.textContent.includes('Other client mark'));assert(!main.textContent.includes('BRIGHT TRAIL'));
 const link=main.querySelectorAll('a').find(n=>n.href?.startsWith('trademark.html'));
 assert.equal(new URL(link.href,'https://test.invalid').searchParams.get('mark'),'m1');assert(main.querySelector('button').hidden);
});
test('client read failure is shown as unavailable rather than an empty list',async()=>{
 const main=page(),render=await connectedRenderer(async()=>{throw new Error('Unavailable');});render(main,client,[],{});
 await new Promise(resolve=>setImmediate(resolve));assert(main.textContent.includes('could not be loaded'));assert(!main.textContent.includes('No verified maintenance dates'));
});
test('late publication reads cannot repopulate a replaced client screen',async()=>{
 const main=page();let complete;const render=await connectedRenderer(()=>new Promise(resolve=>complete=resolve));
 render(main,client,[{id:'m1',name:'Original mark',client_id:client.id}],{});main.replaceChildren();
 complete({records:[publication]});await new Promise(resolve=>setImmediate(resolve));assert.equal(main.children.length,0);
});
