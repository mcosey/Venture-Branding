import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {showRegionLoading} from '../shared/loading.mjs';
import {assertProduction} from '../auth/bcm-ai.mjs';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.listeners={};this.className='';this._text='';this.isConnected=true;this.classList={toggle(){}};}
 before(node){if(this.parent){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join(' ');}
 append(...nodes){nodes.forEach(n=>n.parent=this);this.children.push(...nodes);}prepend(...nodes){nodes.forEach(n=>n.parent=this);this.children.unshift(...nodes);}replaceChildren(...nodes){this._text='';this.children=[];this.append(...nodes);}
 add(node){this.append(node);}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){this.listeners[k]=fn;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}all(){return this.children.flatMap(n=>[n,...n.all()]);}
 querySelectorAll(selector){return this.all().filter(n=>selector.split(',').map(s=>s.trim()).includes(n.tag));}
 click(){if(!this.disabled)return this.onclick?.();}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const url='https://omvkwiosonatswocbdgx.supabase.co';
const data=clientId=>({clientId,ready:false,settings:null,schedule:null,publications:[],observations:[],runs:[]});
function harness(){
 globalThis.document={createElement:tag=>new Element(tag)};
 globalThis.window={VB_AUTH_CONFIG:{environment:'bcm-production',url,bcmEnabled:true,allowBcmResearch:false}};
 const requests=[];
 const source=readFileSync(new URL('../portal/assets/bcm-ai.js',import.meta.url),'utf8').replace(/^import .+;\n/gm,'').replace(/export /g,'');
 const loadAiWorkspace=(db,audience,clientId)=>{assert.equal(db.supabaseUrl,url);assert.equal(audience,'client');return new Promise((resolve,reject)=>requests.push({clientId,resolve,reject}));};
 const forbidden=()=>{throw Error('Loading must not save settings or run research');};
 const api=vm.runInNewContext(source+';({renderAiBcm})',{document,window,URL,Option:function(text,value){const n=new Element('option');n.textContent=text;n.value=value;return n;},assertProduction,loadAiWorkspace,showRegionLoading,bcmCategories:{},saveBcmSettings:forbidden,runAiResearch:forbidden,setAiMonitoring:forbidden,collectBaseline:forbidden});
 return {requests,mount(clientId='one',options={}){const main=new Element('main'),dispose=api.renderAiBcm(main,{id:clientId},{supabaseUrl:url},options);return {main,dispose};}};
}
const hasShapes=main=>main.all().some(n=>n.className.startsWith('vb-skeleton'));
const button=(main,label)=>{const n=main.all().find(n=>n.tag==='button'&&n.textContent===label);assert(n,'Missing '+label);return n;};
const tabs=main=>main.all().find(n=>n.tag==='nav').children;
test('current monitor shows real skeletons during initial load and history refresh, then recovers from failure',async()=>{
 const h=harness(),{main,dispose}=h.mount();
 assert(main.textContent.includes('Loading Brand Change Monitor'));assert(hasShapes(main));assert(tabs(main).every(n=>n.disabled));
 const region=main.all().find(n=>n.className.startsWith('vb-loading-region'));assert.equal(region.attributes['aria-hidden'],'true');assert.equal(region.parent.attributes['aria-busy'],'true');
 h.requests[0].resolve(data('one'));await tick();
 assert(!hasShapes(main));assert(!main.textContent.includes('Loading Brand Change Monitor'));assert(tabs(main).every(n=>!n.disabled));
 button(main,'Research history').click();assert(main.textContent.includes('No research runs yet.'));
 const work=button(main,'Refresh history').click();assert(hasShapes(main));assert(tabs(main).every(n=>n.disabled));
 h.requests[1].reject(new Error('History unavailable'));await work;
 assert(main.textContent.includes('History unavailable'));assert(!hasShapes(main));assert(tabs(main).every(n=>n.disabled));assert.equal(region.parent.attributes['aria-busy'],'false');
 const retry=button(main,'Retry loading').click();assert(hasShapes(main));h.requests[2].resolve(data('one'));await retry;
 assert(!hasShapes(main));assert(main.textContent.includes('No research runs yet.'));assert(tabs(main).every(n=>!n.disabled));dispose();
});
test('current monitor removes initial placeholders on failure and offers a working retry',async()=>{
 const h=harness(),{main,dispose}=h.mount();h.requests[0].reject(new Error('Workspace unavailable'));await tick();
 assert(main.textContent.includes('Workspace unavailable'));assert(!hasShapes(main));assert(!main.textContent.includes('Your website and preferences'));assert(tabs(main).every(n=>n.disabled));
 const retry=button(main,'Retry loading').click();assert(hasShapes(main));h.requests[1].resolve(data('one'));await retry;
 assert(main.textContent.includes('Your website and preferences'));assert(!hasShapes(main));dispose();
});
test('switching current monitor workspaces discards late results and leaves no old placeholders',async()=>{
 const h=harness(),first=h.mount('one',{initialView:'updates'});assert(hasShapes(first.main));first.dispose();assert.equal(first.main.textContent,'');
 const second=h.mount('two',{initialView:'updates'});assert(hasShapes(second.main));
 h.requests[0].resolve({...data('one'),publications:[{name:'OLD PRIVATE WORKSPACE',source_url:'https://example.com'}]});await tick();
 assert.equal(first.main.textContent,'');assert(hasShapes(second.main));assert(!second.main.textContent.includes('OLD PRIVATE WORKSPACE'));
 h.requests[1].resolve(data('two'));await tick();assert(!hasShapes(second.main));assert(second.main.textContent.includes('No reviewed updates yet.'));second.dispose();
});
