import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {showRegionLoading} from '../shared/loading.mjs';

class Element{
 constructor(){this.children=[];this.listeners={};this.attributes={};this.value='';this._text='';this.open=false;}
 set textContent(value){this.replaceChildren();this._text=String(value);}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join(' ');}
 append(...nodes){nodes.forEach(n=>n.parent=this);this.children.push(...nodes);}
 before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
 replaceChildren(...nodes){this._text='';this.children.forEach(n=>n.parent=null);this.children=[];this.append(...nodes);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 addEventListener(name,fn){this.listeners[name]=fn;}
 close(){this.open=false;this.listeners.close?.();}
}

function fixture(){
 const nodes=Object.fromEntries(['mark-editor','mark-form','lookup-result','lookup-message','lookup-mark','mark-close'].map(id=>[id,new Element()]));
 const host=new Element();host.append(nodes['lookup-result']);
 nodes['mark-editor'].open=true;
 nodes['mark-form'].elements={identifier:{value:'12345678'},confirmOwner:{checked:false}};
 globalThis.document={createElement:()=>new Element()};
 const pending=[];
 const source=readFileSync(new URL('../attorney/assets/workspace.js',import.meta.url),'utf8');
 const declaration=source.match(/^  const markEditor=.*$/m)[0];
 const reset=source.slice(source.indexOf('  function resetLookup()'),source.indexOf('  function openMarkEditor'));
 const handler=source.slice(source.indexOf('  let lookingUp=false;'),source.indexOf("  $('#mark-next')"));
 const api=vm.runInNewContext(declaration+'\n'+reset+handler+';({resetLookup})',{
  document,$:selector=>nodes[selector.slice(1)],showRegionLoading,
  usptoRequest:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),
  typeLabel:value=>value,renderMarkSummary:target=>{target.textContent='Current record';}
 });
 return {nodes,host,pending,reset:api.resetLookup,start:()=>nodes['lookup-mark'].listeners.click(),announcements:()=>host.children.filter(n=>n.className==='vb-loading-status')};
}
const reply={record:{name:'Fictional record',mark_type:'word'},checkedAt:'2026-10-10'};

test('changing a pending lookup clears its announcement and rejects the old result',async()=>{
 const f=fixture(),work=f.start();assert.equal(f.announcements().length,1);
 f.nodes['mark-form'].elements.identifier.value='87654321';f.reset();
 assert.equal(f.announcements().length,0);assert.equal(f.nodes['lookup-result'].attributes['aria-busy'],'false');
 f.pending[0].resolve(reply);await work;
 assert.equal(f.announcements().length,0);assert.equal(f.nodes['lookup-result'].textContent,'');
 assert.equal(f.nodes['lookup-mark'].disabled,false);
});

test('closing a lookup removes its loader and a later lookup still finishes normally',async()=>{
 const f=fixture(),first=f.start();f.nodes['mark-editor'].close();
 assert.equal(f.announcements().length,0);
 f.pending[0].resolve(reply);await first;assert.equal(f.nodes['lookup-result'].textContent,'');
 f.nodes['mark-editor'].open=true;const second=f.start();assert.equal(f.announcements().length,1);
 f.pending[1].resolve(reply);await second;
 assert.equal(f.announcements().length,0);assert.equal(f.nodes['lookup-result'].attributes['aria-busy'],'false');
 assert.equal(f.nodes['lookup-result'].textContent,'Current record');
});

test('a failed lookup clears the loader and leaves an enabled retry control',async()=>{
 const f=fixture(),work=f.start();f.pending[0].reject(new Error('Fictional lookup failed'));await work;
 assert.equal(f.announcements().length,0);assert.equal(f.nodes['lookup-result'].attributes['aria-busy'],'false');
 assert.equal(f.nodes['lookup-mark'].disabled,false);assert.equal(f.nodes['lookup-message'].textContent,'Fictional lookup failed');
});
