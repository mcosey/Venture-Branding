import {showRegionLoading} from '../../shared/loading.mjs';
// Manual public baseline pilot; no scheduled monitoring or legal findings.
import {bcmCategories,bcmValues,loadBcmSettings,saveBcmSettings,loadBcmScans,createBcmBaseline,compareBcmSnapshots,findBcmCandidates} from '../../auth/bcm.mjs?v=20261009-bcm-public-pages';
const drafts=new Map(),views=new Map();
export function clearBrandMonitorDrafts(){drafts.clear();views.clear();}
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
 const content=el('div',undefined,'bcm-content'),tabButtons=[];let finishLoading;
 for(const [key,label] of [['settings','Setup'],['findings','Findings'],['history','Scan history']]){const b=button(label,()=>{state.view=key;draw();});tabButtons.push({key,b});tabs.append(b);}
 main.append(tabs,content);
 views.set(client.id,()=>{if(content.isConnected)draw();});
 async function load(){
  if(state.loading)return;
  state.loadError='';state.loading=true;draw();
  try{const saved=await loadBcmSettings(db,client.id);if(drafts.get(client.id)!==state)return;
   if(saved){Object.assign(state,{urls:saved.urls.join('\n'),exclude:saved.exclusions.join('\n'),access:saved.access_mode,frequency:saved.frequency==='weekly'?'Weekly':'Monthly',categories:[...saved.categories],version:saved.version,saved:true});}
   else Object.assign(state,{version:0,saved:false,urls:'',exclude:'',access:'public',frequency:'Weekly',categories:[...categories]});
   state.loaded=true;state.message='';state.scanError='';try{state.scans=await loadBcmScans(db,client.id);}catch(e){state.scans=[];state.scanError=e.message;}
  }catch(error){state.loadError=error.message;state.loaded=false;}
  finally{state.loading=false;if(drafts.get(client.id)===state)views.get(client.id)?.();}
 }
 function draw(){finishLoading?.();finishLoading=null;for(const {key,b} of tabButtons){b.classList.toggle('selected',state.view===key);b.setAttribute('aria-pressed',String(state.view===key));}content.setAttribute('aria-busy','false');content.replaceChildren();if(state.loading&&!state.loaded){finishLoading=showRegionLoading(content,'Loading saved settings…','settings');return;}if(state.view==='settings')setup();else if(state.view==='findings')findings();else history();}
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
  const baseline=button((state.scans||[]).some(r=>r.status==='completed'&&r.scan_type==='baseline'&&r.settings_version===state.version)?'Scan for changes':'Create baseline',async()=>{
   if(state.busy)return;const hasBaseline=(state.scans||[]).some(r=>r.status==='completed'&&r.scan_type==='baseline'&&r.settings_version===state.version);state.busy=true;state.message=hasBaseline?'Checking saved public pages for text changes…':'Reading saved public pages…';draw();
   try{await createBcmBaseline(db,client.id,state.version,hasBaseline?'comparison':'baseline');await load();state.message=hasBaseline?'Comparison saved. Review the text changes in scan history.':'Baseline saved. No change findings were created.';state.view='history';}
   catch(e){state.message=e.message;try{state.scans=await loadBcmScans(db,client.id);}catch{}}
   finally{state.busy=false;if(content.isConnected)draw();}
  },true);
  const hasBaseline=(state.scans||[]).some(r=>r.status==='completed'&&r.scan_type==='baseline'&&r.settings_version===state.version);const cooling=(state.scans||[]).some(r=>r.status==='running'&&Date.now()-Date.parse(r.started_at)<120000);
  baseline.disabled=!state.saved||!!state.scanError||state.busy||state.loading||cooling;
  summary.append(baseline,el('p',hasBaseline?'Manual comparisons use the saved pages and exclusions. Scheduling is not connected.':'Manual scans use the saved public page URLs and apply excluded paths. Scheduling is not connected.','bcm-muted'));
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
  const reports=[];
  for(const run of state.scans||[]){
   if(run.status!=='completed'||run.scan_type!=='comparison'||!run.snapshot)continue;
   const baseline=(state.scans||[]).find(item=>item.id===run.baseline_id&&item.status==='completed'&&item.scan_type==='baseline');
   if(!baseline)continue;
   for(const candidate of findBcmCandidates(baseline.snapshot,run.snapshot))reports.push({run,candidate});
  }
  const latest=new Map();for(const item of reports){const key=item.candidate.type+'|'+item.candidate.term.toLocaleLowerCase();if(!latest.has(key))latest.set(key,item);}
  const p=el('section',undefined,'bcm-results-view');p.append(el('h2','Possible changes to review'));content.append(p);
  const comparisons=(state.scans||[]).filter(run=>run.status==='completed'&&run.scan_type==='comparison');
  const baseline=(state.scans||[]).some(run=>run.status==='completed'&&run.scan_type==='baseline');
  if(state.scanError)p.append(el('p',state.scanError,'bcm-error'));
  if(!comparisons.length){
   p.append(el('p',baseline?'A baseline is saved, but no comparison has been run yet. Run “Scan for changes” in Setup to compare the saved pages again.':'The first check saves a baseline. Later manual checks can be compared with it.','bcm-muted'));
   p.append(button('Go to Setup',()=>{state.view='settings';draw();}));return;
  }
  if(!latest.size){
   p.append(el('p','No specific branding cue was identified by the current text rules.','bcm-muted'));
   return;
  }
  for(const {run,candidate} of latest.values()){
   const item=el('article',undefined,'bcm-result-item');item.append(el('h3',candidate.title),el('p',candidate.term,'bcm-candidate-term'),el('p',candidate.reason,'bcm-muted'));
   const source=run.snapshot.pages?.find(page=>page.text?.includes(candidate.excerpt))?.url||run.snapshot.url;
   const evidence=el('details');evidence.append(el('summary','Review page evidence'),el('p',candidate.excerpt),el('p',source+' · '+new Date(run.finished_at||run.started_at).toLocaleDateString(),'bcm-muted'));item.append(evidence);
   const discuss=el('a','Discuss this with Venture Branding','bcm-button bcm-primary');discuss.href='new-mark.html?client='+encodeURIComponent(client.id)+'&mark='+encodeURIComponent(candidate.term);item.append(discuss);
   p.append(item);
  }
 }
 function history(){
  const p=el('section',undefined,'bcm-results-view bcm-history-view');p.append(el('h2','Scan history'));content.append(p);
  const refresh=button('Refresh scan history',async()=>{
   if(state.historyLoading)return;state.historyLoading=true;state.scanError='';draw();
   try{const scans=await loadBcmScans(db,client.id);if(drafts.get(client.id)===state)state.scans=scans;}catch(e){if(drafts.get(client.id)===state)state.scanError=e.message;}
   finally{state.historyLoading=false;if(drafts.get(client.id)===state)views.get(client.id)?.();}
  });refresh.disabled=state.historyLoading||state.loading||state.busy;p.append(refresh);
  if(state.historyLoading){showRegionLoading(p,'Loading scan history…');return;}
  if(state.scanError)p.append(el('p',state.scanError,'bcm-muted'));
  if(!state.scans?.length)p.append(el('p','No scans yet.','bcm-muted'));
  for(const run of state.scans||[]){
   const stale=run.status==='running'&&Date.now()-Date.parse(run.started_at)>120000;
   const item=el('article',undefined,'bcm-history-item');item.append(el('h3',run.status==='completed'?(run.scan_type==='comparison'?'Text comparison':'Baseline'):run.status==='failed'?'Scan failed':stale?'Scan interrupted':'Scan in progress'),el('p',new Date(run.started_at).toLocaleString(),'bcm-muted'));
   if(run.snapshot){const snapshot=run.snapshot;const urls=snapshot.urls?.length?snapshot.urls:[snapshot.url];item.append(el('p',urls.length===1?urls[0]:`${urls.length} saved pages: ${urls.join(' · ')}`,'bcm-muted'));
    if(run.scan_type==='comparison'){const baseline=(state.scans||[]).find(x=>x.id===run.baseline_id&&x.status==='completed');if(!baseline)item.append(el('p','The comparison baseline is unavailable.','bcm-muted'));else{const count=findBcmCandidates(baseline.snapshot,snapshot).length;item.append(el('p',count?`${count} possible change${count===1?'':'s'} to review in Findings.`:'No specific branding cue was identified by the current text rules.','bcm-muted'));}}
   }else if(run.status==='failed'||stale)item.append(el('p','No baseline saved. Return to Setup to retry.','bcm-muted'));
   p.append(item);
  }
 }
 if(state.loaded||state.loading)draw();else load();
}
