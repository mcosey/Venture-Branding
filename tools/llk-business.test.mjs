import test from 'node:test';
import assert from 'node:assert/strict';
import {acknowledgments,NOTICE_VERSION,BUSINESS_KEY,emptyBusiness,decodeBusiness,normalizeProfile,createAcknowledgment,hasAcknowledged} from '../free/assets/llk-business-state.mjs';
const checked=()=>({all:true});
test('one confirmation covers the draft notices without representing acceptance of absent policies',()=>{
 assert.equal(hasAcknowledged(emptyBusiness()),false);
 assert.throws(()=>createAcknowledgment({all:false}),/confirm/);assert.throws(()=>createAcknowledgment({}),/confirm/);
 const record=createAcknowledgment(checked(),'2026-10-15T12:00:00.000Z');
 assert.equal(record.recordType,'prototype-only');assert.equal(record.termsVersion,null);assert.equal(record.privacyVersion,null);assert.equal(hasAcknowledged({acknowledgment:record}),true);
});
test('old notice versions, malformed saves, and incomplete acknowledgments reopen the gate',()=>{
 assert.deepEqual(decodeBusiness('{oops'),emptyBusiness());assert.deepEqual(decodeBusiness('{"version":2}'),emptyBusiness());
 const state=emptyBusiness();state.acknowledgment=createAcknowledgment(checked());state.acknowledgment.noticeVersion='older-draft';assert.equal(hasAcknowledged(decodeBusiness(JSON.stringify(state))),false);
 state.acknowledgment.noticeVersion=NOTICE_VERSION;state.acknowledgment.checked.all=false;assert.equal(hasAcknowledged(decodeBusiness(JSON.stringify(state))),false);
});
test('profile validates dates and name, supports unknown launch date, and strips unrelated fields',()=>{
 assert.ok(normalizeProfile({}).errors.name);assert.ok(normalizeProfile({name:'Test',launchDate:'2026-02-30'}).errors.launchDate);
 const {profile,errors}=normalizeProfile({name:'  Test business  ',launchDate:'2026-02-30',launchUnknown:true,client_id:'private',role:'staff'});
 assert.deepEqual(errors,{});assert.equal(profile.name,'Test business');assert.equal(profile.launchDate,'');assert.equal(profile.launchUnknown,true);assert.equal(profile.role,undefined);assert.equal(profile.client_id,undefined);
 assert.deepEqual(normalizeProfile({name:'Test',launchDate:'2026-02-28'}).errors,{});
});
test('profile and draft record survive reload without touching the milestone storage shape',()=>{
 const state=emptyBusiness();state.acknowledgment=createAcknowledgment(checked());state.profile=normalizeProfile({name:'Test',industry:'Software',country:'United States',state:'Tennessee'}).profile;
 const after=decodeBusiness(JSON.stringify(state));assert.equal(after.profile.name,'Test');assert.equal(hasAcknowledged(after),true);assert.equal(BUSINESS_KEY,'vb-llk-business-prototype-v1');assert.equal(after.tasks,undefined);
 const withoutAck=decodeBusiness(JSON.stringify({...state,acknowledgment:null}));assert.equal(hasAcknowledged(withoutAck),false);assert.equal(withoutAck.profile.name,'Test');
});

test('actual onboarding screen starts unchecked, saves the profile, and resets without altering milestone storage',async()=>{
 const {Node,mockDocument,flatten}=await import('./fixtures/llk-dom.mjs');
 const previous={document:globalThis.document,localStorage:globalThis.localStorage,Option:globalThis.Option,confirm:globalThis.confirm};
 const memory=new Map([['vb-llk-prototype-v1','milestone sentinel']]);
 Node.prototype.addEventListener=function(name,fn){this.events??={};this.events[name]=fn;};
 Node.prototype.append=function(...items){for(const item of items){item.parentElement=this;this.children.push(item);}};
 Node.prototype.replaceChildren=function(...items){this.children=[];this.append(...items);};
 Node.prototype.focus=function(){this.focused=true;};
 Node.prototype.reportValidity=function(){return !flatten(this).some(n=>n.required&&(n.type==='checkbox'?!n.checked:!n.value));};
 const main=new Node('main');
 globalThis.document={...mockDocument,querySelector:selector=>flatten(main).find(n=>n.id===selector.slice(1))||null};
 globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
 globalThis.Option=class extends Node{constructor(text,value){super('option',text);this.value=value;}};
 globalThis.confirm=()=>true;
 try{
  const {renderBusiness,savedBusinessName}=await import('../free/assets/llk-business.mjs?onboarding-ui-test');
  const e=(tag,text,cls)=>{const n=new Node(tag,text);if(cls)n.className=cls;return n;};
  const panel=title=>{const n=e('section');n.append(e('h2',title));return n;};
  const refresh=()=>{main.replaceChildren();renderBusiness(main,{e,link:(text,href)=>{const n=e('a',text);n.href=href;return n;},panel,heading:()=>{},refresh});};
  refresh();let nodes=flatten(main);const boxes=nodes.filter(n=>n.type==='checkbox');assert.equal(boxes.length,1);assert.ok(boxes.every(n=>!n.checked));
  const firstForm=nodes.find(n=>n.tag==='form');firstForm.events.submit({preventDefault(){}});assert.equal(memory.has(BUSINESS_KEY),false);
  boxes.forEach(n=>n.checked=true);firstForm.events.submit({preventDefault(){}});
  nodes=flatten(main);const name=nodes.find(n=>n.id==='company-name');assert.ok(name);name.value='Example business';
  nodes.find(n=>n.tag==='form').events.submit({preventDefault(){}});
  assert.equal(decodeBusiness(memory.get(BUSINESS_KEY)).profile.name,'Example business');assert.equal(savedBusinessName(),'Example business');
  const saveButton=nodes.find(n=>n.tag==='button'&&n.type==='submit');assert.equal(saveButton.textContent,'✓ Saved');
  const profileForm=nodes.find(n=>n.tag==='form');name.value='Updated business';profileForm.events.input();assert.equal(saveButton.textContent,'Save company profile');profileForm.events.submit({preventDefault(){}});assert.equal(saveButton.textContent,'✓ Saved');assert.equal(decodeBusiness(memory.get(BUSINESS_KEY)).profile.name,'Updated business');assert.equal(savedBusinessName(),'Updated business');
  refresh();nodes=flatten(main);assert.ok(nodes.some(n=>n.tag==='button'&&n.type==='submit'&&n.textContent==='Save company profile'));

  nodes.find(n=>n.tag==='button'&&n.textContent==='Reset company profile and prototype acknowledgments').onclick();
  assert.equal(hasAcknowledged(decodeBusiness(memory.get(BUSINESS_KEY))),false);assert.equal(decodeBusiness(memory.get(BUSINESS_KEY)).profile,null);assert.equal(memory.get('vb-llk-prototype-v1'),'milestone sentinel');assert.equal(savedBusinessName(),'');
 }finally{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
