import {createAccountProgressStore,mergeBrowserProgress} from './llk-progress-store.mjs?v=1';
import {memberContext} from '../../auth/member-session.mjs?v=1';
import {renderBusiness,savedBusinessName} from './llk-business.mjs?v=member-account-2';
import {icon} from './llk-icons.mjs';
import {createMasterAtlas} from './llk-atlas.mjs?v=company-label-1';
import {renderSavedMilestone} from './llk-milestone.mjs';
import {isTrademarkProtectionRoute,brandMilestones} from './llk-trademark.mjs';
import {isVibeConsiderationsRoute,vibeMilestones} from './llk-vibe-coding.mjs';
import {categories,categoryTasks,milestones,savedMilestones,emptyProgress,decodeProgress,milestoneStatus} from './llk-data.mjs';
const key='vb-llk-prototype-v1'+(memberContext?':'+memberContext.user.id:'');let progress=emptyProgress(), storageAvailable=true, listView=false, diagramObserver;
if(!memberContext){try{progress=decodeProgress(localStorage.getItem(key));}catch{storageAvailable=false;}}
let accountStore, browserImport;
const expandedTasks=new Set();
const main=document.querySelector('#llk-main'), status=document.querySelector('#save-status');
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function link(text,href,cls='text-link'){const n=e('a',text,cls);n.href=href;return n;}
function persistenceMessage(){
 if(!memberContext)return storageAvailable?'Saved in this browser only':'Saving unavailable — this session only';
 return ({loading:'Loading saved progress…',saving:'Saving to your account…',saved:'Saved to your account',error:'Changes are not saved. Retry when your connection is available.',conflict:'Progress changed elsewhere. Reload saved progress before continuing.','load-error':'Saved progress could not be loaded.'})[accountStore?.state]||'Loading saved progress…';
}
function updatePersistence(){
 const message=persistenceMessage();status.textContent=message;const label=document.querySelector('#save-message');if(label)label.textContent=message;
 const retry=document.querySelector('#retry-progress');if(retry)retry.hidden=accountStore?.state!=='error';
 const reload=document.querySelector('#reload-progress');if(reload)reload.hidden=accountStore?.state!=='conflict';
 for(const input of main.querySelectorAll('input[type=checkbox],textarea,#reset-progress,#import-progress'))input.disabled=accountStore?.state==='conflict';
}
function save(id){
 if(accountStore){for(const m of savedMilestones)if(!id||id===m.id)accountStore.queue(m.id,progress);updatePersistence();return;}
 try{localStorage.setItem(key,JSON.stringify(progress));storageAvailable=true;}catch{storageAvailable=false;}
 updatePersistence();
}
async function loadAccountProgress(){
 main.replaceChildren(e('p','Loading your saved progress…','muted'));
 try{
  progress=await accountStore.load();
  let raw;try{raw=localStorage.getItem(key);}catch{}
  const old=decodeProgress(raw);browserImport=savedMilestones.some(m=>old.tasks[m.id]?.some(Boolean)||old.notes[m.id])?old:null;
  render();
 }catch{
  main.replaceChildren();heading('Your progress is unavailable','Please retry before making changes.');
  const retry=e('button','Retry loading progress','primary');retry.type='button';retry.onclick=()=>{void loadAccountProgress();};main.append(retry);
 }
}
function heading(title,description,crumb){const h=e('header',undefined,'page-heading');h.append(e('p','LEGAL LAUNCH KIT','eyebrow'));if(crumb)h.append(crumb);h.append(e('h1',title),e('p',description,'intro'));main.append(h);}
function crumbs(m){const nav=e('nav',undefined,'breadcrumbs'),category=categories.find(c=>c.id===(m?.categoryId||'formation'));nav.setAttribute('aria-label','Breadcrumb');nav.append(link('Legal Launch Kit','#'),e('span','›'));if(m)nav.append(link(category.name,'#category/'+category.id),e('span','›'),e('span',m.name));else nav.append(e('span',category.name));return nav;}
function panel(title,cls=''){const n=e('section',undefined,'panel '+cls);n.append(e('h2',title));return n;}
function node(item,href,sub,cls=''){const n=link('',href,'sphere '+cls);n.style.left=item.x+'%';n.style.top=item.y+'%';n.dataset.cluster=item.id;n.append(icon(item.id),e('strong',item.id==='formation'?'Formation &\nstructure':item.name));if(sub)n.append(e('small',sub));n.title=item.description||sub||item.name;return n;}
// Mask every connector under every visible node, including unrelated crossing lines.
// ResizeObserver keeps the cutouts circular in screen space as the map resizes.
function clipConnections(canvas,svg){
 const ns='http://www.w3.org/2000/svg',defs=document.createElementNS(ns,'defs'),mask=document.createElementNS(ns,'mask');
 mask.id='llk-node-cutouts';mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width','100');mask.setAttribute('height','100');
 const base=document.createElementNS(ns,'rect');base.setAttribute('width','100');base.setAttribute('height','100');base.setAttribute('fill','white');mask.append(base);defs.append(mask);svg.prepend(defs);
 for(const line of svg.querySelectorAll('line,path,circle,ellipse'))line.setAttribute('mask','url(#llk-node-cutouts)');
 function update(){
  if(!canvas.isConnected||!canvas.offsetWidth||!canvas.offsetHeight)return;
  mask.replaceChildren(base);
  for(const node of canvas.querySelectorAll('.sphere,.satellite')){
   if(!node.offsetWidth||!node.offsetHeight)continue;
   const hole=document.createElementNS(ns,'ellipse');
   for(const [attr,value]of Object.entries({cx:node.offsetLeft/canvas.offsetWidth*100,cy:node.offsetTop/canvas.offsetHeight*100,rx:(node.offsetWidth/2+2)/canvas.offsetWidth*100,ry:(node.offsetHeight/2+2)/canvas.offsetHeight*100}))hole.setAttribute(attr,String(value));
   hole.setAttribute('fill','black');mask.append(hole);
  }
 }
 requestAnimationFrame(()=>{if(!canvas.isConnected)return;update();diagramObserver=new ResizeObserver(update);diagramObserver.observe(canvas);});
}
function graph(items,centerName,centerSub,category){
 if(!category)return createMasterAtlas({businessName:savedBusinessName(),categories,categoryTasks,milestones:savedMilestones,progress,milestoneStatus,listView,onToggle:()=>{listView=!listView;render();},icon});
 const isVibe=category==='contracts',isBrand=category==='brand';
 const gridName=isVibe?'Vibe Coding':isBrand?'Brand Protection':'Formation';
 const section=e('section',undefined,'map-panel');section.setAttribute('aria-label',gridName+' milestone grid');const toolbar=e('div',undefined,'map-toolbar');toolbar.append(e('span',gridName.toUpperCase()+' ROADMAP','eyebrow'));const toggle=e('button',listView?'Show sphere grid':'Show list','quiet-button');toggle.type='button';toggle.onclick=()=>{listView=!listView;render();};toolbar.append(toggle);section.append(toolbar);
 const canvas=e('div',undefined,'sphere-canvas'+(listView?' list-view':''));const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.classList.add('connections');
 for(const item of items){const edge=document.createElementNS(ns,'line');for(const [key,value]of Object.entries({x1:50,y1:47,x2:item.x,y2:item.y}))edge.setAttribute(key,String(value));svg.append(edge);}canvas.append(svg);
 const center=e('div',undefined,'sphere center');center.style.left='50%';center.style.top='47%';center.append(icon(isVibe?'contracts':isBrand?'brand':'business'),e('strong',centerName),e('small',centerSub));canvas.append(center);
 for(const item of items){const state=item.tasks?milestoneStatus(progress,item):null;canvas.append(node(item,item.href||'#milestone/'+item.id,state?.label||'',state&&state.done===state.total?'complete':state?.done?'in-progress':''));}
 section.append(canvas);clipConnections(canvas,svg);section.append(e('p',memberContext?'Explore milestones in any order. Checklist progress is saved to your account.':'Explore milestones in any order. Checklist progress is saved in this browser.','map-note'));return section;
}
function master(){heading('Legal Launch Kit','See the legal landscape around your business. Choose a category to learn, plan, and take your next step.');const total=savedMilestones.reduce((sum,m)=>sum+milestoneStatus(progress,m).done,0);const stats=e('div',undefined,'stats');stats.append(e('span','7 topic areas'),e('span','Formation: '+milestones.filter(m=>milestoneStatus(progress,m).label==='Completed').length+' of 5 milestones completed'),e('span',total+' planning tasks checked'));main.append(stats,graph(categories,'Your business','Explore freely',false));const guidance=panel('Start with formation');guidance.append(e('p','Explore five Formation milestones, Trademark Protection and the Vibe Coding considerations. The other topic areas are previews.'),link('Explore Formation & structure →','#category/formation','primary'));main.append(guidance);}
function category(id){const c=categories.find(c=>c.id===id);if(!c){notFound();return;}
 if(id==='contracts'||id==='brand'){
  const nav=e('nav',undefined,'breadcrumbs');nav.setAttribute('aria-label','Breadcrumb');nav.append(link('Legal Launch Kit','#'),e('span','›'),e('span',c.name));
  heading(c.name,c.description,nav);main.append(graph(id==='brand'?brandMilestones:vibeMilestones,c.name,'1 milestone',id));return;
 }
 if(id!=='formation'){heading(c.name,c.description);main.append(link('← All categories','#'));const p=panel('Category preview');p.append(e('p','This category is planned for Phase 2. Its milestones and content are not connected in this prototype.'),link('Explore the working Formation category →','#category/formation','primary'));main.append(p);return;}
 heading(c.name,c.description,crumbs());main.append(graph(milestones,'Formation','5 planning milestones',true));}
function milestone(id){
 const m=savedMilestones.find(m=>m.id===id);if(!m){notFound();return;}
 renderSavedMilestone(main,{milestone:m,progress,accountBacked:!!memberContext,expandedTasks,
  onCheck:(id,index)=>{save(id);render();document.querySelector('#task-'+index)?.focus();},
  onNotes:id=>save(id)
 });
}
function notFound(){heading('This milestone is not available','Choose a category to continue exploring.');main.append(link('Return to Legal Launch Kit','#','primary'));}
function render(){
 diagramObserver?.disconnect();main.replaceChildren();
 const parts=isTrademarkProtectionRoute(location.hash)?['milestone','trademarks']:isVibeConsiderationsRoute(location.hash)?['milestone','considerations']:location.hash.slice(1).split('/');
 if(parts[0]==='business')renderBusiness(main,{e,link,panel,heading,refresh:render});else if(parts[0]==='category')category(parts[1]);else if(parts[0]==='milestone')milestone(parts[1]);else master();
 const note=e('div',undefined,'local-progress');const msg=e('span',persistenceMessage());msg.id='save-message';msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');note.append(msg);
 if(accountStore){
  const retry=e('button','Retry saving','quiet-button');retry.id='retry-progress';retry.type='button';retry.hidden=true;retry.onclick=()=>{void accountStore.retry();};
  const reload=e('button','Reload saved progress','quiet-button');reload.id='reload-progress';reload.type='button';reload.hidden=true;reload.onclick=()=>{if(confirm('Reload account progress and discard the unsaved checklist and note changes on this page?'))void loadAccountProgress();};note.append(retry,reload);
  if(browserImport){const copy=e('button','Import saved browser progress','quiet-button');copy.id='import-progress';copy.type='button';copy.onclick=()=>{if(!confirm('Copy this browser’s saved progress into '+memberContext.company.name+'? Existing account checkmarks and notes will be kept.'))return;progress=mergeBrowserProgress(progress,browserImport);browserImport=null;save();render();};note.append(copy);}
 }
 const reset=e('button',memberContext?'Reset milestone progress':'Reset prototype progress','quiet-button');reset.id='reset-progress';reset.type='button';reset.onclick=()=>{if(!confirm(memberContext?'Reset the checklists and planning notes saved to this company’s account?':'Reset this prototype’s checklist progress and notes in this browser?'))return;progress=emptyProgress();save();render();};note.append(reset);main.append(note);updatePersistence();
}
window.addEventListener('hashchange',()=>{if(!accountStore||!['loading','load-error'].includes(accountStore.state)){render();main.focus();}});
if(memberContext){
 accountStore=createAccountProgressStore({db:memberContext.db,companyId:memberContext.company?.id,onState:updatePersistence});
 window.addEventListener('beforeunload',event=>{if(accountStore.hasPending){event.preventDefault();event.returnValue='';}});
 await loadAccountProgress();
}else render();
