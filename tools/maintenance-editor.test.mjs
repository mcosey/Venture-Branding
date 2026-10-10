import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenancePreviewStore,validateMaintenanceDraft} from '../attorney/assets/maintenance-preview-model.mjs';
import {createMaintenanceEditor} from '../attorney/assets/maintenance-editor.js';
const context={clientId:'client-one',markId:'mark-one'};
const data={description:'Example filing',windowStart:'2026-10-01',windowEnd:'2027-03-31',deadline:'2027-03-31',nextStep:'Discuss current use.',status:'Upcoming',source:'PRIVATE verification reference'};
test('drafts stay private; only verified publication projects client fields',()=>{const s=createMaintenancePreviewStore(),draft=s.save(context,null,data);assert.equal(s.clientView(context,draft.id),null);assert.throws(()=>s.publish(context,draft.id,false),/Confirm/);s.publish(context,draft.id,true,'2026-10-09T12:00:00Z');const visible=s.clientView(context,draft.id);assert.equal(visible.description,data.description);assert(!JSON.stringify(visible).includes('PRIVATE'));assert.equal(visible.verifiedAt,'2026-10-09T12:00:00Z');});
test('saved revisions retain the prior published view until verified again',()=>{const s=createMaintenancePreviewStore(),draft=s.save(context,null,data);s.publish(context,draft.id,true);s.save(context,draft.id,{...data,deadline:'2027-03-01',status:'Completed'});assert.equal(s.clientView(context,draft.id).deadline,data.deadline);assert.throws(()=>s.publish(context,draft.id,false));s.publish(context,draft.id,true);assert.equal(s.clientView(context,draft.id).deadline,'2027-03-01');assert.equal(s.clientView(context,draft.id).status,'Completed');});
test('client and mark contexts cannot retrieve or modify other preview entries',()=>{const s=createMaintenancePreviewStore(),draft=s.save(context,null,data);for(const other of [{...context,clientId:'other'},{...context,markId:'other'}]){assert.deepEqual(s.list(other),[]);assert.equal(s.clientView(other,draft.id),null);assert.throws(()=>s.save(other,draft.id,data),/not available/);assert.throws(()=>s.publish(other,draft.id,true),/Save/);}s.list(context)[0].draft.description='mutated';assert.equal(s.list(context)[0].draft.description,data.description);s.clear();assert.deepEqual(s.list(context),[]);});
test('invalid dates, reversed windows, blank source and unknown statuses are rejected',()=>{for(const change of [{deadline:'2027-02-30'},{windowStart:'2027-05-01'},{source:'  '},{status:'Filed automatically'},{description:'x'.repeat(201)}])assert.throws(()=>validateMaintenanceDraft({...data,...change}));assert.equal(validateMaintenanceDraft(data).deadline,'2027-03-31');});
class Element{
 before(node){if(this.parent){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}}

 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attributes={};this.className='';this.value='';this._text='';this.open=false;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join(' ');}append(...nodes){nodes.forEach(n=>n.parent=this);this.children.push(...nodes);}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}prepend(...nodes){this.children.unshift(...nodes);}replaceChildren(...nodes){this._text='';this.children=[...nodes];}setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,f){this.listeners[k]=f;}focus(){this.focused=true;}scrollIntoView(options){this.scrollOptions=options;}showModal(){this.open=true;}close(){this.open=false;this.listeners.close?.();}click(){if(!this.disabled)this.listeners.click?.({preventDefault(){}});}
 get lastChild(){return this.children.at(-1);}querySelectorAll(selector){const tags=selector.split(',');return this.all().filter(n=>tags.includes(n.tag));}
 all(){return this.children.flatMap(n=>[n,...n.all()]);}
}
function setup(repository=null){const body=new Element('body');globalThis.document={body,createElement:t=>new Element(t)};const editor=createMaintenanceEditor(repository);const dialog=body.children[0];const find=label=>dialog.all().find(n=>n.tag==='button'&&n.textContent===label);const form=dialog.all().find(n=>n.tag==='form');const inputs=Object.fromEntries(dialog.all().filter(n=>n.name).map(n=>[n.name,n]));const check=dialog.all().find(n=>n.type==='checkbox');return {editor,dialog,find,form,inputs,check};}
test('editor blocks unsaved publication, resets verification on edits and shows safe public preview',async()=>{const {editor,dialog,find,form,inputs,check}=setup();editor.open({id:context.clientId,name:'Client'}, {id:context.markId,name:'<img src=x>'});find('Add maintenance date').click();find('Fill fictional example').click();check.checked=true;check.listeners.change();assert(find('Publish to client · preview only').disabled);await form.listeners.submit({preventDefault(){}});assert(!dialog.all().find(n=>n.className==='am-verification').hidden);check.checked=true;check.listeners.change();assert(!find('Publish to client · preview only').disabled);await find('Publish to client · preview only').listeners.click();const preview=dialog.all().find(n=>n.className==='am-client-preview');assert(!preview.hidden);assert(preview.focused);assert.equal(preview.scrollOptions.block,'start');assert(preview.textContent.includes('Publication preview updated'));assert(preview.textContent.includes('<img src=x>'));assert(!preview.textContent.includes('Fictional verification reference'));assert.equal(dialog.all().filter(n=>n.tag==='img').length,0);inputs.deadline.value='2027-03-01';inputs.deadline.listeners.input();assert(!check.checked);assert(find('Publish to client · preview only').disabled);assert(preview.textContent.includes('Mar 31, 2027'));await form.listeners.submit({preventDefault(){}});assert(preview.textContent.includes('Mar 31, 2027'));check.checked=true;check.listeners.change();await find('Publish to client · preview only').listeners.click();assert(preview.textContent.includes('Mar 1, 2027'));editor.clear();assert(!dialog.open);assert.equal(inputs.source.value,'');});
test('archived clients cannot open editor and context changes hide prior preview',async()=>{const {editor,dialog,find,form}=setup();editor.open({id:'archived',name:'Archived',archived:true},{id:'mark',name:'Mark'});assert(!dialog.open);editor.open({id:'a',name:'A'},{id:'m',name:'M'});find('Add maintenance date').click();find('Fill fictional example').click();await form.listeners.submit({preventDefault(){}});dialog.close();editor.open({id:'b',name:'B'},{id:'m',name:'M'});assert(!dialog.all().find(n=>n.className==='am-list').textContent.includes('Example maintenance filing'));assert(dialog.all().find(n=>n.className==='am-client-preview').hidden);});

test('connected editor keeps draft edits private, publishes explicitly and withdraws with confirmation',async()=>{
 const backing=createMaintenancePreviewStore(),withdrawn=new Set();
 const repository={list:async c=>backing.list(c),save:async(...args)=>backing.save(...args),publish:async(...args)=>backing.publish(...args),clientView:(c,id)=>withdrawn.has(id)?null:backing.clientView(c,id),clear:()=>backing.clear(),withdraw:async(c,id)=>{withdrawn.add(id);const record=backing.list(c).find(r=>r.id===id);return {...record,published:null};}};
 const {editor,dialog,find,form,inputs,check}=setup(repository);
 await editor.open({id:context.clientId,name:'Client'},{id:context.markId,name:'Mark'});
 find('Add maintenance date').click();assert(find('Fill fictional example').hidden);
 for(const [key,value] of Object.entries(data))inputs[key].value=value;
 await form.listeners.submit({preventDefault(){}});
 const preview=dialog.all().find(n=>n.className==='am-client-preview');assert(preview.hidden);
 check.checked=true;check.listeners.change();await find('Publish to client').listeners.click();
 assert(preview.textContent.includes('Published to client'));assert(!preview.textContent.includes('PRIVATE'));
 inputs.deadline.value='2027-03-01';inputs.deadline.listeners.input();await form.listeners.submit({preventDefault(){}});
 assert(preview.textContent.includes('Mar 31, 2027'));assert(find('Publish to client').disabled);
 find('Withdraw from client').click();assert(!preview.hidden);find('Confirm withdrawal').click();await new Promise(resolve=>setImmediate(resolve));
 assert(dialog.textContent.includes('Publication withdrawn'));assert(preview.hidden);assert(find('Edit entry')); 
});
test('connected editor rejects late context results and leaves editing unavailable on a load failure',async()=>{
 let resolveFirst;const calls=[];
 const repository={list(c){calls.push(c);return calls.length===1?new Promise(resolve=>resolveFirst=resolve):Promise.reject(new Error('Entries unavailable. Reopen to retry.'));},clear(){},clientView(){return null;}};
 const {editor,dialog,find}=setup(repository);
 const first=editor.open({id:'a',name:'A'},{id:'ma',name:'MA'});dialog.close();
 const second=editor.open({id:'b',name:'B'},{id:'mb',name:'MB'});
 resolveFirst([{id:'private',draft:data,published:null}]);await first;await second;
 assert.equal(calls.length,2);assert(!dialog.textContent.includes(data.description));
 assert(dialog.textContent.includes('Entries unavailable'));assert(find('Add maintenance date').hidden);
});

test('entry retrieval shows skeleton and clears busy status on success and failure',async()=>{
 let finish;const repository={list:()=>new Promise(resolve=>finish=resolve),clear(){}};
 const {editor,dialog}=setup(repository);const work=editor.open({id:'one',name:'Client'},{id:'mark',name:'Mark'});
 const list=dialog.all().find(n=>n.className==='am-list');assert.equal(list.attributes['aria-busy'],'true');assert(dialog.textContent.includes('Loading maintenance entries'));assert(dialog.all().some(n=>n.className.startsWith('vb-skeleton')));
 finish([]);await work;assert.equal(list.attributes['aria-busy'],'false');assert(list.textContent.includes('No maintenance entries'));assert(!dialog.all().some(n=>n.className.startsWith('vb-skeleton')));
 const failed=setup({list:async()=>{throw new Error('Could not retrieve entries');},clear(){}});await failed.editor.open({id:'one',name:'Client'},{id:'mark',name:'Mark'});
 assert(failed.dialog.textContent.includes('Could not retrieve entries'));assert(!failed.dialog.all().some(n=>n.className.startsWith('vb-skeleton')));
});

test('closing a pending read removes its announcement without clearing the reopened loader',async()=>{
 const pending=[];const repository={list:()=>new Promise(resolve=>pending.push(resolve)),clear(){}};
 const {editor,dialog}=setup(repository);
 const announcements=()=>dialog.all().filter(n=>n.className==='vb-loading-status');
 const first=editor.open({id:'one',name:'First client'},{id:'first',name:'First mark'});
 assert.equal(announcements().length,1);
 dialog.close();assert.equal(announcements().length,0);
 const second=editor.open({id:'two',name:'Second client'},{id:'second',name:'Second mark'});
 assert.equal(announcements().length,1);
 pending[0]([{id:'old',draft:data,published:null}]);await first;await new Promise(resolve=>setImmediate(resolve));
 const list=dialog.all().find(n=>n.className==='am-list');
 assert.equal(list.attributes['aria-busy'],'true');assert.equal(announcements().length,1);
 assert(!dialog.textContent.includes(data.description));
 pending[1]([]);await second;
 assert.equal(announcements().length,0);assert.equal(list.attributes['aria-busy'],'false');
 assert(list.textContent.includes('No maintenance entries'));
});

test('clearing the editor removes a pending loader before its response settles',async()=>{
 let finish;const {editor,dialog}=setup({list:()=>new Promise(resolve=>finish=resolve),clear(){}});
 const work=editor.open({id:'one',name:'Client'},{id:'mark',name:'Mark'});
 editor.clear();assert(!dialog.open);
 assert.equal(dialog.all().filter(n=>n.className==='vb-loading-status').length,0);
 assert.equal(dialog.all().find(n=>n.className==='am-list').attributes['aria-busy'],'false');
 finish([{id:'old',draft:data,published:null}]);await work;
 assert.equal(dialog.all().filter(n=>n.className==='vb-loading-status').length,0);
 assert(!dialog.textContent.includes(data.description));
});
