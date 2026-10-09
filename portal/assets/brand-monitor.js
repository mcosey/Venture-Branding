// Manual public baseline pilot; no scheduled monitoring or legal findings.
import {bcmCategories,bcmValues,loadBcmSettings,saveBcmSettings,loadBcmScans,createBcmBaseline} from '../../auth/bcm.mjs';
const drafts=new Map();
export function clearBrandMonitorDrafts(){drafts.clear();}
const categories=Object.keys(bcmCategories);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function button(text,action,primary=false){const b=el('button',text,primary?'bcm-button bcm-primary':'bcm-button');b.type='button';b.addEventListener('click',action);return b;}
function panel(title){const p=el('section',undefined,'panel bcm-panel');if(title)p.append(el('h2',title));return p;}
export function renderBrandMonitor(main,client,db){
 let state=drafts.get(client.id);
 if(!state){state={urls:'',exclude:'',access:'public',frequency:'Weekly',categories:[...categories],view:'settings',finding:'new',review:false,loaded:false,version:0,saved:false,message:'',loadError:'',busy:false};drafts.set(client.id,state);}
 const crumb=el('nav',undefined,'watch-crumb');crumb.setAttribute('aria-label','Breadcrumb');const back=el('a','VB Agents');back.href='automations.html?client='+encodeURIComponent(client.id);crumb.append(back,el('span','›'),el('span','Brand Change Monitor'));main.prepend(crumb);
 main.append(el('p','Find possible branding changes on your website or product.','watch-intro'));
 const tabs=el('nav',undefined,'bcm-tabs');tabs.setAttribute('aria-label','Brand Change Monitor views');
 const content=el('div',undefined,'bcm-content'),tabButtons=[];
 for(const [key,label] of [['settings','Setup'],['findings','Findings'],['history','Scan history']]){const b=button(label,()=>{state.view=key;draw();});tabButtons.push({key,b});tabs.append(b);}
 main.append(tabs,content);
 async function load(){
  state.loadError='';state.loading=true;draw();
  try{const saved=await loadBcmSettings(db,client.id);if(drafts.get(client.id)!==state)return;
   if(saved){Object.assign(state,{urls:saved.urls.join('\n'),exclude:saved.exclusions.join('\n'),access:saved.access_mode,frequency:saved.frequency==='weekly'?'Weekly':'Monthly',categories:[...saved.categories],version:saved.version,saved:true});}
   else Object.assign(state,{version:0,saved:false,urls:'',exclude:'',access:'public',frequency:'Weekly',categories:[...categories]});
   state.loaded=true;state.message='';state.scanError='';try{state.scans=await loadBcmScans(db,client.id);}catch(e){state.scans=[];state.scanError=e.message;}
  }catch(error){state.loadError=error.message;state.loaded=false;}
  finally{state.loading=false;if(drafts.get(client.id)===state&&content.isConnected)draw();}
 }
 function draw(){for(const {key,b} of tabButtons){b.classList.toggle('selected',state.view===key);b.setAttribute('aria-pressed',String(state.view===key));}content.replaceChildren();if(state.view==='settings')setup();else if(state.view==='findings')findings();else history();}
 function setup(){
  state.review=false;
  const layout=el('div',undefined,'bcm-layout'),form=el('form',undefined,'bcm-form'),summary=panel('Configuration');form.inert=state.loading||state.busy;layout.append(form,summary);content.append(layout);
  function field(parent,label,name,value,multiline=false){const wrap=el('label',label,'bcm-field'),input=el(multiline?'textarea':'input');input.name=name;input.value=value;input.maxLength=3000;if(multiline)input.rows=3;else input.type='text';wrap.append(input);parent.append(wrap);input.addEventListener('input',()=>{state[name]=input.value;state.review=false;review.hidden=true;updateSummary();});return input;}
  const sources=panel('1. Choose pages');form.append(sources);
  const urls=field(sources,'Website or product URLs — one per line','urls',state.urls,true);urls.placeholder='https://yourwebsite.com/products\nhttps://yourwebsite.com/features';urls.required=true;
  field(sources,'Exclude paths (optional)','exclude',state.exclude,true).placeholder='/account\n/billing';
  const access=panel('2. Access');form.append(access);const accessOptions=el('fieldset');accessOptions.append(el('legend','How can BCM read these pages?'));access.append(accessOptions);
  const accessNote=el('p',undefined,'bcm-muted');
  for(const [value,label] of [['public','Public / readable pages'],['account','Dedicated monitoring account']]){const wrap=el('label',undefined,'bcm-choice'),input=el('input');input.type='radio';input.name='access';input.value=value;input.checked=state.access===value;wrap.append(input,el('span',label));accessOptions.append(wrap);input.addEventListener('change',()=>{state.access=value;state.review=false;review.hidden=true;accessMessage();updateSummary();});}
  access.append(accessNote);
  function accessMessage(){accessNote.textContent=state.access==='public'?'Pages that can be read without signing in.':'Secure account connection will be added later. Use a dedicated account with limited access; do not enter credentials here.';}
  accessMessage();
  const options=panel('3. Monitoring');form.append(options);const checkGrid=el('fieldset',undefined,'bcm-check-grid');checkGrid.append(el('legend','Changes to look for'));options.append(checkGrid);
  for(const category of categories){const wrap=el('label',undefined,'bcm-choice'),input=el('input');input.type='checkbox';input.value=category;input.checked=state.categories.includes(category);wrap.append(input,el('span',bcmCategories[category]));checkGrid.append(wrap);input.addEventListener('change',()=>{state.categories=[...checkGrid.querySelectorAll('input:checked')].map(n=>n.value);state.review=false;review.hidden=true;updateSummary();});}
  const frequency=el('label','Scan frequency','bcm-field'),select=el('select');for(const value of ['Weekly','Monthly'])select.add(new Option(value,value));select.value=state.frequency;frequency.append(select);options.append(frequency);select.addEventListener('change',()=>{state.frequency=select.value;state.review=false;review.hidden=true;updateSummary();});
  const authorize=el('label',undefined,'bcm-choice'),permission=el('input');permission.type='checkbox';permission.required=true;authorize.append(permission,el('span','I own these pages or have permission to monitor them.'));form.append(authorize);permission.addEventListener('change',()=>{review.hidden=true;});
  const error=el('p',undefined,'bcm-error');error.setAttribute('role','alert');form.append(error);
  const submit=el('button','Review setup','bcm-button bcm-primary');submit.type='submit';form.append(submit);
  const review=panel('Review setup');review.hidden=!state.review;form.append(review);
  const summaryBody=el('dl',undefined,'bcm-summary');const status=el('p',state.loading?'Loading saved settings…':state.loadError||(state.saved?'Saved configuration loaded. Monitoring is not running.':'No saved configuration yet. Monitoring is not connected.'),'bcm-muted');status.setAttribute('role','status');summary.append(summaryBody,status);
  if(state.message)summary.append(el('p',state.message,'bcm-muted'));
  const reload=button('Reload saved settings',()=>{load();});reload.disabled=state.loading||state.busy;summary.append(reload,el('p','Reload replaces unsaved edits with the last saved settings.','bcm-muted'));
  submit.disabled=!state.loaded||state.busy;
  const baseline=button('Create baseline',async()=>{
   if(state.busy)return;state.busy=true;state.message='Reading the saved public homepage…';draw();
   try{await createBcmBaseline(db,client.id,state.version);await load();state.message='Baseline saved. No change findings were created.';state.view='history';}
   catch(e){state.message=e.message;try{state.scans=await loadBcmScans(db,client.id);}catch{}}
   finally{state.busy=false;if(content.isConnected)draw();}
  },true);
  baseline.disabled=!state.saved||!!state.scanError||state.busy||state.loading||(state.scans||[]).some(r=>r.status==='completed'&&r.settings_version===state.version);
  summary.append(baseline,el('p','Uses saved settings. First scan supports Cotivate’s public homepage only. Scheduling and comparisons are not connected.','bcm-muted'));
  if(state.scanError)summary.append(el('p',state.scanError,'bcm-muted'));
  function updateSummary(){summaryBody.replaceChildren();const count=state.urls.split('\n').filter(v=>v.trim()).length;for(const [key,value] of [['Pages',String(count)],['Access',state.access==='public'?'Public / readable':'Dedicated account'],['Frequency',state.frequency],['Change types',String(state.categories.length)]]){const row=el('div');row.append(el('dt',key),el('dd',value));summaryBody.append(row);}}
  form.addEventListener('submit',event=>{event.preventDefault();error.textContent='';let values;
   try{values=bcmValues(state,permission.checked).urls;}catch(e){error.textContent=e.message;return;}
   state.review=true;review.hidden=false;review.replaceChildren(el('h2','Review setup'));const list=el('ul');for(const value of values)list.append(el('li',value));review.append(list);
   if(state.exclude.trim())review.append(el('p','Excluded: '+state.exclude,'bcm-muted'));
   review.append(el('p',state.frequency+' · '+state.categories.map(k=>bcmCategories[k]).join(', '),'bcm-muted'));
   review.append(el('p','When connected, the first scan will establish a baseline. Future scans will compare against it.','bcm-muted'));
   const save=button('Save settings',async()=>{
    if(state.busy||!state.loaded)return;
    let snapshot;try{bcmValues(state,permission.checked);snapshot={...state,categories:[...state.categories]};state.message='';}catch(e){error.textContent=e.message;return;}
    state.busy=true;form.inert=true;save.disabled=true;reload.disabled=true;tabButtons.forEach(({b})=>b.disabled=true);error.textContent='';
    try{const saved=await saveBcmSettings(db,client.id,state.version,snapshot,permission.checked);if(drafts.get(client.id)!==state)return;state.version=saved.version;state.saved=true;state.message='Settings saved. Monitoring has not started.';}
    catch(e){error.textContent=e.message;}
    finally{state.busy=false;form.inert=false;save.disabled=false;reload.disabled=false;tabButtons.forEach(({b})=>b.disabled=false);if(drafts.get(client.id)===state&&content.isConnected&&state.message)draw();}
   },true);review.append(save);
   const start=button('Start monitoring',()=>{},true);start.disabled=true;review.append(start,el('p',state.access==='account'?'Secure sign-in access and monitoring are not connected yet.':'Page-access checks and monitoring are not connected yet.','bcm-muted'));review.scrollIntoView({block:'nearest',behavior:'smooth'});
  });updateSummary();
 }
 function findings(){
  const p=panel('No changes identified yet');p.append(el('p','The first scan saves a baseline. Comparing later scans and identifying potential branding changes comes next.','bcm-muted'));content.append(p);
 }
 function history(){
  const p=panel('Scan history');content.append(p);
  p.append(button('Refresh scan history',async()=>{state.scanError='';try{state.scans=await loadBcmScans(db,client.id);}catch(e){state.scanError=e.message;}if(content.isConnected)draw();}));
  if(state.scanError)p.append(el('p',state.scanError,'bcm-muted'));
  if(!state.scans?.length)p.append(el('p','No scans yet.','bcm-muted'));
  for(const run of state.scans||[]){
   const stale=run.status==='running'&&Date.now()-Date.parse(run.started_at)>120000;
   const card=panel(run.status==='completed'?'Baseline saved':run.status==='failed'?'Scan failed':stale?'Scan interrupted':'Scan in progress');
   card.append(el('p',new Date(run.started_at).toLocaleString()+' · Settings version '+run.settings_version,'bcm-muted'));
   if(run.snapshot){const snapshot=run.snapshot;card.append(el('p',snapshot.url),el('h3',snapshot.title||'Page text'));
    const details=el('details'),label=el('summary','View captured text');details.append(label,el('p',snapshot.text));card.append(details,el('p','Public HTML text only. No authenticated content, visual logo analysis, or legal assessment.','bcm-muted'));
   }else if(run.status==='failed'||stale)card.append(el('p','No baseline saved. Return to Setup to retry.','bcm-muted'));
   p.append(card);
  }
 }
 if(state.loaded)draw();else load();
}
