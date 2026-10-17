import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {selectedClientId,clientDestination,setupClientNavigation} from '../portal/assets/client-navigation.mjs';
import {renderAccountBusiness} from '../free/assets/member-business.mjs';
import {memberAccountsEnabled} from '../auth/member-account.mjs';

test('separate legal clients survive page changes, reloads and Account Settings',()=>{
 const clients=[{id:'company'},{id:'individual'}];
 for(const page of ['portal.html','portfolio.html','automations.html','watch.html','trademark-watch.html','watch-finding.html','use-history.html','messages.html','account.html','maintenance.html','digest.html']){
  const destination=new URL(clientDestination(page,'individual','https://vb.example/watch.html?client=company'),'https://vb.example');
  assert.equal(selectedClientId(clients,null,destination.search),'individual');
 }
 assert.equal(selectedClientId(clients,'company','?client=individual'),'company');
 assert.equal(selectedClientId(clients,null,''),'company');
 assert.throws(()=>selectedClientId(clients,null,'?client=unauthorized'),/not available/);
 assert.throws(()=>selectedClientId([{id:'company'}],'individual',''),/not available/);
 const detail=new URL(clientDestination('trademark.html?mark=x%26y#details','individual','https://vb.example/portal.html'),'https://vb.example');
 assert.equal(detail.searchParams.get('mark'),'x&y');assert.equal(detail.hash,'#details');
 for(const href of ['https://other.example/portfolio.html','login.html','v8.html','free/legal-launch-kit.html'])assert.equal(clientDestination(href,'individual','https://vb.example/portal.html'),null);
});

test('navigation updates existing and late links and records a changed selection in the URL',()=>{
 let id='company';const events={},urls=[];
 const anchor={href:'portfolio.html',getAttribute(){return this.href},setAttribute(_key,value){this.href=value}};
 const location={href:'https://vb.example/watch.html?configuration=one#details'};
 const sync=setupClientNavigation({querySelectorAll:()=>[anchor],addEventListener:(event,callback)=>events[event]=callback},location,{replaceState(_state,_title,url){urls.push(String(url))}},()=>id);
 sync();assert.equal(new URL(anchor.href,location.href).searchParams.get('client'),'company');
 id='individual';sync();assert.equal(new URL(urls.at(-1)).searchParams.get('client'),'individual');
 assert.equal(new URL(urls.at(-1)).searchParams.get('configuration'),'one');
 const late={...anchor,href:'account.html'};events.auxclick({target:{closest:()=>late}});
 assert.equal(new URL(late.href,location.href).searchParams.get('client'),'individual');
 const hash={...anchor,href:'#section'};events.click({target:{closest:()=>hash}});assert.equal(hash.href,'#section');
});

test('Account Settings opens the requested legal client instead of the first authorized client',async()=>{
 const nodes=[];const e=(tag,text='')=>{const node={tag,textContent:text,children:[],events:{},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},setAttribute(){},addEventListener(event,fn){this.events[event]=fn},querySelectorAll:()=>[]};nodes.push(node);return node};
 const main=e('main'),choice=e('select'),name=e('span');choice.parentElement={};
 const doc={createElement:e,querySelector:selector=>({'main':main,'#client-choice':choice,'#client-name':name}[selector]||null),querySelectorAll:()=>[],addEventListener(){}};
 const clients=[{id:'company',name:'Company legal client',contact_name:'Company contact'},{id:'individual',name:'Individual legal client',contact_name:'Individual contact'}];
 const routes=[],gateMessages=[];
 const source=(await readFile(new URL('../portal/assets/account.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'');
 const context={document:doc,location:{href:'https://vb.example/account.html?client=individual',search:'?client=individual'},history:{replaceState(_state,_title,url){routes.push(String(url))}},window:{addEventListener(){}},Option:function(text,value){return {text,value}},selectedClientId,setupClientNavigation,createConnection:()=>({}),loadRecords:async()=>({clients}),requireAccess:async()=>({email:'fixture@example.test'}),setupGate:()=>({lock:message=>gateMessages.push(message),current:()=>true,unlock(){}})};
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 assert.equal(name.textContent,'Individual legal client');assert.equal(choice.value,'individual');assert(nodes.some(node=>node.value==='Individual contact'));assert(!nodes.some(node=>node.value==='Company contact'));
 assert.equal(new URL(routes.at(-1)).searchParams.get('client'),'individual');
 choice.events.change({target:{value:'company'}});await new Promise(setImmediate);
 assert.equal(name.textContent,'Company legal client');assert.equal(new URL(routes.at(-1)).searchParams.get('client'),'company');
 choice.events.change({target:{value:'unauthorized'}});await new Promise(setImmediate);
 assert.equal(gateMessages.at(-1),'This client is not available to your account.');assert.equal(main.children.length,0);
});

function profileFixture(){
 const nodes=[];const e=(tag,text='')=>{const node={tag,textContent:text,value:'',children:[],events:{},append(...items){this.children.push(...items)},setAttribute(){},addEventListener(event,fn){this.events[event]=fn},reportValidity:()=>true};nodes.push(node);return node};
 const requests=[],names=[];
 const company={id:'company-id',name:'Company A'};
 const db={from:()=>({update(values){return{eq:()=>({select:()=>({single:()=>new Promise(resolve=>requests.push({values,resolve}))})})}}})};
 renderAccountBusiness(e('main'),{e,link:text=>e('a',text),panel:text=>e('section',text),heading(){}},{company,db},name=>names.push(name));
 return {company,requests,names,form:nodes.find(n=>n.tag==='form'),input:nodes.find(n=>n.id==='account-company-name'),button:nodes.find(n=>n.tag==='button'),status:nodes.find(n=>n.className==='business-save-status')};
}

test('profile save never labels a newer edit Saved; a second save persists that edit',async()=>{
 const fixture=profileFixture(),{form,input,button,requests,company,names}=fixture;
 const first=form.events.submit({preventDefault(){}});assert.equal(button.disabled,true);
 input.value='Company B';form.events.input();requests[0].resolve({data:{id:company.id}});await first;
 assert.equal(requests[0].values.name,'Company A');assert.equal(input.value,'Company B');assert.equal(company.name,'Company A');
 assert.equal(button.textContent,'Save company profile');assert.equal(button.disabled,false);
 const second=form.events.submit({preventDefault(){}});requests[1].resolve({data:{id:company.id}});await second;
 assert.equal(company.name,'Company B');assert.equal(button.textContent,'✓ Saved');assert.deepEqual(names,['Company A','Company B']);
 input.value='Company C';form.events.input();assert.equal(button.textContent,'Save company profile');
 const third=form.events.submit({preventDefault(){}});requests[2].resolve({error:{message:'failed'}});await third;
 assert.equal(button.textContent,'Save company profile');assert.equal(button.disabled,false);assert.equal(company.name,'Company B');
 assert.equal(profileFixture().button.textContent,'Save company profile');
});

test('disabled signup displays an explanation, cannot advance, and makes no Auth calls',async()=>{
 const config={window:{}};vm.runInNewContext(await readFile(new URL('../auth/config.js',import.meta.url),'utf8'),config);
 const nodes=new Map();const create=()=>({textContent:'',hidden:true,disabled:true,checked:false,events:{},append(){},setAttribute(){},addEventListener(event,fn){this.events[event]=fn},reportValidity:()=>true});
 const get=id=>{if(!nodes.has(id))nodes.set(id,create());return nodes.get(id)};
 const sandbox={window:config.window,document:{getElementById:get,createElement:create},location:{hostname:'vb.example'},memberAccountsEnabled,acknowledgments:[],showFlowLoading:()=>()=>{},memberClient(){throw Error('Disabled signup must not connect to Auth')}};
 const source=(await readFile(new URL('../auth/signup-preview.mjs',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'');
 vm.runInNewContext(source,sandbox);await new Promise(setImmediate);
 assert.equal(get('signup-unavailable').hidden,false);assert.equal(get('acknowledgment-step').hidden,true);assert.equal(get('account-step').hidden,true);
 get('acknowledgment-confirmation').checked=true;get('acknowledgment-confirmation').events.change();assert.equal(get('continue').disabled,true);
 get('acknowledgment-form').events.submit({preventDefault(){},currentTarget:get('acknowledgment-form')});assert.equal(get('account-step').hidden,true);
 const login=await readFile(new URL('../login.html',import.meta.url),'utf8');assert.match(login,/id="signup-prompt" hidden/);
});
