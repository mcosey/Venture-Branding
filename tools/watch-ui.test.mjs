import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
class E {constructor(tag){this.tag=tag;this.children=[];this._text='';this.value='';}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(){}set textContent(t){this._text=t;this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent||'').join(' ');}all(){return [this,...this.children.flatMap(n=>n.all?.()||[])];}}
const source=readFileSync(new URL('../portal/assets/watch-connected.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
const render=vm.runInNewContext(source+';renderConnectedWatch',{document:{createElement:t=>new E(t)},Date,URLSearchParams,location:{search:''},encodeURIComponent});
const fixture={ready:true,latest_source_date:new Date().toISOString().slice(0,10),limit:200,settings:{version:1,mark_ids:['word'],enabled:true,next_run_at:new Date(Date.now()+86400000).toISOString()},runs:[],findings:[{id:'f',serial:'01234567',evidence:{name:'POTENTIAL',classes:[],goods:[],owners:[]},private_note:'SECRET',summary:'PUBLIC',reason:'TEXT ONLY',review_status:'approved',version:1}]};
const tick=()=>new Promise(setImmediate);
function repo(state=fixture){return {enabled:true,clear(){},load:async()=>structuredClone(state),save:async()=>{},review:async()=>{}};}
test('client render shows approved projection and has no private note/review controls',async()=>{const main=new E('main');render(main,{id:'c'},[],null,{repository:repo()});await tick();assert(main.textContent.includes('PUBLIC'));assert(!main.textContent.includes('SECRET'));assert(!main.all().some(n=>n.tag==='textarea'));assert(main.textContent.includes('not legal conclusions'));});
test('setup offers word marks only and preserves selected marks',async()=>{const main=new E('main');render(main,{id:'c'},[{id:'word',name:'WORD',mark_type:'word'},{id:'logo',name:'LOGO',mark_type:'logo'}],null,{view:'setup',repository:repo()});await tick();assert(main.textContent.includes('WORD'));assert(!main.textContent.includes('LOGO'));assert.equal(main.all().find(n=>n.tag==='input').checked,true);});
test('staff review exposes note only in staff workspace',async()=>{const main=new E('main');render(main,{id:'c'},[],null,{audience:'staff',repository:repo()});await tick();assert(main.all().some(n=>n.tag==='textarea'&&n.value==='SECRET'));assert(main.textContent.includes('Approve for client'));});
test('disposed client render does not insert a late finding',async()=>{let complete;const main=new E('main');const dispose=render(main,{id:'c'},[],null,{repository:{enabled:true,clear(){},load:()=>new Promise(r=>complete=r)}});dispose();complete(fixture);await tick();assert(!main.textContent.includes('POTENTIAL'));});
test('missing files show incomplete and no approved findings is never a clearance result',async()=>{const main=new E('main');render(main,{id:'c'},[],null,{repository:repo({...fixture,findings:[],runs:[{status:'incomplete',checked_at:new Date().toISOString(),missing_dates:['2026-10-09']}]})});await tick();assert(main.textContent.includes('incomplete'));assert(main.textContent.includes('2026-10-09'));assert(main.textContent.includes('does not mean a clearance'));});
const scoped={...fixture,scoped:true,settings:undefined,findings:[],runs:[],configurations:[
 {scope_id:'a',label:'Brand protection',active:true,settings:{id:'cfg-a',version:4,mark_ids:['word-a'],enabled:false},available_mark_ids:['word-a']},
 {scope_id:'b',label:'New brand launch',active:true,settings:{id:'cfg-b',version:2,mark_ids:['word-b'],enabled:false},available_mark_ids:['word-b']}
]};
const scopedMarks=[{id:'word-a',name:'ALPHA',mark_type:'word'},{id:'word-b',name:'BETA',mark_type:'word'},{id:'other',name:'UNRELATED',mark_type:'word'}];
test('multiple authorized configurations require explicit selection and show no mark controls beforehand',async()=>{
 const main=new E('main');render(main,{id:'c'},scopedMarks,null,{view:'setup',repository:repo(scoped)});await tick();
 assert(main.textContent.includes('Choose a configuration'));assert(!main.all().some(n=>n.tag==='input'&&n.type==='checkbox'));
 const select=main.all().find(n=>n.tag==='select');assert.equal(select.value,'');select.value='b';select.onchange();
 assert(main.textContent.includes('BETA'));assert(!main.textContent.includes('ALPHA'));assert(!main.textContent.includes('UNRELATED'));
});
test('a single authorized configuration opens directly without a selector',async()=>{
 const main=new E('main');render(main,{id:'c'},scopedMarks,null,{view:'setup',repository:repo({...scoped,configurations:[scoped.configurations[1]]})});await tick();
 assert(!main.all().some(n=>n.tag==='select'));assert(main.textContent.includes('BETA'));assert(!main.textContent.includes('ALPHA'));
});
test('save captures the selected configuration and disables switching while pending',async()=>{
 let complete,saved;const r=repo(scoped);r.save=(...args)=>{saved=args;return new Promise(resolve=>complete=resolve);};
 const main=new E('main');render(main,{id:'c'},scopedMarks,null,{view:'setup',repository:r});await tick();
 const select=main.all().find(n=>n.tag==='select');select.value='b';select.onchange();
 const button=main.all().find(n=>n.tag==='button'&&n.textContent==='Save selection');const pending=button.onclick();
 assert.equal(saved[4].scope_id,'b');assert.deepEqual([...saved[2]],['word-b']);assert(main.all().find(n=>n.tag==='select').disabled);
 complete();await pending;assert.equal(main.all().find(n=>n.tag==='select').value,'b');assert(!main.all().find(n=>n.tag==='select').disabled);
});
test('empty authorized portfolio has no enabled save or start action',async()=>{
 const main=new E('main');render(main,{id:'c'},[],null,{view:'setup',repository:repo({...scoped,configurations:[{...scoped.configurations[1],available_mark_ids:[]}]})});await tick();
 assert(main.textContent.includes('Your attorney must add a word mark'));assert(main.all().filter(n=>n.tag==='button').every(n=>n.disabled));
});
test('loss of the chosen scope discards its controls and requires a fresh authorized choice',async()=>{
 let state=structuredClone(scoped);const r=repo();r.load=async()=>structuredClone(state);r.save=async()=>{state={...scoped,configurations:[scoped.configurations[0]]};};
 const main=new E('main');render(main,{id:'c'},scopedMarks,null,{view:'setup',repository:r});await tick();const select=main.all().find(n=>n.tag==='select');select.value='b';select.onchange();
 await main.all().find(n=>n.tag==='button'&&n.textContent==='Save selection').onclick();
 assert(!main.textContent.includes('BETA'));assert(main.textContent.includes('ALPHA'));
});
test('failed save restores controls without losing current edits',async()=>{
 const r=repo({...scoped,configurations:[scoped.configurations[1]]});r.save=async()=>{throw Error('This record changed. Refresh and review again.');};
 const main=new E('main');render(main,{id:'c'},scopedMarks,null,{view:'setup',repository:r});await tick();const input=main.all().find(n=>n.tag==='input');input.checked=false;
 await main.all().find(n=>n.tag==='button'&&n.textContent==='Save selection').onclick();assert.equal(input.checked,false);assert(!input.disabled);assert(main.textContent.includes('record changed'));
});

test('an authorized unsaved configuration is identified as not configured',async()=>{
 const main=new E('main'),configuration={...scoped.configurations[1],settings:{id:null,version:0,mark_ids:[],enabled:false}};
 render(main,{id:'c'},[],null,{view:'setup',repository:repo({...scoped,configurations:[configuration]})});await tick();assert(main.textContent.includes('Not configured'));
});
