import {createWatchRepository} from '../../auth/watch.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const url=(page,id)=>page+'?client='+encodeURIComponent(id);
function link(text,href){const n=el('a',text,'text-link');n.href=href;return n;}
function card(title){const n=el('section',undefined,'panel connected-card');if(title)n.append(el('h2',title));return n;}
export function renderConnectedWatch(main,client,marks,db,{view='results',audience='client',repository}={}){
 const repo=repository||createWatchRepository(db,audience);let disposed=false,revision=0,state;
 const host=el('section',undefined,'watch-live');main.append(host);
 const current=t=>!disposed&&t===revision;
 const message=el('p','Loading Trademark Watch…');message.setAttribute('role','status');host.append(message);
 const note=el('p','Potential matches are research leads, not legal conclusions. This checks U.S. word names across all goods and services. It does not assess infringement, phonetic similarity, logos or international filings.','muted');
 const errors=el('p');errors.setAttribute('role','alert');
 if(!repo.enabled){host.replaceChildren(el('p','Trademark Watch is awaiting activation. Monitoring is not running.'),note);return ()=>{disposed=true;repo.clear();};}
 async function reload(){const ticket=++revision;message.textContent='Loading Trademark Watch…';host.replaceChildren(message);try{const value=await repo.load(client.id);if(!current(ticket))return;state=value;draw();}catch(error){if(current(ticket)){host.replaceChildren(el('p',error.message),button('Retry',reload));}}}
 function button(text,action){const n=el('button',text,'text-link');n.type='button';n.onclick=action;return n;}
 async function mutate(action,control){const ticket=revision;control.disabled=true;errors.textContent='';try{await action();if(current(ticket))await reload();}catch(error){if(current(ticket))errors.textContent=error.message;}finally{if(current(ticket))control.disabled=false;}}
 function draw(){host.replaceChildren(note,errors);errors.textContent='';
  const settings=state.settings,last=state.runs[0],status=card('Monitoring status');
  const sourceDelayed=!state.latest_source_date||Date.parse(state.latest_source_date+'T00:00:00Z')<Date.now()-3*86400000;
  const overdue=settings.next_run_at&&Date.parse(settings.next_run_at)<Date.now();
  const label=!state.ready?'Awaiting service activation':!settings.enabled?'Paused':sourceDelayed?'Needs attention — source data is delayed':overdue?'Check pending — scheduled time has passed':last?.status==='incomplete'?'Needs attention — last check incomplete':last?'Monitoring enabled':'Monitoring enabled — first check pending';
  status.append(el('p',label),el('p','Source data through: '+(state.latest_source_date||'No completed source files')),el('p','Next check: '+(settings.next_run_at?new Date(settings.next_run_at).toLocaleString():'Not scheduled')));
  if(last)status.append(el('p','Last attempt: '+new Date(last.checked_at).toLocaleString()+' · '+last.status));
  host.append(status);
  if(audience==='staff'){host.append(el('h2','Attorney review'),el('p','Private notes remain private. Approve a client summary to publish this evidence, or dismiss/withdraw a finding. Approval is a review action, not a legal conclusion.'));findingList(state.findings,true);history();return;}
  if(view==='setup')setup();else if(view==='detail'){
   const id=new URLSearchParams(location.search).get('finding');const f=state.findings.find(f=>f.id===id);
   host.append(link('← Back to Watch',url('watch.html',client.id)));if(f)findingList([f]);else host.append(el('p','Finding unavailable or withdrawn.'));
  }else{
   host.append(link('Edit Watch settings →',url('trademark-watch.html',client.id)));
   const search=el('input');search.type='search';search.placeholder='Search approved findings';search.setAttribute('aria-label','Search approved findings');host.append(search);
   const list=el('section');host.append(list);const show=()=>{list.replaceChildren();findingList(state.findings.filter(f=>[f.evidence?.name,f.serial,f.summary].join(' ').toLowerCase().includes(search.value.trim().toLowerCase())),false,list);};search.oninput=show;show();history();
  }
 }
 function setup(){
  const c=card('Marks to monitor'),form=el('form');form.onsubmit=e=>e.preventDefault();const choices=[];
  for(const mark of marks.filter(m=>m.mark_type==='word')){const label=el('label',undefined,'watch-choice'),input=el('input');input.type='checkbox';input.checked=state.settings.mark_ids.includes(mark.id);label.append(input,el('span',mark.name));form.append(label);choices.push({mark,input});}
  if(!choices.length)form.append(el('p','Your attorney must add a word mark to your portfolio first.'));
  form.append(el('p','Choose up to ten marks. Weekly checks include recently filed applications appearing in the source within a 30-day lookback. Older late arrivals and source omissions may be missed.'));
  const selected=()=>choices.filter(x=>x.input.checked).map(x=>x.mark.id);
  const save=button('Save selection',()=>mutate(()=>repo.save(client.id,state,selected(),state.settings.enabled),save));
  const toggle=button(state.settings.enabled?'Pause monitoring':'Start weekly monitoring',()=>mutate(()=>repo.save(client.id,state,selected(),!state.settings.enabled),toggle));
  toggle.disabled=!state.settings.enabled&&!state.ready;form.append(save,toggle);
  form.append(el('p','Text method: exact normalized names, or up to two letter edits for names of 5–80 characters. ASCII letter/digit comparison; non-ASCII characters are not assessed. All goods and services. Applications without filing dates or mark wording are excluded. No email or SMS delivery in this MVP.'));
  c.append(form,link('View Watch findings →',url('watch.html',client.id)));host.append(c);
 }
 function findingList(findings,staff=false,parent=host){
  if(!findings.length){parent.append(el('p',staff?'No findings awaiting or retained for review.':'No attorney-approved findings to display. This does not mean a clearance search found no conflicts.'));return;}
  for(const f of findings){const e=f.evidence||{},c=card(e.name||'Potential match');
   c.append(el('p','Monitored name: '+(e.monitored_name||'Unavailable')),el('p','Serial '+f.serial+' · Filed '+(e.filing_date||'Unavailable')),el('p',f.reason||''),el('p','Classes: '+((e.classes||[]).join(', ')||'Not supplied')));
   for(const g of e.goods||[])c.append(el('p','Class '+g.class+': '+g.text));
   c.append(el('p','Listed owner names (may include historical names): '+((e.owners||[]).join('; ')||'Not supplied')),el('p','Source status code: '+(e.status_code||'Unavailable')),
    el('p','Source file: '+(e.source_file||'Unavailable')+' · data date '+(e.source_date||'Unavailable')),
    el('p','Record checked: '+(e.checked_at?new Date(e.checked_at).toLocaleString():'Unavailable')),
    link('Open official USPTO record','https://tsdr.uspto.gov/#caseNumber='+encodeURIComponent(f.serial)+'&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch'));
   if(staff){c.append(el('p','Review status: '+f.review_status));
    const noteLabel=el('label','Private attorney note'),privateNote=el('textarea');privateNote.value=f.private_note||'';privateNote.maxLength=4000;noteLabel.append(privateNote);
    const summaryLabel=el('label','Client summary'),summary=el('textarea');summary.value=f.publication?.summary||'';summary.maxLength=2000;summaryLabel.append(summary);c.append(noteLabel,summaryLabel);
    for(const [label,decision] of [['Save note / return to review','unreviewed'],['Dismiss / withdraw','dismissed'],['Approve for client','approved']]){const b=button(label,()=>mutate(()=>repo.review(client.id,f,decision,privateNote.value,summary.value),b));c.append(b);}
   }else{c.append(el('p',f.summary||''),el('p','Attorney reviewed: '+(f.reviewed_at?new Date(f.reviewed_at).toLocaleString():'Unavailable')));if(view!=='detail')c.append(link('View finding →',url('watch-finding.html',client.id)+'&finding='+encodeURIComponent(f.id)));}
   parent.append(c);
  }
  if(state.findings.length>=state.limit)parent.append(el('p','Showing the newest '+state.limit+' findings. Older findings are retained but not listed here.'));
 }
 function history(){const c=card('Recent check history');if(!state.runs.length)c.append(el('p','No checks completed yet.'));for(const r of state.runs){c.append(el('p',new Date(r.checked_at).toLocaleString()+' · '+r.status+' · source files '+r.coverage_from+' through '+(r.coverage_to||'unavailable')));if(r.missing_dates?.length)c.append(el('p','Missing source dates: '+r.missing_dates.join(', ')));}host.append(c);}
 reload();return ()=>{disposed=true;revision++;repo.clear();};
}
