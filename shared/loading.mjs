// Decorative placeholders only: never interpolate account or record data here.
export const bar = (kind='text') => `<span class="vb-skeleton vb-skeleton-${kind}"></span>`;
export const card = () => `<div class="vb-loading-card">${bar('heading')}${bar()}${bar('short')}${bar()}</div>`;
export const row = () => `<div class="vb-loading-row">${bar('short')}${bar()}${bar('short')}</div>`;
export const field = () => `<div class="vb-loading-field">${bar('short')}${bar('rectangle')}</div>`;
export function brandMapSkeleton(){
 return `<div class="vb-loading-shell" aria-hidden="true"><aside class="vb-loading-sidebar">${bar('heading')}${Array.from({length:7},()=>bar()).join('')}</aside><div class="vb-loading-workspace"><div class="vb-loading-topbar">${bar('short')}</div><div class="bm-home"><div class="bm-intro">${bar('title')}${bar()}${bar('short')}</div><div class="bm-summary">${Array.from({length:4},()=>`<div class="bm-stat">${bar('rectangle')}${bar('short')}</div>`).join('')}</div><div class="bm-layout"><div class="bm-ecosystem"><div class="bm-toolbar">${bar('short')}</div><div class="vb-loading-map">${bar('map-node')}${bar('map-node')}${bar('map-node')}</div><div class="bm-pager">${bar('short')}</div><div class="bm-legend">${bar()}</div></div><div class="bm-right">${card()}${card()}${card()}</div></div></div></div></div>`;
}

export const loadingLabels = Object.freeze({
 'brand-map':'Brand Map',portfolio:'Portfolio',trademark:'trademark details',account:'Account Settings',
 'new-mark':'mark intake',automations:'VB Agents','brand-monitor':'Brand Change Monitor',
 'watch-setup':'Trademark Watch setup',watch:'Watch','watch-detail':'Watch finding',
 'use-history':'Use History',maintenance:'Maintenance'
});
const repeat = (count,render) => Array.from({length:count},render).join('');
const panel = content => `<div class="vb-loading-card">${bar('heading')}${content}</div>`;
const formCard = count => panel(repeat(count,field)+bar('button'));
const columns = (left,right) => `<div class="vb-loading-columns"><div class="vb-loading-stack">${left}</div><div class="vb-loading-stack">${right}</div></div>`;
export function pageSkeleton(layout){
 if(layout==='brand-map')return brandMapSkeleton();
 if(!Object.hasOwn(loadingLabels,layout))return '';
 let content='';
 switch(layout){
  case 'portfolio':content=bar('search')+panel(repeat(4,row));break;
  case 'trademark':content=panel(`<div class="vb-loading-fields">${repeat(11,field)}</div>`)+card()+card();break;
  case 'account':content=`<div class="vb-loading-form">${formCard(3)}${formCard(2)}${panel(bar()+bar('button'))}</div>`;break;
  case 'new-mark':content=`<div class="vb-loading-intake">${formCard(5)}</div>`;break;
  case 'automations':content=bar()+`<div class="vb-loading-agents">${repeat(5,()=>panel(bar('rectangle')+bar()+bar()+bar('button')))}</div>`;break;
  case 'brand-monitor':content=bar('tabs')+columns(formCard(5),card());break;
  case 'watch-setup':content=bar()+columns(formCard(3)+formCard(2)+formCard(2)+card(),card()+card());break;
  case 'watch':content=bar()+columns(panel(repeat(3,field)),panel(repeat(6,row)))+bar('tabs')+card();break;
  case 'watch-detail':content=bar('tabs')+`<div class="vb-loading-pair">${card()}${card()}</div>`+panel(`<div class="vb-loading-fields">${repeat(5,field)}</div>`);break;
  case 'maintenance':content=bar()+bar('tabs')+panel(repeat(2,()=>`<div class="vb-loading-maintenance">${row()}${bar()}${bar('short')}</div>`))+card();break;
  case 'use-history':content=card();break;
 }
 return `<div class="vb-loading-shell" aria-hidden="true"><aside class="vb-loading-sidebar">${bar('heading')}${repeat(7,()=>bar())}</aside><div class="vb-loading-workspace"><div class="vb-loading-topbar">${bar('short')}</div><div class="vb-loading-page vb-loading-page-${layout}"><div class="vb-loading-page-heading">${bar('title')}</div>${content}</div></div></div>`;
}

// Region placeholders use DOM nodes so status text never requires HTML parsing.
export function showRegionLoading(target,label,kind='rows'){
 target.setAttribute('aria-busy','true');
 const status=document.createElement('p');status.className='vb-loading-status';status.setAttribute('role','status');status.textContent=label;
 const shapes=document.createElement('div');shapes.className='vb-loading-region vb-loading-region-'+kind;shapes.setAttribute('aria-hidden','true');
 const groups=kind==='settings'?5:kind==='fields'?6:2;
 for(let i=0;i<groups;i++){
  const group=document.createElement('div');group.className=kind==='fields'?'vb-loading-field':'vb-loading-card';
  for(const size of ['short',kind==='settings'?'rectangle':'text','text']){const shape=document.createElement('span');shape.className='vb-skeleton vb-skeleton-'+size;group.append(shape);}
  shapes.append(group);
 }
 target.before(status);target.append(shapes);
 return ()=>{target.setAttribute('aria-busy','false');status.remove();shapes.remove();};
}
export const attorneyLoadingLabels=Object.freeze({'staff-overview':'attorney overview','staff-clients':'client directory','staff-client':'client details','staff-calendar':'calendar','staff-requests':'client requests','staff-archived':'archived clients'});
export function attorneySkeleton(layout='staff-overview'){
 const heading=`<div class="vb-loading-page-heading">${bar('title')}</div>`;
 let content;
 switch(layout){
  case 'staff-clients':case 'staff-archived':content=bar('search')+panel(repeat(4,row));break;
  case 'staff-client':content=panel(repeat(3,field))+columns(panel(repeat(3,row)),card()+card());break;
  case 'staff-calendar':case 'staff-requests':content=card();break;
  default:content=`<div class="vb-loading-agents">${repeat(3,card)}</div>`+columns(panel(repeat(3,row)),card()+card());
 }
 return `<div class="vb-loading-shell" aria-hidden="true"><aside class="vb-loading-sidebar">${bar('heading')}${repeat(5,()=>bar())}</aside><div class="vb-loading-workspace"><div class="vb-loading-topbar">${bar('short')}</div><div class="vb-loading-page">${heading}${content}</div></div></div>`;
}
