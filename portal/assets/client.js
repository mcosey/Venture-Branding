import {renderDigest} from './digest.js?v=20261010-digest-live';
import {renderEvidence} from './evidence.js?v=20261010-use-history';
import {renderMaintenance} from './maintenance.js?v=20261010-maintenance-live';
import {loadBrandMapBcm} from './brand-map-bcm.mjs';
import {renderBrandMap} from './brand-map.js?v=20261010-bcm-display';
import {renderBrandMonitor,clearBrandMonitorDrafts} from './brand-monitor.js?v=20261009-bcm-public-pages';
import {renderWatchDetail} from './watch-detail.js';
import {renderWatchResults} from './watch-results.js';
import {renderWatchSetup,renderAgentCards} from './watch-setup.js?v=20261010-digest';
import {renderNewMark,clearMarkDrafts} from './new-mark.js?v=20261008-bcm-candidates';
import {createConnection,loadRecords,typeLabel,statusLabel} from '../../auth/connection.mjs';
import {setupGate,showConnectionError} from '../../auth/gate.mjs?v=20261010-bcm-preview';
let db;try{db=createConnection('client');}catch(error){showConnectionError('client');throw error;}
const gate=setupGate(db,'client');
const main=document.querySelector('main'),page=main.dataset.page;
const homeLink=document.querySelector('#portal-nav a[href="portal.html"]');
if(homeLink){for(const node of homeLink.childNodes)if(node.nodeType===3&&node.textContent.includes('Dashboard'))node.textContent='Brand Map';}
let records,selectedId,mapRevision=0,evidenceDispose=()=>{};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){evidenceDispose();mapRevision++;records=null;selectedId=null;main.replaceChildren();clearMarkDrafts();clearBrandMonitorDrafts();}});
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function link(text,href,cls='text-link'){const n=el('a',text,cls);n.href=href;return n;}
function panel(title,text){const n=el('section',undefined,'panel connected-card');n.append(el('h2',title));if(text)n.append(el('p',text,'muted'));return n;}
function markList(marks){const wrap=el('div');if(!marks.length)wrap.append(el('p','No trademarks yet.','connected-empty'));for(const m of marks){const row=link('',`trademark.html?mark=${encodeURIComponent(m.id)}&client=${encodeURIComponent(selectedId)}`,'connected-row');const info=el('span',m.name);info.append(el('small',typeLabel(m.mark_type)));row.append(info,el('span',statusLabel(m.status),'badge'),el('span','View →'));wrap.append(row);}return wrap;}
function render(){
 evidenceDispose();evidenceDispose=()=>{};
 const mapTicket=++mapRevision;
 if(!records)return;
 const client=records.clients.find(c=>c.id===selectedId);if(!client)throw new Error('This client is not available to your account.');
 const marks=records.marks.filter(m=>m.client_id===client.id);
 document.querySelector('#client-name').textContent=client.name;
 const choice=document.querySelector('#client-choice');choice.replaceChildren(...records.clients.map(c=>new Option(c.name,c.id)));choice.value=selectedId;choice.parentElement.hidden=records.clients.length<2;
 if(page==='portal'){
  const update=renderBrandMap(main,client,records.marks,{status:'loading'});
  const current=()=>mapTicket===mapRevision&&!document.hidden;
  loadBrandMapBcm(db,client.id).then(state=>{if(current())update(state);},()=>{if(current())update({status:'error'});});
  return;
 }
 main.replaceChildren();const heading=el('section',undefined,'portfolio-heading');const h=el('div');h.append(el('p','CLIENT PORTAL','eyebrow'),el('h1',({portal:'Welcome, '+client.contact_name,portfolio:'Trademark Portfolio','new-mark':'Add New Mark',automations:'VB Agents','brand-monitor':'Brand Change Monitor','watch-setup':'Trademark Watch',trademark:'Trademark',watch:'Trademark Watch','use-history':'Use History',digest:'Trademark Activity Digest',inbox:'Messages',maintenance:'Maintenance Reminder'})[page]));heading.append(h);if(['portal','portfolio'].includes(page))heading.append(link('+ Add New Mark',`new-mark.html?client=${encodeURIComponent(client.id)}`,'mark-primary'));main.append(heading);
 if(page==='new-mark'){renderNewMark(main,client);
 }else if(page==='portfolio'){
  const search=el('input',undefined,'connected-search');search.type='search';search.placeholder='Search your trademarks';search.setAttribute('aria-label','Search trademarks');
  const list=panel('Your marks');list.append(markList(marks));search.addEventListener('input',()=>{list.replaceChildren(el('h2','Your marks'),markList(marks.filter(m=>[m.name,m.application_number,m.registration_number].filter(Boolean).join(' ').toLowerCase().includes(search.value.toLowerCase()))));});main.append(search,list);
 }else if(page==='trademark'){
  const id=new URLSearchParams(location.search).get('mark');const mark=marks.find(m=>m.id===id);
  if(!mark){main.append(panel('Trademark not found','This record is not available in your portfolio.'),link('Back to portfolio →','portfolio.html'));return;}
  h.querySelector('h1').textContent=mark.name;const card=panel('Trademark details');const dl=el('dl',undefined,'connected-fields');
  for(const [label,value] of [['Type',typeLabel(mark.mark_type)],['Status',statusLabel(mark.status)],['USPTO status',mark.uspto_status_text||'Not retrieved'],['Application number',mark.application_number||'Not provided'],['Registration number',mark.registration_number||'Not provided'],['Owner',mark.record_owner||'Not provided'],['Filing date',mark.filing_date||'Not provided'],['Registration date',mark.registration_date||'Not provided'],['USPTO status date',mark.uspto_status_date||'Not provided'],['Last retrieved',mark.source_checked_at?new Date(mark.source_checked_at).toLocaleString():'Not retrieved'],['Source',mark.source==='uspto'?'USPTO':'Entered by Venture Branding']]){const item=el('div');item.append(el('dt',label),el('dd',value));dl.append(item);}card.append(dl);main.append(link('← Portfolio','portfolio.html'),card,link('View or upload evidence →',`use-history.html?client=${encodeURIComponent(client.id)}&mark=${encodeURIComponent(mark.id)}`),panel('Deadlines','No verified deadlines recorded.'));
 }else if(page==='maintenance'){renderMaintenance(main,client,marks,db);
 }else if(page==='automations'){renderAgentCards(main,client);
 }else if(page==='brand-monitor'){renderBrandMonitor(main,client,db);
 }else if(page==='watch-setup'){renderWatchSetup(main,client,marks);
 }else if(page==='watch-detail'){renderWatchDetail(main,client,marks);
 }else if(page==='watch'){renderWatchResults(main,client);}
 else if(page==='digest'||page==='inbox')evidenceDispose=renderDigest(main,client,db,{view:page==='inbox'?'inbox':'settings'});
 else if(page==='use-history')evidenceDispose=renderEvidence(main,client,marks,db);
}
async function refresh(){mapRevision++;const ticket=gate.lock();try{const loaded=await loadRecords(db,'client');if(!gate.current(ticket))return;records=loaded;if(!records.clients.length)throw new Error('No active client workspace is assigned to this account.');const requested=new URLSearchParams(location.search).get('client');selectedId=selectedId||requested||records.clients[0].id;render();gate.unlock(ticket);}catch(error){if(!gate.current(ticket))return;main.replaceChildren();gate.lock(error.message);}}
document.querySelector('#client-choice').addEventListener('change',event=>{selectedId=event.target.value;render();});
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#portal-nav');menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
document.querySelector('#messages-button')?.addEventListener('click',()=>{location.href='messages.html?client='+encodeURIComponent(selectedId);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){evidenceDispose();mapRevision++;gate.lock();main.replaceChildren();}else refresh();});
window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
await refresh();
