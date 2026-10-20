import {showFlowLoading} from '../../shared/loading.mjs';
import {createConnection} from '../../auth/connection.mjs?v=20261018-record-pages';
import {setupGate,showConnectionError} from '../../auth/gate.mjs';
import {createEngagementAdmin,draftDetails} from '../../auth/engagement-admin.mjs';
const $=s=>document.querySelector(s);
const form=$('#engagement-form'),review=$('#engagement-review');
const query=new URLSearchParams(location.search),clientId=query.get('client');
let client;
let db,repository,gate,data={clients:[],engagements:[],drafts:[]},id=crypto.randomUUID(),revision=0,busy=false,reviewed=null;
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function status(text,error=false){$('#engagement-status').textContent=text;$('#engagement-status').dataset.error=String(error);}
function values(){return Object.fromEntries(new FormData(form));}
function edit(draft){
 id=draft?.id||crypto.randomUUID();revision=draft?.revision||0;
 form.reset();for(const [k,v]of Object.entries(draft||{}))if(form.elements[k])form.elements[k].value=v??'';
 form.elements.client_id.value=client.id;form.elements.recipient_email.value=client.contact_email||'';$('#send-invitation').hidden=!draft||!client.contact_email;
 $('#draft-heading').textContent=draft?'Edit engagement draft':'New engagement';
 status('');$('#save-draft').textContent='Save engagement draft';$('#save-draft').disabled=!client.contact_email;reviewed=null;
}
function render(){
 const list=$('#draft-list');list.replaceChildren();$('#draft-count').textContent=String(data.drafts.length);
 if(!data.drafts.length)list.append(node('p','No engagement drafts yet.'));
 for(const d of data.drafts){const card=node('article');card.className='engagement-row';card.append(node('h3',d.engagement_title),node('p',data.clients.find(c=>c.id===d.client_id)?.name||d.new_client_name),node('p',d.recipient_email));const invite=data.invitations?.find(i=>i.draft_id===d.id);const badge=node('span',invite?'Invitation '+invite.state:'Draft · invitation not sent');badge.className='draft-badge';const button=node('button','Edit draft');button.className='text-link';button.type='button';button.onclick=()=>{edit(d);form.scrollIntoView({block:'start',behavior:'smooth'});$('#draft-heading').focus();};card.append(badge,button);if(invite&&['sent','sending','failed'].includes(invite.state)){const revoke=node('button','Revoke invitation');revoke.type='button';revoke.className='text-link';revoke.onclick=async()=>{revoke.disabled=true;const finish=showFlowLoading($('#draft-refresh-loading'),'Revoking invitation…');try{await repository.revoke(invite.id);await load();status('Invitation revoked.');}catch(error){status(error.message,true);revoke.disabled=false;}finally{finish();}};card.append(revoke);}list.append(card);}

}
async function load(){
 const finish=showFlowLoading($('#draft-refresh-loading'),'Loading engagement drafts…');
 $('#draft-list').hidden=true;
 try{
 const result=await repository.read();client=result.clients.find(c=>c.id===clientId);
 if(!client){location.replace('attorney.html#clients');throw Error('Choose a client before adding an engagement.');}
 data={clients:[client],engagements:result.engagements.filter(e=>e.client_id===client.id),drafts:result.drafts.filter(d=>d.client_id===client.id),invitations:(result.invitations||[]).filter(i=>i.client_id===client.id)};
 $('#engagement-client-name').textContent=client.name;
 $('#legal-client-name').textContent='Legal client: '+client.name;
 $('#recipient-name').textContent=client.contact_name||client.name;$('#recipient-email').textContent=client.contact_email||'Add a contact email in Client Settings before preparing an invitation.';
 $('#back-client').href='attorney.html#client-'+encodeURIComponent(client.id);
 document.title=client.name+' — Engagements — Venture Branding Law';
 render();
 }finally{finish();$('#draft-list').hidden=false;}
}
$('#new-draft').onclick=()=>{edit();form.scrollIntoView({block:'start',behavior:'smooth'});};
form.addEventListener('input',()=>{if(!busy){$('#save-draft').textContent='Save engagement draft';$('#send-invitation').hidden=true;status('');}});
form.addEventListener('submit',event=>{
 event.preventDefault();if(busy||!form.reportValidity())return;
 try{reviewed=draftDetails(values());const dl=$('#review-details');dl.replaceChildren();for(const [label,value]of [['Legal client',data.clients.find(c=>c.id===reviewed.client_id)?.name||reviewed.new_client_name],['Engagement',reviewed.engagement_title],['Initial matter',reviewed.matter_title],['Invitation email',reviewed.recipient_email],['Portal access','All Client Portal features']])dl.append(node('dt',label),node('dd',value));review.showModal();}catch(error){status(error.message,true);}
});
$('#review-cancel').onclick=()=>review.close();
$('#review-save').onclick=async()=>{
 if(busy||!reviewed)return;busy=true;$('#review-save').disabled=true;$('#review-error').textContent='';
 const finish=showFlowLoading($('#draft-save-loading'),'Saving engagement draft…');
 try{const saved=await repository.save(id,revision,reviewed);revision=saved.revision;review.close();status('Engagement draft saved. No invitation has been sent and no Client access has been granted.');$('#save-draft').textContent='✓ Saved';await load();$('#send-invitation').hidden=!client.contact_email;}
 catch(error){$('#review-error').textContent=error.message;}
 finally{finish();busy=false;$('#review-save').disabled=false;}
};
try{db=createConnection('staff');gate=setupGate(db,'staff');repository=createEngagementAdmin(db,window.VB_AUTH_CONFIG,location.hostname);const ticket=gate.lock();await load();const requestedDraft=query.get('draft');const draft=data.drafts.find(d=>d.id===requestedDraft);if(requestedDraft&&!draft)throw Error('This draft is unavailable for this client. Return to the client and choose a current draft.');edit(draft);gate.unlock(ticket);}
catch(error){if(gate)gate.lock(error.message);else showConnectionError('staff');}
// Erase rendered client/draft details as soon as the staff session is lost.
if(db)db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){data={clients:[],engagements:[],drafts:[]};form.reset();$('#draft-list').replaceChildren();review.close();}});

const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#attorney-nav');menu?.addEventListener('click',()=>{menu.setAttribute('aria-expanded',String(nav.classList.toggle('open')));});

const sendReview=$('#invitation-send-review');
$('#send-invitation').onclick=()=>{if(busy)return;$('#send-recipient').textContent=form.elements.engagement_title.value+' — '+(client.contact_name||client.name)+' · '+(client.contact_email||'No saved email');$('#send-error').textContent='';sendReview.showModal();};
$('#send-cancel').onclick=()=>sendReview.close();
$('#send-confirm').onclick=async()=>{if(busy)return;busy=true;$('#send-confirm').disabled=true;const finish=showFlowLoading($('#invite-send-loading'),'Sending invitation…');try{await repository.send(id,revision,client);sendReview.close();await load();status('Invitation email requested. The recipient must verify their account and accept.');}catch(error){$('#send-error').textContent=error.message;}finally{finish();busy=false;$('#send-confirm').disabled=false;}};
