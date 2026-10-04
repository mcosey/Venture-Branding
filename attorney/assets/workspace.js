(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const clients = [{id:'flowrata',type:'Business',name:'FlowRata LLC',contact:'Sample contact',email:'flowrata@example.com',clioContact:'',clioMatter:'',quickbooks:'',portal:true,archived:false,sample:true}, {id:'mzp',type:'Business',name:'MZP Inc.',contact:'Sample contact',email:'mzp@example.com',clioContact:'',clioMatter:'',quickbooks:'',portal:false,archived:false,sample:false}, {id:'mario-cosey',type:'Individual',name:'Mario Cosey',contact:'Mario Cosey',email:'mario@example.com',clioContact:'',clioMatter:'',quickbooks:'',portal:false,archived:false,sample:false}];
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
    const info=node('div'); info.append(node('h3',client.name),node('p',client.sample?'4 trademarks':'No trademarks yet'));
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
  form.addEventListener('submit',event=>{event.preventDefault();if(step<3){$('#editor-next').click();return;}if(!validDetails()){step=0;showStep();return;}let client=editing;if(client)Object.assign(client,values());else{client={...values(),id:crypto.randomUUID(),sample:false,archived:false};clients.push(client);}editor.close();location.hash='client-'+client.id;route();});
  $('#archive-client').addEventListener('click',()=>{if(editing.archived){editing.archived=false;editor.close();route();}else $('#archive-confirm').hidden=false;});
  $('#archive-cancel').addEventListener('click',()=>$('#archive-confirm').hidden=true);
  $('#archive-yes').addEventListener('click',()=>{editing.archived=true;editor.close();location.hash='archived';route();});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-preview],[data-action]');if(!button)return;
    if(button.dataset.action==='settings'){openEditor(selected);return;}
    const key=button.dataset.preview;
    if(key==='new-client'){openEditor(null);return;}
    if(key==='mark')preview('Add New Mark · '+selected.name,'Mark setup is the next step. No mark is added in this preview.');
    if(key==='services')preview(selected.name+' · Portal services','You approve services. Clients control permitted preferences. No services are running.');
    if(key==='brand')preview('Brand review · '+clients[0].name,'Sample request: “I’m using CIRCLES for a new product. Can we discuss protecting it?” Requests are not connected yet.');
  });
  ['staff-close','staff-done'].forEach(id=>$('#'+id).addEventListener('click',()=>dialog.close()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
  route();
})();
