import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validConfiguration} from '../auth/flow.mjs';
import {createConnection} from '../auth/connection.mjs';
const url='https://imvkhicfmidzbzsbhkzs.supabase.co';
const config={environment:'bcm-test',url,publishableKey:'sb_publishable_dummy',allowBcmResearch:false};
test('Test configuration requires explicit environment; Production stays accepted',()=>{
 assert.equal(validConfiguration({url,publishableKey:'sb_publishable_dummy'}),false);
 assert.equal(validConfiguration(config),true);
 assert.equal(validConfiguration({...config,url:'https://other.supabase.co'}),false);
 assert.equal(validConfiguration({url:'https://omvkwiosonatswocbdgx.supabase.co',publishableKey:'sb_publishable_dummy'}),true);
});
test('Test connection cannot run off localhost or use the Production session key',()=>{
 let args;globalThis.window={VB_AUTH_CONFIG:config,location:{hostname:'public.example'},supabase:{createClient(...value){args=value;return {};}}};globalThis.sessionStorage={};
 assert.throws(()=>createConnection('client'),/local only/);assert.equal(args,undefined);
 window.location.hostname='127.0.0.1';createConnection('client');assert.equal(args[2].auth.storageKey,'vb-bcm-ai-test-client');
 window.VB_AUTH_CONFIG={url:'https://omvkwiosonatswocbdgx.supabase.co',publishableKey:'sb_publishable_dummy'};createConnection('client');assert.equal(args[2].auth.storageKey,'vb-auth-client');
 delete globalThis.window;delete globalThis.sessionStorage;
});
class Element{
 constructor(tag,text=''){this.tag=tag;this._text=text;this.children=[];this.attributes={};this.listeners={};this.isConnected=true;this.classList={toggle(){}};}
 append(...n){this.children.push(...n);}
 replaceChildren(...n){this._text='';this.children=n;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,fn){this.listeners[k]=fn;}
 add(n){this.append(n);}
 get textContent(){return this._text+' '+this.children.map(n=>n.textContent).join(' ');}
 set textContent(v){this._text=String(v);this.children=[];}
 all(){return this.children.flatMap(n=>[n,...n.all()]);}
 querySelectorAll(selector){return this.all().filter(n=>selector.split(',').map(s=>s.trim()).includes(n.tag));}
}
const data=()=>({clients:[{id:'a',name:'Client A'}],clientId:'a',ready:true,settings:{version:1,urls:['https://example.com/'],categories:['product_names'],frequency:'weekly',exclusions:[]},schedule:{enabled:false,revision:1},publications:[{name:'Reviewed name',state:'approved',context:'Reviewed context',passage:'Reviewed passage',source_url:'https://example.com/'}],observations:[{name:'Private unreviewed name'}],runs:[]});
const tick=()=>new Promise(r=>setImmediate(r));
function harness(load){
 const document={createElement:tag=>new Element(tag)};
 const source=readFileSync(new URL('../portal/assets/bcm-ai.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
 const ctx={document,window:{VB_AUTH_CONFIG:config},Option:function(text,value){const n=new Element('option',text);n.value=value;return n;},URL,bcmCategories:{product_names:'Product names'},assertTest:db=>{if(db.supabaseUrl!==url)throw Error('Test only');},loadAiWorkspace:load,reviewAiFinding:async()=>{throw Error('Staff access expired');},showRegionLoading(target,label){target.replaceChildren(new Element('p',label));return ()=>{};}};
 return vm.runInNewContext(source+';({renderAiBcm,aiTestEnabled})',ctx);
}
test('Production cannot mount the new renderer or query AI records',()=>{
 let calls=0;const api=harness(async()=>{calls++;return data();});assert.throws(()=>api.renderAiBcm(new Element('main'),{id:'a'},{supabaseUrl:'https://omvkwiosonatswocbdgx.supabase.co'}),/Test only/);assert.equal(calls,0);
});
test('late fetch cannot reinsert findings after disposal/client switch',async()=>{
 let resolve;const api=harness(()=>new Promise(r=>resolve=r)),main=new Element('main');const dispose=api.renderAiBcm(main,{id:'a'},{supabaseUrl:url});assert.match(main.textContent,/Loading Brand Change Monitor/);dispose();resolve(data());await tick();assert.doesNotMatch(main.textContent,/Reviewed name|Private unreviewed/);
});
test('client renderer exposes reviewed publications only, with research disabled even if backend ready',async()=>{
 const api=harness(async()=>data()),main=new Element('main');api.renderAiBcm(main,{id:'a'},{supabaseUrl:url});await tick();
 const run=main.all().find(n=>n.tag==='button'&&n.textContent.trim()==='Run research now');assert.equal(run.disabled,true);
 main.all().find(n=>n.tag==='button'&&n.textContent.trim()==='Reviewed updates').onclick();assert.match(main.textContent,/Reviewed name/);assert.doesNotMatch(main.textContent,/Private unreviewed name|Review note \(private\)/);
});
test('failed loading shows retry without partial client records',async()=>{
 const api=harness(async()=>{throw Error('Access unavailable');}),main=new Element('main');api.renderAiBcm(main,{id:'a'},{supabaseUrl:url});await tick();assert.match(main.textContent,/Access unavailable|Retry loading/);assert.doesNotMatch(main.textContent,/Reviewed name/);
});

test('failed staff action clears private records until protected reload succeeds',async()=>{
 const api=harness(async()=>data()),main=new Element('main');api.renderAiBcm(main,{id:'a'},{supabaseUrl:url},{audience:'staff'});await tick();
 const status=main.all().find(n=>n.tag==='select'&&n.attributes['aria-label']==='Finding status');status.value='all';status.onchange();
 const note=main.all().find(n=>n.tag==='textarea');note.value='Test';const form=main.all().find(n=>n.tag==='form');form.onsubmit({preventDefault(){},submitter:{value:'approve'}});await tick();
 assert.match(main.textContent,/Staff access expired|Reload saved records/);assert.doesNotMatch(main.textContent,/Private unreviewed name/);
});
