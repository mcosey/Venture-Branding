(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const clients = [{id:'flowrata',type:'Business',name:'FlowRata LLC',contact:'Sample contact',email:'flowrata@example.com',clioContact:'',clioMatter:'',quickbooks:'',portal:true,archived:false,sample:true}, {id:'mzp',type:'Business',name:'MZP Inc.',contact:'Sample contact',email:'mzp@example.com',clioContact:'',clioMatter:'',quickbooks:'',portal:false,archived:false,sample:false}, {id:'mario-cosey',type:'Individual',name:'Mario Cosey',contact:'Mario Cosey',email:'mario@example.com',clioContact:'',clioMatter:'',quickbooks:'',portal:false,archived:false,sample:false}];
  const serviceNames = ['Trademark Watch','Brand Change Monitor','Specimen Capture','Maintenance Reminder','Trademark Activity Digest'];
  clients.forEach(client => { client.marks = []; });
  clients[0].marks = [
    {name:'COTIVATE®',type:'Word',status:'Registered',legacy:'cotivate'},
    {name:'COACHIVATE™',type:'Word',status:'Pending',legacy:'coachivate'},
    {name:'COTIVATE Logo',type:'Logo',status:'Pending',legacy:'logo'},
    {name:'CIRCLES',type:'Word',status:'Not yet filed',legacy:'circles'}
  ].map(mark => ({...mark,application:'',registration:'',services:[...serviceNames]}));
  let selected = clients[0], editing = null, step = 0;
  const detail = $('[data-screen="client-flowrata"]'); detail.dataset.screen = 'client';
  const originalDetail = detail.innerHTML;
  const overviewList = $('[data-screen="overview"] .client-preview').parentElement;
  const directory = $('#client-result').parentElement;
  const overviewHeading = overviewList.querySelector('.section-heading').outerHTML;
  const directoryHeading = directory.querySelector('.section-heading').outerHTML;
  const dialog = $('#staff-dialog'), editor = $('#client-editor'), form = $('#client-form');
  function node(tag,text,className) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el; }
  function preview(title,body) { $('#staff-dialog-title').textContent=title; $('#staff-dialog-body').textContent=body; dialog.showModal(); }
  function clientRow(client) {
    const link=node('a',undefined,'client-preview'); link.href='#client-'+client.id;
    const info=node('div'); info.append(node('h3',client.name),node('p',client.marks.length ? client.marks.length+' trademark'+(client.marks.length===1?'':'s') : 'No trademarks yet'));
    link.append(info,node('span','Open client →','row-arrow')); return link;
  }
  function renderLists() {
    const active=clients.filter(c=>!c.archived), archived=clients.filter(c=>c.archived);
    overviewList.innerHTML=overviewHeading; active.forEach(c=>overviewList.append(clientRow(c)));
    if(!active.length)overviewList.append(node('p','No active clients.','empty-client'));
    directory.innerHTML=directoryHeading;
    const query=$('#client-search').value.trim().toLowerCase();
    const matches=active.filter(c=>(c.name+' '+c.contact).toLowerCase().includes(query));
    matches.forEach(c=>directory.append(clientRow(c))); $('#client-count').textContent=active.length+' Active '+(active.length===1?'Client':'Clients');
    if(!matches.length)directory.append(node('p','No clients found.','empty-client'));
    $('#archived-list').replaceChildren(); archived.forEach(c=>$('#archived-list').append(clientRow(c)));
    if(!archived.length)$('#archived-list').append(node('p','No archived clients.','empty-client'));
    const metric=$('.summary-grid a[href="#clients"]'); metric.querySelector('strong').textContent=active.length; metric.querySelector('small').textContent=active.length===1?active[0].name:'Active clients';
    const sample=clients[0];
    $('.summary-grid a[href="#requests"] strong').textContent=sample.archived?'0':'1';
    document.querySelectorAll('[data-request-list]').forEach(list=>{
      list.replaceChildren();
      if(sample.archived || (list.dataset.requestList==='client' && !selected.sample)){list.append(node('p','No client requests.','empty-client'));return;}
      const row=node('article',undefined,'request-row'), info=node('div');
      info.append(node('h3','Brand review · CIRCLES'),node('p',sample.name+' · New request'));
      const button=node('button','View request →','text-link'); button.dataset.preview='brand';
      row.append(node('span','', 'request-dot'),info,button);list.append(row);
    });
    const count=$('[data-screen="requests"] .section-heading>span'); count.textContent=sample.archived?'0 requests':'1 sample request';
    document.querySelectorAll('.appointment p').forEach(p=>p.textContent=sample.name);
  }
  function renderDetail() {
    detail.innerHTML=originalDetail;
    detail.querySelector('h1').textContent=selected.name;
    const back=detail.querySelector('.page-heading a');back.href=selected.archived?'#archived':'#clients';back.textContent=selected.archived?'← Archived Clients':'← All clients';
    const actions=detail.querySelector('.client-actions'); actions.replaceChildren();
    actions.append(node('span',selected.archived?'Archived':selected.portal?'Portal add-on · Not invited':'No portal add-on','badge'));
    if(selected.sample){const link=node('a','Preview client portal ↗','outline-button');link.href='portal.html';actions.append(link);}
    const settings=node('button','Client Settings','outline-button'); settings.dataset.action='settings';actions.append(settings);
    const metadata=node('p',selected.contact+' · '+selected.email,'client-details');detail.querySelector('.page-heading').append(metadata);
    if(!selected.sample){
      detail.querySelector('.mark-list').replaceChildren(node('p','No trademarks yet.','empty-client'));
      detail.querySelector('.service-list').replaceChildren(node('li','No services configured.'));
      const useCard=detail.querySelector('a[href="use-history.html"]').closest('section');useCard.remove();
    }
    const markList = detail.querySelector('.mark-list'); markList.replaceChildren();
    selected.marks.forEach((mark,index)=>{
      const row=node('a'); row.href=mark.legacy?'trademark.html?mark='+mark.legacy:'#client-'+selected.id;
      if(!mark.legacy){row.dataset.markIndex=String(index);}
      const label=node('span',mark.name);label.append(node('small',mark.type+' mark'));
      row.append(label,node('span',mark.status,'badge '+(mark.status==='Registered'?'green':mark.status==='Pending'?'blue':'amber')),node('span',mark.legacy?'↗':'→'));markList.append(row);
    });
    if(!selected.marks.length)markList.append(node('p','No trademarks yet.','empty-client'));
    const configured=selected.portal?serviceNames:[];
    detail.querySelector('.service-list').replaceChildren(...(configured.length?configured:['No portal add-on.']).map(text=>node('li',text)));
    if(selected.archived) detail.querySelector('[data-preview="mark"]').hidden=true;
  }
  const menu=$('.menu-toggle'),nav=$('#attorney-nav');
  function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}
  menu.addEventListener('click',()=>{menu.setAttribute('aria-expanded',String(nav.classList.toggle('open')));});
  function route(){
    const requested=location.hash.slice(1)||'overview'; let view=requested;
    if(requested.startsWith('client-')){
      selected=clients.find(c=>c.id===requested.slice(7));view=selected?'client':'missing';
      if(selected)renderDetail();else selected=clients[0];
    } else if(!['overview','clients','calendar','requests','archived'].includes(view))view='overview';
    document.querySelectorAll('[data-screen]').forEach(screen=>screen.hidden=screen.dataset.screen!==view);
    const section=view==='client'?(selected.archived?'archived':'clients'):view;
    nav.querySelectorAll('a').forEach(link=>{if(link.dataset.view===section)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    const labels={requests:'Client requests',archived:'Archived Clients',missing:'Client not found'};
    $('#location-label').textContent=view==='client'?'Clients / '+selected.name:labels[view]||view[0].toUpperCase()+view.slice(1);
    renderLists();closeMenu();
  }
  window.addEventListener('hashchange',()=>{route();const heading=$('[data-screen]:not([hidden]) h1');heading.tabIndex=-1;heading.focus();window.scrollTo(0,0);});
  $('#client-search').addEventListener('input',renderLists);
  const fields=['type','name','contact','email','clioContact','clioMatter','quickbooks'];
  function values(){const value={};fields.forEach(key=>value[key]=form.elements[key].value.trim());value.portal=form.elements.portal.checked;return value;}
  function showStep(){
    document.querySelectorAll('[data-step]').forEach(panel=>panel.hidden=Number(panel.dataset.step)!==step);
    $('#step-label').textContent=`${step+1} of 4 · ${['Details','Related records','Portal access','Review'][step]}`;
    $('#editor-back').hidden=step===0;$('#editor-next').hidden=step===3;$('#editor-save').hidden=step!==3;
    $('#archive-controls').hidden=!editing||step!==0;
    if(step===3){const v=values();$('#client-review').replaceChildren();const labels={type:'Type',name:'Client',contact:'Contact',email:'Email',clioContact:'Clio contact',clioMatter:'Clio matter',quickbooks:'QuickBooks customer'};fields.forEach(key=>$('#client-review').append(node('dt',labels[key]),node('dd',v[key]||'Not linked')));$('#client-review').append(node('dt','Portal'),node('dd',v.portal?'Add-on purchased · Not invited':'No add-on'));}
  }
  function openEditor(client){
    editing=client;step=0;form.reset();if(client){fields.forEach(key=>form.elements[key].value=client[key]);form.elements.portal.checked=client.portal;}
    $('#editor-title').textContent=client?'Client Settings':'Add New Client';$('#editor-save').textContent=client?'Save changes':'Save client';
    $('#archive-confirm').hidden=true;$('#archive-client').textContent=client?.archived?'Restore client':'Archive client';showStep();editor.showModal();
  }
  function validDetails(){for(const key of ['name','contact','email']){const field=form.elements[key];field.value=field.value.trim();if(!field.reportValidity())return false;}return true;}
  $('#editor-next').addEventListener('click',()=>{if(step===0&&!validDetails())return;step++;showStep();});
  $('#editor-back').addEventListener('click',()=>{step--;showStep();});
  $('#editor-close').addEventListener('click',()=>editor.close());
  form.addEventListener('submit',event=>{event.preventDefault();if(step<3){$('#editor-next').click();return;}if(!validDetails()){step=0;showStep();return;}let client=editing;if(client)Object.assign(client,values());else{client={...values(),id:crypto.randomUUID(),sample:false,archived:false,marks:[]};clients.push(client);}editor.close();location.hash='client-'+client.id;route();});
  $('#archive-client').addEventListener('click',()=>{if(editing.archived){editing.archived=false;editor.close();route();}else $('#archive-confirm').hidden=false;});
  $('#archive-cancel').addEventListener('click',()=>$('#archive-confirm').hidden=true);
  $('#archive-yes').addEventListener('click',()=>{editing.archived=true;editor.close();location.hash='archived';route();});
  const markEditor=$('#mark-editor'), markForm=$('#mark-form'); let markStep=0, markOwner=null, lookupResult=null;
  const sampleRecords={
    'DEMO-001':{name:'EXAMPLE BRAND · Sample',type:'Word',status:'Pending',application:'DEMO-001',registration:'',owner:'Example Owner LLC · Sample'},
    'DEMO-002':{name:'EXAMPLE LOGO · Sample',type:'Logo',status:'Registered',application:'DEMO-APPLICATION-002',registration:'DEMO-002',owner:'Example Owner LLC · Sample'}
  };
  function isLookup(){return markForm.elements.path.value==='uspto';}
  function markValues(){return isLookup()?{...lookupResult,services:[...serviceNames],source:'Sample lookup — not USPTO data'}:{name:markForm.elements.markName.value.trim(),type:markForm.elements.markType.value,status:'Not yet filed',application:'',registration:'',services:[...serviceNames],source:'Manual entry'};}
  function renderMarkSummary(target,v){
    target.replaceChildren();
    const rows=[['Client',markOwner.name],['Mark',v.name],['Type',v.type],['Status',v.status]];
    if(isLookup())rows.push(['Record owner',v.owner],['Application',v.application||'—'],['Registration',v.registration||'—'],['Source','Sample preview · Not retrieved from USPTO']);
    rows.forEach(([key,value])=>target.append(node('dt',key),node('dd',value)));
  }
  function showMarkStep(){
    document.querySelectorAll('[data-mark-step]').forEach(panel=>panel.hidden=Number(panel.dataset.markStep)!==markStep);
    $('#mark-step-label').textContent=(markStep+1)+' of 3 · '+['Choose path',isLookup()?'Lookup':'Details','Review'][markStep];
    $('#mark-back').hidden=markStep===0;$('#mark-next').hidden=markStep===2;$('#mark-save').hidden=markStep!==2;
    $('#lookup-fields').hidden=!isLookup();$('#manual-fields').hidden=isLookup();$('#mark-details-title').textContent=isLookup()?'USPTO lookup':'Trademark details';
    markForm.elements.markName.required=!isLookup();markForm.elements.markName.disabled=isLookup();
    markForm.elements.confirmOwner.required=isLookup();markForm.elements.confirmOwner.disabled=!isLookup();$('#owner-confirm-label').hidden=!isLookup();
    if(markStep===2)renderMarkSummary($('#mark-review'),markValues());
  }
  function resetLookup(){lookupResult=null;$('#lookup-result').replaceChildren();$('#lookup-message').textContent='';markForm.elements.confirmOwner.checked=false;}
  function openMarkEditor(){if(selected.archived)return;markOwner=selected;markStep=0;markForm.reset();resetLookup();$('#mark-client').textContent=selected.name;showMarkStep();markEditor.showModal();}
  markForm.elements.identifier.addEventListener('input',resetLookup);
  markForm.querySelectorAll('[name="path"]').forEach(input=>input.addEventListener('change',()=>{resetLookup();showMarkStep();}));
  $('#lookup-mark').addEventListener('click',()=>{
    resetLookup();const id=markForm.elements.identifier.value.trim().toUpperCase();lookupResult=sampleRecords[id]||null;
    if(!lookupResult){$('#lookup-message').textContent='Live lookup is not connected. Use DEMO-001 or DEMO-002 to try the preview.';return;}
    renderMarkSummary($('#lookup-result'),lookupResult);$('#lookup-message').textContent='Sample record loaded. Confirm the owner before saving.';
  });
  $('#mark-close').addEventListener('click',()=>markEditor.close());
  $('#mark-next').addEventListener('click',()=>{
    if(markStep===1){if(isLookup()&&!lookupResult){$('#lookup-message').textContent='Preview a sample lookup before continuing.';return;}
      if(!isLookup()){markForm.elements.markName.value=markForm.elements.markName.value.trim();if(!markForm.elements.markName.reportValidity())return;}}
    markStep++;showMarkStep();
  });
  $('#mark-back').addEventListener('click',()=>{markStep--;showMarkStep();});
  markForm.addEventListener('submit',event=>{event.preventDefault();if(markStep<2){$('#mark-next').click();return;}if(markOwner.archived)return;if(isLookup()&&(!lookupResult||!markForm.elements.confirmOwner.reportValidity()))return;const value=markValues();if(!value.name)return;markOwner.marks.push(value);markEditor.close();route();});
  detail.addEventListener('click',event=>{const link=event.target.closest('[data-mark-index]');if(!link)return;event.preventDefault();const mark=selected.marks[Number(link.dataset.markIndex)];preview(mark.name,selected.name+' · '+mark.type+' · '+mark.status+'\nApplication: '+(mark.application||'—')+'\nRegistration: '+(mark.registration||'—')+'\nSource: '+(mark.source||'Sample'));});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-preview],[data-action]');if(!button)return;
    if(button.dataset.action==='settings'){openEditor(selected);return;}
    const key=button.dataset.preview;
    if(key==='new-client'){openEditor(null);return;}
    if(key==='mark')openMarkEditor();
    if(key==='brand')preview('Brand review · '+clients[0].name,'Sample request: “I’m using CIRCLES for a new product. Can we discuss protecting it?” Requests are not connected yet.');
  });
  ['staff-close','staff-done'].forEach(id=>$('#'+id).addEventListener('click',()=>dialog.close()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
  route();
})();
