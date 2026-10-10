import test from 'node:test';
import assert from 'node:assert/strict';
import {brandMapModel,mapPage,recordLink} from '../portal/assets/brand-map-model.mjs';
import {renderBrandMap} from '../portal/assets/brand-map.js';
import {brandMapBcmModel,loadBrandMapBcm} from '../portal/assets/brand-map-bcm.mjs';
import {loadRecords} from '../auth/connection.mjs';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const client={id:'client-one',name:'Example Studio'};
const record=(id,extra={})=>({id,client_id:client.id,name:'Mark '+id,mark_type:'word',status:'pending',...extra});

test('model excludes other clients, archived records, and internal information',()=>{
 const result=brandMapModel(client,[record('visible',{internal_notes:'PRIVATE',review_notes:'PRIVATE'}),record('other',{client_id:'client-two'}),record('archived',{archived_at:'2026-01-01'})]);
 assert.deepEqual(result.marks.map(mark=>mark.id),['visible']);assert.equal(result.counts.total,1);assert(!JSON.stringify(result).includes('PRIVATE'));
 assert.throws(()=>brandMapModel(null,[]));
});
test('inactive Cotivate application and unknown statuses never become registrations',()=>{
 const result=brandMapModel(client,[record('cotivate',{name:'Cotivate',status:'inactive',application_number:'88897764'}),record('unknown',{status:null}),record('registered',{status:'registered'})]);
 assert.equal(result.marks[0].status,'Inactive');assert.equal(result.marks[0].registrationNumber,'Not provided');assert.equal(result.marks[1].status,'Not provided');
 assert.deepEqual(result.counts,{total:3,registered:1,pending:0,inactive:1});
});
test('links preserve the selected client and safely encode record identifiers',()=>{
 const url=new URL(recordLink('client&two','mark?name=<script>'),'https://example.test/');
 assert.equal(url.pathname,'/trademark.html');assert.equal(url.searchParams.get('client'),'client&two');assert.equal(url.searchParams.get('mark'),'mark?name=<script>');
});
test('every record remains reachable in large portfolios without changing totals',()=>{
 const marks=brandMapModel(client,Array.from({length:19},(_,i)=>record('id-'+i))).marks;
 const visited=[];for(let page=0;page<4;page++){const view=mapPage(marks,page);assert.equal(view.pages,4);visited.push(...view.items.map(item=>item.mark.id));assert(view.items.every(item=>item.x>=16&&item.x<=84&&item.y>=13&&item.y<=87));}
 assert.equal(new Set(visited).size,19);assert.equal(mapPage(marks,999).current,3);assert.equal(mapPage(marks,-1).current,0);assert.deepEqual(mapPage([],0).items,[]);
});

// Minimal page-element adapter exercises the actual renderer without external
// libraries. These tests do not claim browser layout or live RLS verification.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.listeners={};this._text='';this.className='';this.classList={add:name=>{this.className+=' '+name;},remove:name=>{this.className=this.className.split(' ').filter(cls=>cls!==name).join(' ');}};}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(child=>child.textContent).join(' ');}
 append(...children){this.children.push(...children);}replaceChildren(...children){this._text='';this.children=[...children];}
 setAttribute(key,value){this.attributes[key]=String(value);}addEventListener(type,handler){this.listeners[type]=handler;}
 focus(){this.focused=true;}scrollIntoView(){this.scrolled=true;}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(matches(child,selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 click(){if(!this.disabled)this.listeners.click?.();}
}
function matches(element,selector){if(selector[0]==='.')return element.className.split(' ').includes(selector.slice(1));if(selector[0]==='#')return element.id===selector.slice(1);if(selector==='button[data-mark-id]')return element.tag==='button'&&element.dataset.markId!==undefined;return element.tag===selector;}
function page(){globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_namespace,tag)=>new Element(tag)};globalThis.window={matchMedia:()=>({matches:true})};return new Element('main');}

test('real selections show factual details, plain text, and correct deep links',()=>{
 const main=page();const dangerous='<img src=x onerror=alert(1)>';renderBrandMap(main,client,[record('first',{name:dangerous,status:'inactive',uspto_status_text:'Abandoned'}),record('foreign',{client_id:'client-two',name:'SECRET'})]);
 assert(!main.textContent.includes('SECRET'));const node=main.querySelectorAll('button[data-mark-id]').find(node=>node.dataset.markId==='first');assert(node.textContent.includes(dangerous));assert.equal(main.querySelectorAll('img').length,0);
 node.click();assert.equal(main.querySelector('#bm-detail-title').textContent,dangerous);assert(main.querySelector('.bm-facts').textContent.includes('Abandoned'));assert.equal(main.querySelector('.bm-detail').querySelector('a').href,'trademark.html?mark=first&client=client-one');assert(main.querySelector('#bm-detail-title').focused);assert(main.querySelector('.bm-detail').scrolled);
 const back=main.querySelector('.bm-back');back.click();assert(node.focused);
});
test('switching clients removes prior nodes, selected details, links, and zoom state',()=>{
 const main=page();const records=[record('one',{name:'First private name'}),record('two',{client_id:'client-two',name:'Second private name'})];
 renderBrandMap(main,client,records);main.querySelectorAll('button[data-mark-id]').find(node=>node.dataset.markId==='one').click();
 renderBrandMap(main,{id:'client-two',name:'Second Studio'},records);assert(!main.textContent.includes('First private name'));assert(!main.querySelectorAll('a').some(link=>link.href.includes('client-one')));assert.equal(main.querySelector('#bm-detail-title').textContent,'Second Studio');
 main.querySelectorAll('button[data-mark-id]').find(node=>node.dataset.markId==='two').click();assert.equal(main.querySelector('.bm-detail').querySelector('a').href,'trademark.html?mark=two&client=client-two');
});
test('empty portfolios show the company and honest unavailable states without sample assets',()=>{
 const main=page();renderBrandMap(main,client,[]);assert.equal(main.querySelectorAll('button[data-mark-id]').length,1);assert(main.textContent.includes('No trademark records'));assert(main.textContent.includes('Loading saved monitor activity'));assert.equal(main.querySelector('#bm-detail-title').textContent,client.name);assert(!main.textContent.includes('Northline'));
});
test('zoom limits, reset, and page changes retain access to every record',()=>{
 const main=page();renderBrandMap(main,client,Array.from({length:8},(_,i)=>record(String(i))));
 const controls=main.querySelector('.bm-controls').querySelectorAll('button');for(let i=0;i<10;i++)controls[0].click();assert.equal(main.querySelector('output').textContent,'150%');assert(controls[0].disabled);for(let i=0;i<10;i++)controls[1].click();assert.equal(main.querySelector('output').textContent,'75%');assert(controls[1].disabled);controls[2].click();assert.equal(main.querySelector('output').textContent,'100%');assert.equal(main.querySelector('.bm-viewport').scrollTop,0);
 const pager=main.querySelector('.bm-pager');pager.querySelectorAll('button')[1].click();assert.equal(main.querySelectorAll('button[data-mark-id]').length,3);assert(main.textContent.includes('2 of 2'));assert(main.querySelectorAll('button[data-mark-id]')[0].focused);assert.equal(main.querySelector('#bm-detail-title').textContent,client.name);
});

const scan=(id,extra={})=>({id,client_id:client.id,status:'completed',scan_type:'baseline',started_at:'2026-10-01',snapshot:{text:'Original website text.'},...extra});
const comparison=(id,extra={})=>scan(id,{scan_type:'comparison',baseline_id:'baseline',started_at:'2026-10-09',snapshot:{text:'Introducing “Orbit Studio”. Our new tagline is “Build With Purpose”.',url:'https://example.org/products'},...extra});
test('monitor projection isolates clients and deduplicates recent findings without granting legal status',()=>{
 const state=brandMapBcmModel(client.id,[scan('baseline'),comparison('old',{started_at:'2026-10-08'}),comparison('new'),comparison('foreign',{client_id:'other',snapshot:{text:'Introducing “PRIVATE”.'}}),scan('failed',{status:'failed',internal_notes:'PRIVATE'})]);
 assert.equal(state.findings.length,2);assert(state.findings.every(f=>f.id.startsWith('bcm:new:')));assert.equal(state.compared,2);assert.equal(state.activity.length,3);assert(!JSON.stringify(state).includes('PRIVATE'));assert(state.findings.every(f=>f.status.includes('needs review')));
 const missing=brandMapBcmModel(client.id,[comparison('new')],[scan('baseline',{client_id:'other'})]);assert.equal(missing.findings.length,0);assert.equal(missing.missingBaselines,1);
});
test('read-only loader scopes recent scans and older baselines to the client, and blocks signed-out reads',async()=>{
 const queries=[];
 const db={auth:{getUser:async()=>({data:{user:{id:'user'}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})}},rpc:async name=>{assert.equal(name,'vb_session_role');return {data:'client'};},from(table){assert.equal(table,'vb_bcm_scans');const q={table};queries.push(q);return {select(value){q.fields=value;return this;},eq(key,value){q[key]=value;return this;},order(){return this;},limit(value){q.limit=value;return Promise.resolve({data:[comparison('recent')]});},in(key,value){q[key]=value;return Promise.resolve({data:[scan('baseline'),scan('foreign',{client_id:'other'})]});}};}};
 const state=await loadBrandMapBcm(db,client.id);assert.equal(state.findings.length,2);assert.equal(queries.length,2);assert(queries.every(q=>q.client_id===client.id&&!q.fields.includes('internal')));assert.equal(queries[0].limit,10);assert.deepEqual(queries[1].id,['baseline']);
 db.auth.getUser=async()=>({data:{user:null}});await assert.rejects(loadBrandMapBcm(db,client.id),/sign in/);assert.equal(queries.length,2);
});
test('findings are selectable plain text, keep legal counts, and retain record selection on load',()=>{
 const main=page();const update=renderBrandMap(main,client,[record('mark')]);main.querySelectorAll('button[data-mark-id]').find(n=>n.dataset.markId==='mark').click();
 const state=brandMapBcmModel(client.id,[scan('baseline'),comparison('new')]);state.findings[0].name='<img src=x onerror=alert(1)>';
 update(state);assert.equal(main.querySelector('#bm-detail-title').textContent,'Mark mark');assert.equal(main.querySelector('.bm-summary').textContent.includes('1 Trademark records'),true);
 const node=main.querySelectorAll('button[data-mark-id]').find(n=>n.dataset.markId===state.findings[0].id);node.click();assert.equal(main.querySelector('#bm-detail-title').textContent,state.findings[0].name);assert.equal(main.querySelectorAll('img').length,0);assert(main.querySelector('.bm-facts').textContent.includes('not a trademark record'));assert.equal(main.querySelector('.bm-detail').querySelector('a').href,'brand-monitor.html?client=client-one');
 update({...state,clientId:'foreign'});assert(!main.textContent.includes('Build With Purpose'));assert(main.textContent.includes('could not be loaded'));assert(main.textContent.includes('Mark mark'));
});

test('portal entry renders through the existing access gate and handles client choice',async()=>{
 const source=(await readFile(new URL('../portal/assets/client.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'');
 async function run({user=true,requested='client-one',loader=async(_db,id)=>brandMapBcmModel(id,[])}={}){
  const main=page();main.dataset.page='portal';const choice=new Element('select');choice.parentElement={};const name=new Element('span');
  const events={};const authEvents={};const doc={...globalThis.document,hidden:false,querySelector:selector=>({'main':main,'#client-choice':choice,'#client-name':name}[selector]||null),addEventListener(type,callback){events[type]=callback;}};
  globalThis.document=doc;const queryTables=[];const gates=[];
  const db={auth:{getUser:async()=>({data:{user:user?{id:'signed-in'}:null}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})},onAuthStateChange(callback){authEvents.callback=callback;}},rpc:async()=>({data:'client'}),from(table){queryTables.push(table);return {data:table==='vb_clients'?[client,{id:'client-two',name:'Other Studio'}]:table==='vb_marks'?[record('first'),record('second',{client_id:'client-two'})]:[],select(){return this;},order(){return this;},is(){return this;}};}};
  const context={document:doc,window:{addEventListener(){}},location:{search:'?client='+requested},URLSearchParams,Option:function(text,value){const e=new Element('option');e.textContent=text;e.value=value;return e;},createConnection:()=>db,setupGate:()=>({lock:text=>gates.push(text||'locked'),unlock:()=>gates.push('unlocked'),current:()=>true}),loadRecords,renderBrandMap,loadBrandMapBcm:loader,clearMarkDrafts(){},clearBrandMonitorDrafts(){}};
  await vm.runInNewContext('(async()=>{'+source+'})()',context);return {main,choice,queryTables,gates,doc,events,authEvents};
 }
 const allowed=await run();assert(allowed.main.textContent.includes('Brand Map'));assert.equal(allowed.gates.at(-1),'unlocked');assert(allowed.main.textContent.includes('Mark first'));assert(!allowed.main.textContent.includes('Mark second'));
 allowed.choice.listeners.change({target:{value:'client-two'}});assert(allowed.main.textContent.includes('Mark second'));assert(!allowed.main.textContent.includes('Mark first'));
 const pending=[];const deferred=(_db,id)=>new Promise(resolve=>pending.push({id,resolve}));
 const raced=await run({loader:deferred});
 raced.choice.listeners.change({target:{value:'client-two'}});
 const result=(id,name)=>({...brandMapBcmModel(id,[]),findings:[{id:'bcm:test',kind:'detected',name,type:'Possible product',status:'Needs review'}]});
 pending[1].resolve(result('client-two','Second finding'));await Promise.resolve();
 pending[0].resolve(result('client-one','PRIVATE first finding'));await Promise.resolve();
 assert(raced.main.textContent.includes('Second finding'));assert(!raced.main.textContent.includes('PRIVATE'));
 raced.choice.listeners.change({target:{value:'client-one'}});raced.authEvents.callback('SIGNED_OUT');
 pending[2].resolve(result('client-one','PRIVATE signed-out finding'));await Promise.resolve();assert.equal(raced.main.children.length,0);
 const hidden=await run({loader:deferred});hidden.doc.hidden=true;hidden.events.visibilitychange();pending.at(-1).resolve(result('client-one','PRIVATE hidden finding'));await Promise.resolve();assert.equal(hidden.main.children.length,0);
 const failed=await run({loader:async()=>{throw new Error('Private backend error');}});await Promise.resolve();assert(failed.main.textContent.includes('Mark first'));assert(failed.main.textContent.includes('could not be loaded'));assert(!failed.main.textContent.includes('Private backend'));
 const denied=await run({user:false});assert.equal(denied.main.children.length,0);assert.deepEqual(denied.queryTables,[]);assert.equal(denied.gates.at(-1),'Please sign in again.');
 const tampered=await run({requested:'unauthorized-client'});assert.equal(tampered.main.children.length,0);assert.equal(tampered.gates.at(-1),'This client is not available to your account.');
});
