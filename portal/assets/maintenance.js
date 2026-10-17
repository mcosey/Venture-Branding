import {showRegionLoading} from '../../shared/loading.mjs';
import {MAINTENANCE_ENABLED,loadMaintenancePublications} from '../../auth/maintenance.mjs?v=20261010-maintenance-live';
// Read-only client screen for attorney-verified publications.
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const examples=[
 {name:'BRIGHT TRAIL',status:'Needs attention',window:'Oct 1, 2026 – Mar 31, 2027',deadline:'Mar 31, 2027',next:'Discuss your current use of this mark with your attorney.'},
 {name:'NORTHSTAR STUDIO',status:'Upcoming',window:'Jul 1, 2027 – Dec 31, 2027',deadline:'Dec 31, 2027',next:'Your attorney will confirm what is needed before filing.'}
];
export function renderMaintenance(main,client,marks=[],db=null,enabled=MAINTENANCE_ENABLED){
 const back=el('a','← Back to VB Agents','maintenance-back');back.href='automations.html?client='+encodeURIComponent(client.id);main.prepend(back);
 main.append(el('p','Keep track of upcoming maintenance dates for your registered trademarks.','maintenance-intro'));
 const tools=el('div',undefined,'maintenance-tools'),label=el('span','Verified dates are not connected yet.','maintenance-preview'),toggle=el('button','View design example','maintenance-example-toggle');toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','maintenance-list');tools.append(label,toggle);main.append(tools);
 const list=el('section',undefined,'panel maintenance-list');list.id='maintenance-list';list.setAttribute('aria-labelledby','maintenance-list-title');main.append(list);
 let showingExamples=false,published=[],loading=enabled,loadError=false,finishLoading;
 toggle.hidden=enabled;
 function renderList(){
  finishLoading?.();finishLoading=null;
  list.setAttribute('aria-busy','false');list.replaceChildren();const title=el('h2',showingExamples?'Upcoming maintenance · Example':'Maintenance dates');title.id='maintenance-list-title';list.append(title);
  if(!showingExamples&&loading){finishLoading=showRegionLoading(list,'Loading maintenance dates…');return;}
  if(!showingExamples&&loadError){list.append(el('p','Maintenance dates could not be loaded. Try reloading this page.','maintenance-empty'));return;}
  if(!showingExamples&&!published.length){const empty=el('div',undefined,'maintenance-empty');empty.append(el('p','No verified maintenance dates are available yet.'),el('p','This does not mean nothing is due. Your attorney must confirm the dates for your marks.','muted'));const links=el('div',undefined,'maintenance-empty-actions'),portfolio=el('a','View Portfolio →','maintenance-record-link'),discuss=el('a','Discuss with Attorney','maintenance-discuss');portfolio.href='portfolio.html?client='+encodeURIComponent(client.id);discuss.href='new-mark.html?client='+encodeURIComponent(client.id);links.append(portfolio,discuss);empty.append(links,el('p','The discussion link opens the existing intake. It does not send a request or book a call.','maintenance-hint'));list.append(empty);return;}
  for(const item of showingExamples?examples:published){
   const row=el('article',undefined,'maintenance-row'),grid=el('div',undefined,'maintenance-row-grid'),mark=el('div',undefined,'maintenance-mark');mark.append(el('h3',item.name));if(showingExamples)mark.append(el('span','Fictional record · no Portfolio link','maintenance-hint'));else{const record=el('a','View Portfolio record →','maintenance-record-link');record.href='trademark.html?client='+encodeURIComponent(client.id)+'&mark='+encodeURIComponent(item.markId);mark.append(record);}
   const kind=el('div');kind.append(el('p',item.description||'Maintenance filing'),el('span',item.status,'maintenance-status'+(item.status==='Needs attention'?' needs-attention':'')));
   const dates=el('dl',undefined,'maintenance-dates');for(const [term,value] of [['Filing window',item.window],['Deadline',item.deadline]]){const pair=el('div');pair.append(el('dt',term),el('dd',value));dates.append(pair);}grid.append(mark,kind,dates);
   const bottom=el('div',undefined,'maintenance-row-bottom'),next=el('div');next.append(el('p','Next step','maintenance-hint'),el('p',item.next));const button=el(showingExamples?'button':'a','Discuss with Attorney','maintenance-discuss');if(showingExamples){button.type='button';button.disabled=true;button.title='Example only. This fictional record cannot start a real request.';}else{button.href='new-mark.html?client='+encodeURIComponent(client.id)+'&mark='+encodeURIComponent(item.name);next.append(el('p','Last verified: '+new Date(item.verifiedAt).toLocaleDateString('en-US'),'maintenance-hint'));}bottom.append(next,button);row.append(grid,bottom);list.append(row);
  }
  if(showingExamples)list.append(el('p','Fictional names and dates for design review only. Example actions are disabled.','maintenance-example-note'));
 }
 toggle.addEventListener('click',()=>{showingExamples=!showingExamples;toggle.textContent=showingExamples?'Back to client view':'View design example';toggle.setAttribute('aria-expanded',String(showingExamples));label.textContent=showingExamples?'Design preview · Fictional records and example dates':'Verified dates are not connected yet.';renderList();});renderList();
 const note=el('section',undefined,'panel maintenance-notice');note.append(el('p','Email reminders are not enabled.'),el('p',enabled?'Dates and next steps are maintained by your attorney. Discussion links open the existing intake; they do not send a request or book a call.':'Verified dates, attorney updates, and automatic reminders are not connected yet.','maintenance-hint'));main.append(note);
 if(enabled){label.textContent='Loading maintenance dates…';const dateText=value=>new Date(value+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});loadMaintenancePublications(db,client.id).then(result=>{if(!main.contains(list))return;published=result.records.flatMap(record=>{const mark=marks.find(m=>m.id===record.mark_id&&m.client_id===client.id&&!m.archived_at);return mark?[{name:mark.name,markId:mark.id,description:record.description,status:record.status,window:dateText(record.window_start)+' – '+dateText(record.window_end),deadline:dateText(record.deadline),next:record.next_step,verifiedAt:record.verified_at}]:[];});loading=false;label.textContent='Attorney-verified maintenance dates';renderList();}).catch(()=>{if(!main.contains(list))return;loading=false;loadError=true;label.textContent='Maintenance dates unavailable';renderList();});}
 const footer=el('footer','Venture Branding · Client portal','maintenance-footer');main.append(footer);
}
