import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {showRegionLoading} from '../shared/loading.mjs';
class Element{
 before(node){if(this.parent){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}}

 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.listeners={};this.className='';this._text='';this.isConnected=true;this.classList={toggle(){}};}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join(' ');}
 append(...nodes){nodes.forEach(n=>n.parent=this);this.children.push(...nodes);}prepend(...nodes){nodes.forEach(n=>n.parent=this);this.children.unshift(...nodes);}replaceChildren(...nodes){this._text='';this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){this.listeners[k]=fn;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}all(){return this.children.flatMap(n=>[n,...n.all()]);}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('monitor initial fetch and history refresh show placeholders and clear them on failure',async()=>{
 globalThis.document={createElement:tag=>new Element(tag)};
 let settingsDone,historyDone;let scans=0;
 const source=readFileSync(new URL('../portal/assets/brand-monitor.js',import.meta.url),'utf8').replace(/^import .+;\n/gm,'').replace(/export /g,'');
 const api=vm.runInNewContext(source+';({renderBrandMonitor,clearBrandMonitorDrafts})',{document,bcmCategories:{},showRegionLoading,loadBcmSettings:()=>new Promise(resolve=>settingsDone=resolve),loadBcmScans:()=>++scans===1?Promise.resolve([]):new Promise((resolve,reject)=>historyDone=reject)});
 const main=new Element('main');api.renderBrandMonitor(main,{id:'one'},{});
 assert(main.textContent.includes('Loading saved settings'));assert(main.all().some(n=>n.className.startsWith('vb-skeleton')));
 // Re-entering while the same request is pending must not leave an empty page.
 const second=new Element('main');api.renderBrandMonitor(second,{id:'one'},{});assert(second.textContent.includes('Loading saved settings'));
 second.all().find(n=>n.tag==='button'&&n.textContent==='Scan history').listeners.click();
 main.isConnected=false;
 settingsDone(null);await tick();assert(!second.textContent.includes('Loading saved settings'));assert(second.textContent.includes('No scans yet'));assert(!second.all().some(n=>n.className.startsWith('vb-skeleton')));
 const refresh=second.all().find(n=>n.tag==='button'&&n.textContent==='Refresh scan history');const work=refresh.listeners.click();
 assert(second.textContent.includes('Loading scan history'));assert(second.all().find(n=>n.textContent==='Refresh scan history').disabled);
 historyDone(new Error('History unavailable'));await work;
 assert(second.textContent.includes('History unavailable'));assert(!second.all().some(n=>n.className.startsWith('vb-skeleton')));
 api.clearBrandMonitorDrafts();
});
