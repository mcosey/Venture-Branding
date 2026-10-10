import {brandMapModel,mapPage,recordLink} from './brand-map-model.mjs';

const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
function link(text,href){const node=el('a',text,'bm-link');node.href=href;return node;}
function button(text,label,action){const node=el('button',text);node.type='button';if(label)node.setAttribute('aria-label',label);node.addEventListener('click',action);return node;}
function dateLabel(value){if(!value)return 'Not retrieved';const date=new Date(value);return Number.isNaN(date.getTime())?'Not retrieved':date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}

export function renderBrandMap(main,client,records,bcmState={status:"loading"}){
 const model=brandMapModel(client,records);
 let selected=null,page=0,zoom=1;
 let bcm={status:"loading"},nodes=model.marks;
 const monitorUrl=`brand-monitor.html?client=${encodeURIComponent(model.clientId)}`;
 const root=el('div',undefined,'bm-home');
 const intro=el('section',undefined,'bm-intro');intro.append(el('h1','Brand Map'),el('p','Your saved trademarks and possible branding changes, together.'));
 const portfolioUrl=`portfolio.html?client=${encodeURIComponent(model.clientId)}`;
 intro.append(link('View Portfolio →',portfolioUrl));root.append(intro);
 const summary=el('section',undefined,'bm-summary');summary.setAttribute('aria-label','Saved trademark record counts');
 for(const [count,label,icon] of [[model.counts.total,'Trademark records','◉'],[model.counts.registered,'Registered','✓'],[model.counts.pending,'Pending','◷'],[model.counts.inactive,'Inactive records','○']]){
  const stat=el('div',undefined,'bm-stat');const symbol=el('span',icon,'bm-stat-icon');symbol.setAttribute('aria-hidden','true');stat.append(symbol,el('strong',String(count)),el('span',label));summary.append(stat);
 }root.append(summary);
 const layout=el('div',undefined,'bm-layout');const ecosystem=el('section',undefined,'bm-ecosystem');ecosystem.setAttribute('aria-labelledby','bm-map-heading');
 const toolbar=el('div',undefined,'bm-toolbar');const title=el('h2','Brand ecosystem','bm-eyebrow');title.id='bm-map-heading';const controls=el('div',undefined,'bm-controls');controls.setAttribute('aria-label','Map zoom');
 const zoomValue=el('output','100%');zoomValue.setAttribute('aria-live','polite');
 const zoomIn=button('+','Zoom in',()=>setZoom(zoom+.15)),zoomOut=button('−','Zoom out',()=>setZoom(zoom-.15));
 const reset=button('Reset','Reset map zoom and position',()=>{setZoom(1);viewport.scrollTop=0;viewport.scrollLeft=0;});controls.append(zoomValue,zoomIn,zoomOut,reset);toolbar.append(title,controls);ecosystem.append(toolbar);
 const viewport=el('div',undefined,'bm-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Portfolio map. Scroll to explore when zoomed.');
 const canvas=el('div',undefined,'bm-canvas');canvas.setAttribute('role','group');canvas.setAttribute('aria-label','Company workspace, saved trademark records, and possible detected branding');viewport.append(canvas);ecosystem.append(viewport);
 const pager=el('div',undefined,'bm-pager');pager.setAttribute('aria-label','Record pages');const previous=button('← Previous',null,()=>showPage(page-1,true));const pageLabel=el('span');pageLabel.setAttribute('aria-live','polite');const next=button('Next →',null,()=>showPage(page+1,true));pager.append(previous,pageLabel,next);ecosystem.append(pager);
 const legend=el('p','Solid lines: trademark records. Dashed lines: possible monitor findings. Lines show workspace membership, not ownership or parent-brand relationships.','bm-legend');ecosystem.append(legend);layout.append(ecosystem);
 const right=el('div',undefined,'bm-right');const detail=el('section',undefined,'bm-detail');detail.setAttribute('aria-labelledby','bm-detail-title');
 const back=button('↑ Back to map',null,()=>{const node=[...canvas.querySelectorAll('button')].find(node=>node.dataset.markId===(selected||''));node?.focus();node?.scrollIntoView({block:'center'});});back.className='bm-back';detail.append(back,el('p','Selected record','bm-eyebrow'));
 const detailTitle=el('h2');detailTitle.id='bm-detail-title';detailTitle.tabIndex=-1;const subtitle=el('p',undefined,'bm-subtitle'),facts=el('dl',undefined,'bm-facts'),detailsLink=link('View trademark details →',portfolioUrl);detail.append(detailTitle,subtitle,facts,detailsLink);right.append(detail);
 const activity=el('section',undefined,'bm-support');
 const attention=el('section',undefined,'bm-support');
 right.append(activity,attention);layout.append(right);root.append(layout);main.replaceChildren(root);

 function setZoom(value){zoom=Math.max(.75,Math.min(1.5,Math.round(value*100)/100));canvas.style.transform=`scale(${zoom})`;zoomValue.textContent=`${Math.round(zoom*100)}%`;zoomIn.disabled=zoom===1.5;zoomOut.disabled=zoom===.75;}
 function field(label,value){const row=el('div');row.append(el('dt',label),el('dd',value));facts.append(row);}
 function select(id,moveFocus=false){
  const mark=nodes.find(mark=>mark.id===id);selected=mark?.id||null;
  for(const node of canvas.querySelectorAll('button[data-mark-id]'))node.setAttribute('aria-pressed',String(node.dataset.markId===(selected||'')));
  facts.replaceChildren();
  detail.querySelector('.bm-eyebrow').textContent=mark?(mark.kind==='detected'?'Possible monitor finding':'Selected record'):'Company workspace';
  if(mark?.kind==='detected'){detailTitle.textContent=mark.name;subtitle.textContent=mark.type;field('Review status','Unconfirmed · not a trademark record');field('Detected',dateLabel(mark.detectedAt));field('Source page',mark.sourceUrl);field('Observed text',mark.excerpt);field('Why shown',mark.reason);detailsLink.href=monitorUrl;detailsLink.textContent='Review in Brand Change Monitor →';}
  else if(mark){detailTitle.textContent=mark.name;subtitle.textContent=`${mark.type} · legal record`;field('Record status',mark.status);field('USPTO status',mark.usptoStatus);field('Owner',mark.owner);field('Source',mark.source);field('Last retrieved',dateLabel(mark.sourceCheckedAt));detailsLink.href=recordLink(model.clientId,mark.id);detailsLink.textContent='View trademark details →';}
  else{detailTitle.textContent=model.company;subtitle.textContent='Company workspace · not a master-brand designation';field('Saved records',String(model.counts.total));field('Relationships','Not recorded');detailsLink.href=portfolioUrl;detailsLink.textContent='View Portfolio →';}
  if(moveFocus){detailTitle.focus({preventScroll:true});if(window.matchMedia('(max-width:1439px)').matches)detail.scrollIntoView({block:'start'});}
 }
 function showPage(requested,moveFocus=false){
  const view=mapPage(nodes,requested);page=view.current;selected=null;setZoom(1);viewport.scrollTop=0;viewport.scrollLeft=0;canvas.replaceChildren();
  const orbits=document.createElementNS('http://www.w3.org/2000/svg','svg');orbits.setAttribute('viewBox','0 0 800 640');orbits.setAttribute('class','bm-lines');orbits.setAttribute('aria-hidden','true');
  for(const radius of [165,245,300]){const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx','400');circle.setAttribute('cy','320');circle.setAttribute('r',radius);circle.setAttribute('class','bm-orbit');orbits.append(circle);}
  canvas.append(orbits);
  const company=button(model.company,'Company workspace: '+model.company,()=>select(null,true));company.className='bm-node bm-company';company.dataset.markId='';company.setAttribute('aria-controls',detail.id='bm-detail');company.setAttribute('aria-pressed','true');company.append(el('small','Company workspace'));canvas.append(company);
  for(const {mark,x,y} of view.items){
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value] of Object.entries({x1:400,y1:320,x2:x*8,y2:y*6.4}))line.setAttribute(key,String(value));line.setAttribute('class',mark.kind==='detected'?'bm-edge bm-detected-edge':'bm-edge');orbits.append(line);
   const node=button(undefined,null,()=>select(mark.id,true));node.className=mark.kind==='detected'?'bm-node bm-detected':'bm-node';node.dataset.markId=mark.id;node.style.left=`${x}%`;node.style.top=`${y}%`;node.setAttribute('aria-pressed','false');node.setAttribute('aria-controls',detail.id);
   node.append(el('span',mark.kind==='detected'?'Possible monitor finding':mark.type+' mark','bm-type'),el('strong',mark.name),el('span',mark.status,'bm-record-status'));canvas.append(node);
  }
  if(!view.items.length){canvas.classList.add('bm-empty-canvas');const empty=el('p','No trademark records or monitor findings are available in this workspace yet.','bm-empty');canvas.append(empty);}else canvas.classList.remove('bm-empty-canvas');
  pager.hidden=view.pages===1;previous.disabled=page===0;next.disabled=page===view.pages-1;pageLabel.textContent=`${page+1} of ${view.pages} · ${view.items.length} of ${nodes.length} items`;
  controls.hidden=!view.items.length;select(null);if(moveFocus)company.focus();
 }
 function updateBcm(state){
  // Ignore mismatched workspace data even if a caller supplies it accidentally.
  bcm=state?.status==='ready'&&state.clientId!==model.clientId?{status:'error'}:state||{status:'error'};
  const previousSelection=selected,previousPage=page,previousZoom=zoom;
  nodes=[...model.marks,...(bcm.status==='ready'?bcm.findings:[])];
  activity.replaceChildren(el('h2','Recent brand activity','bm-eyebrow'));
  attention.replaceChildren(el('h2','Detected branding','bm-eyebrow'));
  if(bcm.status==='loading'){
   activity.append(el('p','Loading saved monitor activity…'));attention.append(el('p','Loading possible branding changes…'));
  }else if(bcm.status==='error'){
   activity.append(el('p','Saved monitor results could not be loaded. Your trademark records are still available.'));
   attention.append(el('p','Detected branding is unavailable. Open the monitor or reload this page to try again.'));
  }else{
   if(!bcm.activity.length)activity.append(el('p','No saved monitor scans yet.'));
   for(const item of bcm.activity){const row=el('p',undefined,'bm-activity-item');row.append(el('strong',item.label),el('span',dateLabel(item.date)));activity.append(row);}
   attention.append(el('h3',`${bcm.findings.length} possible change${bcm.findings.length===1?'':'s'}`));
   attention.append(el('p',bcm.findings.length?'Select a dashed-line card to see the observed text and source. Findings need review; they are not confirmed assets.':bcm.compared?'No specific branding cue was found in the available comparisons.':'A completed comparison with its baseline is needed to identify changes.'));
   if(bcm.missingBaselines)attention.append(el('p','Some saved comparisons could not be matched to their baseline; those findings are unavailable.'));
   attention.append(el('p','Based on the 10 most recent saved scans. Text detections are not a complete asset inventory and do not identify logo images.'));
  }
  activity.append(link('Open Brand Change Monitor →',monitorUrl));
  attention.append(link('Review monitor findings →',monitorUrl));
  showPage(previousPage);setZoom(previousZoom);select(previousSelection);
 }
 updateBcm(bcmState);
 return updateBcm;
}
