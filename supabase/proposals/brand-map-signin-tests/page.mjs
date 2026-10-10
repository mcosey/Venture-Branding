import {CASES,validateConfig} from './contract.mjs';
import {createRunner} from './runner.mjs';
const $=id=>document.getElementById(id);
let config=null,runner=null,working=false;
const rows=new Map(CASES.map(id=>{const li=document.createElement('li');li.textContent=`${id} · not run`;$('cases').append(li);return [id,li];}));
function update(s) {
  for(const id of CASES){rows.get(id).classList.toggle('passed',s.completed.includes(id));rows.get(id).textContent=`${id} · ${s.completed.includes(id)?'passed in this tab':'not run in this tab'}`;}
  $('status').textContent=`Client ${s.actor} · ${s.phase.replaceAll('-',' ')}`;
  const allowed={initial:'signed-in',adversarial:'fresh-login',access:'awaiting-access-change',finish:'access-checked'};
  for(const [id,phase] of Object.entries(allowed))$(id).disabled=working||s.phase!==phase;
  $('login').disabled=working||!['ready','awaiting-fresh-login'].includes(s.phase);$('password').disabled=$('login').disabled;
  $('clear').disabled=working||s.phase==='closed';$('export').disabled=working;
  $('summary').textContent=`${s.completed.length} checks passed in this tab. ${s.fresh_logins} verified password sign-ins. Independent database verification is still required.`;
  $('instruction').textContent=s.phase==='awaiting-fresh-login'?'Please enter the password again. This checks whether the saved record survives a fresh sign-in.':s.phase==='awaiting-access-change'?`Pause here. The operator must run the prepared ${s.actor==='A'?'A membership withdrawal':'B portal-disable'} batch before step 3. Keep this tab open; the same login will be tested.`:'Follow the numbered steps. Stop if a result is unexpected.';
}
async function perform(fn){if(working)return;working=true;if(runner)update(runner.stats());try{await fn();}catch{$('status').textContent='Stopped · unexpected result';$('instruction').textContent='The check did not match its expected result. No live success is claimed; the operator should inspect the Test-only state before continuing.';}finally{working=false;if(runner)update(runner.stats());}}
try{const r=await fetch('runtime-config.json',{cache:'no-store',credentials:'omit'});validateConfig(config=await r.json());$('status').textContent='Approved Test setup · ready to configure';}
catch{config=null;$('configure').querySelector('button').disabled=true;$('key').disabled=true;}
$('configure').addEventListener('submit',e=>{e.preventDefault();if(!config||runner)return;try{runner=createRunner(config,$('key').value,$('actor').value,{view:$('map'),onChange:update});$('key').value='';$('key').disabled=true;$('actor').disabled=true;$('configure').querySelector('button').disabled=true;$('email').textContent=config.manifest.users[$('actor').value].email;update(runner.stats());}catch{$('status').textContent='Configuration refused · use only the Test publishable key';}});
$('signin').addEventListener('submit',e=>{e.preventDefault();const p=$('password').value;$('password').value='';void perform(()=>runner.login(p));});
for(const [id,method] of [['initial','initial'],['adversarial','adversarial'],['access','accessChange'],['finish','finish'],['clear','clear']])$(id).addEventListener('click',()=>perform(()=>runner[method]()));
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(runner.report(),null,2)+'\n'],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`brand-map-${runner.stats().actor}-results.json`;a.click();URL.revokeObjectURL(u);});
// Closing the tab discards its closure; there is no persistent session storage.
