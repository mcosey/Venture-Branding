import {setupFilingWorkspace} from '../preflight/connected-workspace.mjs';
import {createConnection,loadRecords,typeLabel,statusLabel,requireAccess} from '../../auth/connection.mjs';
import {setupGate} from '../../auth/gate.mjs';
(async () => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const db=createConnection('staff'), gate=setupGate(db,'staff');
  const filings=setupFilingWorkspace(db);
  const clients=[];
  let accessRecords=[], accessReady=false;
  async function reloadRecords(){
    const saved=await loadRecords(db,'staff');
    const access=await db.rpc('vb_portal_access_status');
    accessReady=!access.error;accessRecords=access.data||[];
    clients.splice(0,clients.length,...saved.clients.map(c=>{
      const r=saved.references.find(r=>r.client_id===c.id)||{};
      return {id:c.id,type:c.client_type==='business'?'Business':'Individual',name:c.name,contact:c.contact_name,email:c.contact_email||'',clioContact:r.clio_contact_reference||'',clioMatter:r.clio_matter_reference||'',quickbooks:r.quickbooks_customer_reference||'',portal:c.portal_enabled,archived:Boolean(c.archived_at),updatedAt:c.updated_at,sample:false,marks:saved.marks.filter(m=>m.client_id===c.id).map(m=>({id:m.id,updatedAt:m.updated_at,linkedIdentifier:m.application_number||'',name:m.name,type:typeLabel(m.mark_type),status:statusLabel(m.status),application:m.application_number||'',registration:m.registration_number||'',source:m.source==='uspto'?'USPTO':'Manual entry',services:[]}))};
    }));
  }
  try{await reloadRecords();}catch(error){gate.lock(error.message);return;}
  let saving=false;
  async function save(action){
    if(saving)return;saving=true;
    const buttons=[...document.querySelectorAll('dialog button')];buttons.forEach(b=>b.disabled=true);
    try{await requireAccess(db,'staff');await action();await reloadRecords();route();}
    catch(error){const target=document.querySelector('dialog[open]');if(target){let note=target.querySelector('[data-save-error]');if(!note){note=document.createElement('p');note.dataset.saveError='';note.className='connection-error';note.setAttribute('role','alert');target.append(note);}note.textContent=error.message||'Unable to save. Please retry.';}else gate.lock(error.message);}
    finally{saving=false;buttons.forEach(b=>b.disabled=false);}
  }
  const serviceNames = ['Trademark Watch','Brand Change Monitor','Specimen Capture','Maintenance Reminder','Trademark Activity Digest'];
  let selected = clients[0], editing = null, step = 0;
  const detail = $('[data-screen="client-cotivate-llc"]'); detail.dataset.screen = 'client';
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
    $('.summary-grid a[href="#requests"] strong').textContent='0';
    document.querySelectorAll('[data-request-list]').forEach(list=>list.replaceChildren(node('p','No client requests.','empty-client')));
    $('[data-screen="requests"] .section-heading>span').textContent='0 requests';
  }
  function renderDetail() {
    detail.innerHTML=originalDetail;
    detail.querySelector('h1').textContent=selected.name;
    const back=detail.querySelector('.page-heading a');back.href=selected.archived?'#archived':'#clients';back.textContent=selected.archived?'← Archived Clients':'← All clients';
    const actions=detail.querySelector('.client-actions'); actions.replaceChildren();
    actions.append(node('span',selected.archived?'Archived':selected.portal?'Portal enabled':'Portal disabled','badge'));
    if(selected.sample){const link=node('a','Preview client portal ↗','outline-button');link.href='portal.html';actions.append(link);}
    const settings=node('button','Client Settings','outline-button'); settings.dataset.action='settings';actions.append(settings);
    const metadata=node('p',[selected.contact,selected.email].filter(Boolean).join(' · '),'client-details');detail.querySelector('.page-heading').append(metadata);
    renderAccessPanel();
    if(!selected.sample){
      detail.querySelector('.mark-list').replaceChildren(node('p','No trademarks yet.','empty-client'));
      detail.querySelector('.service-list').replaceChildren(node('li','No services configured.'));
      const useCard=detail.querySelector('[data-use-history]');if(useCard)useCard.replaceChildren(node('h2','Use history'),node('p','No use history.','empty-client'));
    }
    const markList = detail.querySelector('.mark-list'); markList.replaceChildren();
    selected.marks.forEach((mark,index)=>{
      const legacyPreview=mark.legacy&&!mark.linkedIdentifier;
      const row=node('a'); row.href=legacyPreview?'trademark.html?mark='+mark.legacy:'#client-'+selected.id;
      if(!legacyPreview){row.dataset.markIndex=String(index);}
      const label=node('span',mark.name);label.append(node('small',mark.type+' mark'));
      row.append(label,node('span',mark.status,'badge '+(mark.status==='Registered'?'green':mark.status==='Pending'?'blue':'amber')),node('span',legacyPreview?'↗':'→'));
      const entry=node('div',undefined,'mark-entry');entry.append(row);
      const controls=node('div',undefined,'mark-controls');
      if(!selected.archived){const linkButton=node('button',mark.linkedIdentifier?'Refresh USPTO Details':'Link USPTO Record','text-link');linkButton.dataset.linkMark=String(index);linkButton.setAttribute('aria-label',linkButton.textContent+' for '+mark.name);controls.append(linkButton);}
      if(!selected.archived){const filingButton=node('button','Filings','text-link');filingButton.dataset.filingMark=String(index);filingButton.setAttribute('aria-label','Filings for '+mark.name);controls.append(filingButton);}
      if(mark.updatedAt)controls.append(node('small','Updated '+new Date(mark.updatedAt).toLocaleString()));
      entry.append(controls);markList.append(entry);
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
    let requested=location.hash.slice(1)||'overview'; if(requested==='client-cotivate-llc')requested='client-10000000-0000-0000-0000-000000000001'; let view=requested;
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
  const fields=['type','name','contact','email'];
  function values(){const value={};fields.forEach(key=>value[key]=form.elements[key].value.trim());return value;}
  function showStep(){
    document.querySelectorAll('[data-step]').forEach(panel=>panel.hidden=Number(panel.dataset.step)!==step);
    $('#step-label').textContent=`${step+1} of 2 · ${['Details','Review'][step]}`;
    $('#editor-back').hidden=step===0;$('#editor-next').hidden=step===1;$('#editor-save').hidden=step!==1;
    $('#archive-controls').hidden=!editing||step!==0;
    if(step===1){const v=values();$('#client-review').replaceChildren();const labels={type:'Type',name:'Client',contact:'Contact',email:'Contact email'};fields.forEach(key=>$('#client-review').append(node('dt',labels[key]),node('dd',v[key]||'Not provided')));}
  }
  function openEditor(client){
    editing=client;step=0;form.reset();editor.querySelector('[data-save-error]')?.remove();if(client){fields.forEach(key=>form.elements[key].value=client[key]);}
    $('#editor-title').textContent=client?'Client Settings':'Add New Client';$('#editor-save').textContent=client?'Save changes':'Save client';
    $('#archive-confirm').hidden=true;$('#archive-client').textContent=client?.archived?'Restore client':'Archive client';showStep();editor.showModal();
  }
  function validDetails(){for(const key of ['name','contact','email']){const field=form.elements[key];field.value=field.value.trim();if(!field.reportValidity())return false;}return true;}
  $('#editor-next').addEventListener('click',()=>{if(step===0&&!validDetails())return;step++;showStep();});
  $('#editor-back').addEventListener('click',()=>{step--;showStep();});
  $('#editor-close').addEventListener('click',()=>editor.close());
  form.addEventListener('submit',event=>{event.preventDefault();if(step<1){$('#editor-next').click();return;}if(!validDetails()){step=0;showStep();return;}
    save(async()=>{const v=values();const {data,error}=await db.rpc('vb_save_client',{record_id:editing?.id||null,expected_updated_at:editing?.updatedAt||null,details:{name:v.name,client_type:v.type.toLowerCase(),contact_name:v.contact,contact_email:v.email,portal_enabled:editing?.portal||false,clio_contact_reference:editing?.clioContact||null,clio_matter_reference:editing?.clioMatter||null,quickbooks_customer_reference:editing?.quickbooks||null}});if(error)throw new Error('Client could not be saved. Reload if another edit changed this record.');await reloadRecords();editor.close();location.hash='client-'+data;});
  });
  async function archiveClient(archived){await save(async()=>{const {data,error}=await db.from('vb_clients').update({archived_at:archived?new Date().toISOString():null,portal_enabled:false}).eq('id',editing.id).eq('updated_at',editing.updatedAt).select('id');if(error||data.length!==1)throw new Error('Client changed or access is unavailable. Reload and try again.');editor.close();location.hash=archived?'archived':'clients';});}
  $('#archive-client').addEventListener('click',()=>{if(editing.archived)archiveClient(false);else $('#archive-confirm').hidden=false;});
  $('#archive-cancel').addEventListener('click',()=>$('#archive-confirm').hidden=true);
  $('#archive-yes').addEventListener('click',()=>archiveClient(true));
  const accessEditor=$('#access-editor');let accessClient=null,accessAction=null;
  const accessLabels={active:'Active',pending:'Invitation pending',not_invited:'Not invited',disabled:'Disabled',archived:'Archived',sending:'Sending invitation',failed:'Invitation needs attention'};
  function renderAccessPanel(){
    const card=node('section',undefined,'panel card');card.append(node('h2','Portal access'));
    const record=accessRecords.find(r=>r.client_id===selected.id);
    card.append(node('p',accessReady?(accessLabels[record?.access_status]||'Unavailable'):'Access controls awaiting setup.','client-details'));
    if(record?.login_email)card.append(node('p','Sign-in email: '+record.login_email));
    if(record?.last_invited_at)card.append(node('p','Last invitation: '+new Date(record.last_invited_at).toLocaleString(),'muted'));
    const actions=node('div',undefined,'client-actions');
    function button(label,action){const b=node('button',label,'outline-button');b.dataset.access=action;b.disabled=!accessReady||selected.archived||!record;actions.append(b);}
    if(!selected.archived){
      if(selected.portal){
        if(record?.access_status!=='active')button(record?.login_email?'Resend invitation':'Invite to Portal','invite');
        button('Disable portal access','disable');
      }else button('Enable portal access','enable');
    }
    card.append(actions);detail.querySelector('.hub-grid').before(card);
  }
  function openAccess(action){
    if(!accessReady||selected.archived)return;
    accessClient={...selected};accessAction=action;
    const state=accessRecords.find(r=>r.client_id===selected.id);
    $('#access-form').reset();accessEditor.querySelector('[data-save-error]')?.remove();$('#access-error').textContent='';
    $('#access-client').textContent=selected.name;
    $('#access-title').textContent=action==='invite'?'Invite to Portal':action==='enable'?'Enable portal access':'Disable portal access';
    $('#invite-email-label').hidden=action!=='invite';$('#invite-email').disabled=action!=='invite';$('#invite-email').required=action==='invite';
    $('#invite-email').value=state?.login_email||selected.email;$('#invite-email').readOnly=Boolean(state?.login_email);
    $('#access-explanation').textContent=action==='invite'?'Send an invitation to this address for this client only. Contact details will not change.':action==='enable'?'This restores access for an existing member. For a new client, send an invitation afterward.':'The client will lose portal access. Their records will be kept.';
    $('#access-confirm-label').textContent=action==='invite'?'I confirm the client and recipient above.':action==='enable'?'Enable access for this client.':'Disable access for this client.';
    $('#access-submit').textContent=action==='invite'?'Send invitation':'Confirm';accessEditor.showModal();
  }
  ['access-close','access-cancel'].forEach(id=>$('#'+id).addEventListener('click',()=>accessEditor.close()));
  detail.addEventListener('click',event=>{const button=event.target.closest('[data-access]');if(button)openAccess(button.dataset.access);});
  $('#access-form').addEventListener('submit',event=>{
    event.preventDefault();if(!$('#access-form').reportValidity())return;
    const client=accessClient,action=accessAction,email=$('#invite-email').value.trim();
    save(async()=>{
      if(action==='invite'){
        const {data,error}=await db.functions.invoke('client-invite',{body:{clientId:client.id,email,expectedUpdatedAt:client.updatedAt,confirmSend:true}});
        if(error||data?.error){let message=data?.error;try{if(!message&&error?.context)message=(await error.context.json()).error;}catch{}throw new Error(message||'Invitation not sent. Check access setup and try again.');}
      }else{
        const {error}=await db.rpc('vb_set_portal_access',{target_client:client.id,enabled:action==='enable',expected_updated_at:client.updatedAt});
        if(error)throw new Error('Access could not be changed. Reload and try again.');
      }
      accessEditor.close();
    });
  });
  const markEditor=$('#mark-editor'), markForm=$('#mark-form'); let markStep=0, markOwner=null, lookupResult=null, editingMark=null, lookupVersion=0;
  function isLookup(){return markForm.elements.path.value==='uspto';}
  function markValues(){return isLookup()?{...lookupResult,services:[...serviceNames],source:'USPTO'}:{name:markForm.elements.markName.value.trim(),type:markForm.elements.markType.value,status:'Not yet filed',application:'',registration:'',services:[...serviceNames],source:'Manual entry'};}
  function renderMarkSummary(target,v){
    target.replaceChildren();
    const rows=[...(editingMark?[['Existing mark',editingMark.name],['Action','Update this record; keep its history']]:[]),['Client',markOwner.name],['Mark',v.name],['Type',v.type],['Status',v.status]];
    if(isLookup())rows.push(['Record owner',v.owner],['Application',v.application||'—'],['Registration',v.registration||'—'],['Filed',v.filingDate||'Not provided'],['Registered',v.registrationDate||'Not provided'],['Status date',v.statusDate||'Not provided'],['Retrieved',v.checkedAt],['Source','USPTO TSDR']);
    rows.forEach(([key,value])=>target.append(node('dt',key),node('dd',value)));
  }
  function showMarkStep(){
    document.querySelectorAll('[data-mark-step]').forEach(panel=>panel.hidden=Number(panel.dataset.markStep)!==markStep);
    $('#mark-step-label').textContent=editingMark?markStep+' of 2 · '+(markStep===1?'Lookup':'Review'):(markStep+1)+' of 3 · '+['Choose path',isLookup()?'Lookup':'Details','Review'][markStep];
    $('#mark-back').hidden=markStep===(editingMark?1:0);$('#mark-next').hidden=markStep===2;$('#mark-save').hidden=markStep!==2;
    $('#lookup-fields').hidden=!isLookup();$('#manual-fields').hidden=isLookup();$('#mark-details-title').textContent=isLookup()?'USPTO lookup':'Trademark details';
    markForm.elements.markName.required=!isLookup();markForm.elements.markName.disabled=isLookup();
    markForm.elements.confirmOwner.required=isLookup();markForm.elements.confirmOwner.disabled=!isLookup();$('#owner-confirm-label').hidden=!isLookup();
    if(markStep===2)renderMarkSummary($('#mark-review'),markValues());
  }
  function resetLookup(){lookupVersion++;lookupResult=null;$('#lookup-result').replaceChildren();$('#lookup-message').textContent='';markForm.elements.confirmOwner.checked=false;}
  function openMarkEditor(mark=null){if(selected.archived)return;editingMark=mark;markOwner=selected;markStep=mark?1:0;markForm.reset();resetLookup();$('#mark-editor-title').textContent=mark?(mark.linkedIdentifier?'Refresh USPTO Details':'Link USPTO Record'):'Add New Mark';$('#mark-save').textContent=mark?'Update mark':'Save mark';markForm.elements.identifier.value=mark?.linkedIdentifier||'';$('#mark-client').textContent=selected.name+(mark?' · '+mark.name:'');showMarkStep();markEditor.showModal();}
  markForm.elements.identifier.addEventListener('input',resetLookup);
  markForm.querySelectorAll('[name="path"]').forEach(input=>input.addEventListener('change',()=>{resetLookup();showMarkStep();}));
  async function usptoRequest(action){
    await requireAccess(db,'staff');
    const {data,error}=await db.functions.invoke('uspto-lookup',{body:{action,serial:markForm.elements.identifier.value.trim(),clientId:markOwner.id,markId:editingMark?.id||null,expectedUpdatedAt:editingMark?.updatedAt||null,fingerprint:lookupResult?.fingerprint,confirmOwner:markForm.elements.confirmOwner.checked}});
    if(error){let message='USPTO connection unavailable. Nothing was saved.';try{const body=await error.context.json();if(typeof body.error==='string')message=body.error;}catch{}throw new Error(message);}
    if(!data||data.error)throw new Error(data?.error||'USPTO returned no record.');return data;
  }
  let lookingUp=false;
  $('#lookup-mark').addEventListener('click',async()=>{
    if(lookingUp)return;resetLookup();const version=lookupVersion;
    if(!/^\d{8}$/.test(markForm.elements.identifier.value.trim())){$('#lookup-message').textContent='Enter the eight-digit application serial number.';return;}
    lookingUp=true;$('#lookup-mark').disabled=true;$('#lookup-message').textContent='Retrieving USPTO record…';
    const serial=markForm.elements.identifier.value.trim(),owner=markOwner,mark=editingMark;
    try{const result=await usptoRequest('preview');if(version!==lookupVersion||!markEditor.open||owner!==markOwner||mark!==editingMark||serial!==markForm.elements.identifier.value.trim())return;
      const r=result.record;lookupResult={name:r.name,type:typeLabel(r.mark_type),status:r.uspto_status_text,owner:r.record_owner,application:r.application_number,registration:r.registration_number,filingDate:r.filing_date,registrationDate:r.registration_date,statusDate:r.uspto_status_date,checkedAt:result.checkedAt,fingerprint:result.fingerprint};
      renderMarkSummary($('#lookup-result'),lookupResult);$('#lookup-message').textContent='Review this record before saving.';
    }catch(error){if(version===lookupVersion&&markEditor.open)$('#lookup-message').textContent=error.message;}finally{lookingUp=false;$('#lookup-mark').disabled=false;}
  });
  $('#mark-close').addEventListener('click',()=>markEditor.close());
  markEditor.addEventListener('close',resetLookup);
  $('#mark-next').addEventListener('click',()=>{
    if(markStep===1){if(isLookup()&&!lookupResult){$('#lookup-message').textContent='Look up a record before continuing.';return;}
      if(!isLookup()){markForm.elements.markName.value=markForm.elements.markName.value.trim();if(!markForm.elements.markName.reportValidity())return;}}
    markStep++;showMarkStep();
  });
  $('#mark-back').addEventListener('click',()=>{markStep--;showMarkStep();});
  markForm.addEventListener('submit',event=>{event.preventDefault();if(markStep<2){$('#mark-next').click();return;}if(markOwner.archived)return;if(isLookup()){if(!lookupResult||!markForm.elements.confirmOwner.checked){markForm.elements.confirmOwner.reportValidity();return;}save(async()=>{await usptoRequest('save');markEditor.close();});return;}const value=markValues();if(!value.name)return;save(async()=>{const {error}=await db.from('vb_marks').insert({client_id:markOwner.id,name:value.name,mark_type:value.type.toLowerCase(),status:'not_filed',source:'manual'});if(error)throw new Error('Mark could not be saved. Please retry.');markEditor.close();});});
  detail.addEventListener('click',event=>{const filing=event.target.closest('[data-filing-mark]');if(filing){filings.open(selected,selected.marks[Number(filing.dataset.filingMark)]);return;}const control=event.target.closest('[data-link-mark]');if(control){openMarkEditor(selected.marks[Number(control.dataset.linkMark)]);return;}const link=event.target.closest('[data-mark-index]');if(!link)return;event.preventDefault();const mark=selected.marks[Number(link.dataset.markIndex)];preview(mark.name,selected.name+' · '+mark.type+' · '+mark.status+'\nApplication: '+(mark.application||'—')+'\nRegistration: '+(mark.registration||'—')+'\nSource: '+(mark.source||'Sample'));});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-preview],[data-action]');if(!button)return;
    if(button.dataset.action==='settings'){openEditor(selected);return;}
    const key=button.dataset.preview;
    if(key==='new-client'){openEditor(null);return;}
    if(key==='mark')openMarkEditor();
  });
  ['staff-close','staff-done'].forEach(id=>$('#'+id).addEventListener('click',()=>dialog.close()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
  route();gate.unlock();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)gate.lock('Checking access…');else reloadRecords().then(()=>{route();gate.unlock();}).catch(error=>gate.lock(error.message));});
  window.addEventListener('pageshow',event=>{if(event.persisted){gate.lock();reloadRecords().then(()=>{route();gate.unlock();}).catch(error=>gate.lock(error.message));}});
})();
