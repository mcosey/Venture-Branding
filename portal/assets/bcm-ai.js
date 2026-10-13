import {collectBaseline} from '../../auth/bcm-baseline.mjs';
import {loadAiWorkspace,runAiResearch,reviewAiFinding,setAiMonitoring,assertProduction} from '../../auth/bcm-ai.mjs?v=20261012-baseline-map';
import {saveBcmSettings,bcmCategories} from '../../auth/bcm.mjs';
import {showRegionLoading} from '../../shared/loading.mjs';

export function aiBcmEnabled(db,config=window.VB_AUTH_CONFIG){
 return config?.environment==='bcm-production' && config.bcmEnabled===true && config.url==='https://omvkwiosonatswocbdgx.supabase.co' && db.supabaseUrl===config.url;
}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function link(text,href){const n=el('a',text,'text-link');n.href=href;return n;}
function button(text,action,primary=false){const n=el('button',text,'bcm-button'+(primary?' bcm-primary':''));n.type='button';n.onclick=action;return n;}
function panel(title){const n=el('section',undefined,'panel bcm-panel');n.append(el('h2',title));return n;}
function sourceURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}

// Each mounted workspace owns its state. Disposing it invalidates pending reads/writes.
export function renderAiBcm(main,client,db,{audience='client',initialView='settings'}={}){
 assertProduction(db);if(!aiBcmEnabled(db)||!['client','staff'].includes(audience))throw Error('BCM is not enabled for this portal.');
 const root=el('section',undefined,'bcm-ai'),notice=el('p',undefined,'bcm-muted'),tabs=el('nav',undefined,'bcm-tabs'),content=el('div');
 notice.textContent='Public website research. Some pages and changes may be missed. Newly observed does not mean newly launched. Sign-in pages and image-only logos are outside this monitor.';
 tabs.setAttribute('aria-label','Brand Change Monitor views');
 root.append(notice,tabs,content);main.append(root);
 let alive=true,generation=0,busy=false,state,view=audience==='staff'?'queue':initialView==='updates'?'updates':'settings',status='',filter='needs_review';
 const current=ticket=>alive&&root.isConnected&&ticket===generation;
 const availableViews=audience==='staff'?[['queue','Private review queue'],['history','Research history']]:[['settings','Settings'],['updates','Reviewed updates'],['history','Research history']];
 const tabButtons=availableViews.map(([key,label])=>{const b=button(label,()=>{view=key;draw();});tabs.append(b);return {key,b};});
 async function reload(){
  const ticket=++generation;busy=true;const finish=showRegionLoading(content,'Loading Brand Change Monitor…','settings');tabButtons.forEach(({b})=>b.disabled=true);
  try{const data=await loadAiWorkspace(db,audience,client.id);if(!current(ticket))return;state=data;status='';busy=false;finish();draw();}
  catch(error){if(!current(ticket))return;state=null;busy=false;finish();content.replaceChildren(el('p',error.message,'bcm-error'),button('Retry loading',reload));tabButtons.forEach(({b})=>b.disabled=true);}
 }
 async function act(work,message){
  if(busy||!state)return;const ticket=++generation;busy=true;status='Saving or checking your request…';draw();
  try{await work();const data=await loadAiWorkspace(db,audience,client.id);if(!current(ticket))return;state=data;status=message;}
  catch(error){if(!current(ticket))return;state=null;status=error.message;content.replaceChildren(el('p',status,'bcm-error'),button('Reload saved records',reload));tabButtons.forEach(({b})=>b.disabled=true);}
  finally{if(current(ticket)){busy=false;content.setAttribute('aria-busy','false');draw();}}
 }
 function evidence(row){
  const n=el('article',undefined,'bcm-result-item');n.append(el('h3',row.name),el('span',({known:'Known / baseline',needs_review:'Newly observed · review needed',approved:'Attorney reviewed',dismissed:'Dismissed'})[row.state]||'Attorney reviewed','badge'),el('p',row.context));
  const details=el('details');details.append(el('summary','Supporting evidence'),el('p','AI-reported passage · verify on the source page.','bcm-muted'),el('blockquote',row.passage));
  const url=sourceURL(row.source_url);if(url){const source=link('Open supporting page ↗',url);source.target='_blank';source.rel='noopener noreferrer';details.append(source);}n.append(details);return n;
 }
 function draw(){
  if(!alive||!state)return;content.replaceChildren();tabButtons.forEach(({key,b})=>{b.disabled=busy;b.classList.toggle('selected',view===key);b.setAttribute('aria-pressed',String(view===key));});
  const message=el('p',status,'bcm-muted');message.setAttribute('role','status');content.append(message);
  if(view==='settings')settings();else if(view==='queue')queue();else if(view==='updates')updates();else history();
  content.querySelectorAll('input,select,textarea,button').forEach(n=>{if(busy)n.disabled=true;});
  content.setAttribute('aria-busy',String(busy));
 }
 function settings(){
  const cfg=state.settings,layout=el('div',undefined,'bcm-layout'),form=el('form',undefined,'bcm-form'),preferences=panel('Your website and preferences'),monitor=panel('Monitoring');
  layout.append(form,monitor);content.append(layout);form.append(preferences);
  function field(label,name,tag='input'){const wrap=el('label',label,'bcm-field'),input=el(tag);input.name=name;wrap.append(input);preferences.append(wrap);return input;}
  const url=field('Website address','url');url.type='url';url.required=true;url.value=cfg?.urls?.[0]||'';url.placeholder='https://your-business.com/';
  const frequency=field('How often','frequency','select');for(const [value,label] of [['weekly','Weekly'],['monthly','Monthly']])frequency.add(new Option(label,value));frequency.value=cfg?.frequency||'weekly';
  const categories=el('fieldset',undefined,'bcm-check-grid');categories.append(el('legend','What to look for'));preferences.append(categories);
  for(const [key,label] of Object.entries(bcmCategories).filter(([k])=>k!=='logos')){const wrap=el('label',undefined,'bcm-choice'),input=el('input');input.type='checkbox';input.name='category';input.value=key;input.checked=cfg?cfg.categories.includes(key):true;wrap.append(input,el('span',label));categories.append(wrap);}
  const exclusions=el('details',undefined,'bcm-advanced');exclusions.append(el('summary','Optional exclusions'));const wrap=el('label','Do not report evidence from these paths','bcm-field'),paths=el('textarea');paths.name='exclude';paths.rows=3;paths.value=(cfg?.exclusions||[]).join('\n');wrap.append(paths);exclusions.append(wrap,el('p','These filter reported evidence. Hosted search may still consult those pages.','bcm-muted'));preferences.append(exclusions);
  const permission=el('input');permission.type='checkbox';permission.required=true;const consent=el('label',undefined,'bcm-choice');consent.append(permission,el('span','I own this website or have permission to monitor it.'));preferences.append(consent);
  const save=el('button','Save settings','bcm-button bcm-primary');save.type='submit';preferences.append(save,el('p','Saving does not run research and pauses automatic monitoring.','bcm-muted'));
  monitor.append(el('h3','Starting reference list'),el('p',`${state.baseline?.completed??0} of 3 successful checks completed for this website.`),el('p','The first three checks collect baseline names without new-discovery alerts. Building the list can make up to three paid checks and stops on failure. Later discoveries are newly observed, not proof of a new launch.','bcm-muted'));
  const row=state.schedule,researchAllowed=state.ready&&window.VB_AUTH_CONFIG.allowBcmResearch===true;monitor.append(el('p',row?.enabled?'Monitoring is on':'Monitoring is paused'),el('p',state.ready?'Research is connected.':'Research is paused or the pilot allowance has been reached. Your settings and saved results remain available.','bcm-muted'));
  if(row?.enabled&&row.next_run_at)monitor.append(el('p','Next check: '+new Date(row.next_run_at).toLocaleString()));
  const actions=el('div',undefined,'bcm-actions'),toggle=button(row?.enabled?'Pause monitoring':'Start monitoring',()=>act(()=>setAiMonitoring(db,client.id,cfg.version,row.revision,!row.enabled),'Monitoring preference saved.'),true),run=button(state.baseline?.remaining>0?'Build starting reference list':'Run research now',()=>act(()=>collectBaseline(state,{run:(id,version)=>runAiResearch(db,id,version),load:id=>loadAiWorkspace(db,'client',id)}),'Successful checks saved. Baseline names do not create new-discovery alerts.'));
  toggle.disabled=!researchAllowed||!cfg||!row||(!row.enabled&&state.baseline?.remaining>0);run.disabled=!researchAllowed||!cfg;actions.append(toggle,run);monitor.append(actions,el('p','Run research uses the saved settings and incurs API charges. Saving settings does not run paid research.','bcm-muted'),button('Reload saved settings',reload));
  form.addEventListener('input',()=>{toggle.disabled=true;run.disabled=true;});form.addEventListener('change',()=>{toggle.disabled=true;run.disabled=true;});
  form.onsubmit=e=>{e.preventDefault();if(busy)return;const draft={urls:url.value,frequency:frequency.value==='monthly'?'Monthly':'Weekly',categories:[...categories.querySelectorAll('input:checked')].map(n=>n.value),exclude:paths.value,access:'public',discovery:'site'};act(()=>saveBcmSettings(db,client.id,cfg?.version||0,draft,permission.checked),'Settings saved. Monitoring remains paused.');};
 }
 function updates(){const p=panel('Attorney-reviewed updates');content.append(p);p.append(button('Refresh reviewed updates',reload));if(!state.publications.length)p.append(el('p','No reviewed updates yet. Unreviewed findings are kept in the private attorney queue.','bcm-muted'));else state.publications.forEach(row=>p.append(evidence(row)));}
 function queue(){
  const p=panel('Private attorney review');content.append(p);p.append(el('p','Verify the supporting page before approving an update. Approval shares a snapshot with this client; private notes stay private. No trademark record or client message is created automatically.','bcm-muted'));
  const controls=el('div',undefined,'bcm-actions'),select=el('select');select.setAttribute('aria-label','Finding status');for(const [value,label] of [['needs_review','Needs review'],['all','All observations'],['known','Known / baseline'],['approved','Reviewed'],['dismissed','Dismissed']])select.add(new Option(label,value));select.value=filter;select.onchange=()=>{filter=select.value;draw();};controls.append(select,button('Refresh evidence',reload));p.append(controls);
  const rows=state.observations.filter(row=>filter==='all'||row.state===filter);if(!rows.length)p.append(el('p','No findings in this view.','bcm-muted'));
  for(const row of rows){const card=evidence(row);p.append(card);if(row.matched_mark)card.append(el('p','Exact name matches an existing trademark record.','bcm-muted'));if(row.alias_of){card.append(el('p','Linked to the same asset. This name variation is remembered.','bcm-muted'));continue;}
   const form=el('form'),label=el('label','Review note (private)','bcm-field'),note=el('textarea');note.required=true;note.maxLength=1500;note.rows=2;label.append(note);form.append(label);
   const aliasLabel=el('label','Same asset (only for another name of the same asset)','bcm-field'),alias=el('select');alias.add(new Option('Choose an existing observation',''));for(const candidate of state.observations.filter(n=>n.id!==row.id&&!n.alias_of&&n.domain===row.domain))alias.add(new Option(candidate.name,candidate.id));aliasLabel.append(alias);form.append(aliasLabel);
   const actions=el('div',undefined,'bcm-actions');for(const [decision,text] of [['approve','Approve client update'],['dismiss','Dismiss / withdraw'],['alias','Link as same asset']]){const b=el('button',text,'bcm-button'+(decision==='approve'?' bcm-primary':''));b.type='submit';b.value=decision;actions.append(b);}form.append(actions);card.append(form);
   form.onsubmit=e=>{e.preventDefault();const decision=e.submitter?.value;if(busy||!decision)return;if(decision==='alias'&&!alias.value){status='Choose the same asset before linking a name variation.';draw();return;}act(()=>reviewAiFinding(db,row,decision,note.value.trim(),decision==='alias'?alias.value:null),decision==='approve'?'Reviewed snapshot shared with this client.':decision==='alias'?'Name variation linked.':'Finding dismissed and any shared update withdrawn.');};
  }
 }
 function history(){const p=panel('Research history');content.append(p);p.append(button('Refresh history',reload));if(!state.runs.length)p.append(el('p','No research runs yet.','bcm-muted'));for(const row of state.runs){const item=el('article',undefined,'bcm-history-item');item.append(el('h3',new Date(row.started_at).toLocaleString()),el('p',row.status+' · '+row.observation_count+' observations'));if(audience==='staff'&&row.coverage_note)item.append(el('p',row.coverage_note,'bcm-muted'));p.append(item);}}
 reload();
 return ()=>{alive=false;generation++;state=null;root.replaceChildren();};
}
