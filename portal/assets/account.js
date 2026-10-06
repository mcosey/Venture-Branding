import {createConnection,loadRecords,requireAccess} from '../../auth/connection.mjs';
import {setupGate} from '../../auth/gate.mjs';
import {saveContact,changeEmail,resetPassword} from '../../auth/account.mjs';
const db=createConnection('client'),gate=setupGate(db,'client'),main=document.querySelector('main');
let selectedId,busy=false;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function field(form,label,value,type='text',readOnly=false){const l=el('label',label),i=el('input');i.type=type;i.value=value||'';i.readOnly=readOnly;i.maxLength=type==='email'?254:200;i.autocomplete=type==='email'?'email':'name';l.append(i);form.append(l);return i;}
function section(title,buttonText,action){const f=el('form');f.className='panel connected-card account-form';f.append(el('h2',title));const b=el('button',buttonText);b.type='submit';b.className='primary-button';const msg=el('p');msg.setAttribute('role','status');
 f.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;main.querySelectorAll('button').forEach(n=>n.disabled=true);msg.textContent='Saving…';try{await action(msg); }catch(error){msg.textContent=error.message;}finally{busy=false;main.querySelectorAll('button').forEach(n=>n.disabled=false);}});
 return {f,finish(){f.append(b,msg);main.append(f);}};}
async function refresh(){gate.lock();main.replaceChildren();try{
 const records=await loadRecords(db,'client'),user=await requireAccess(db,'client');
 selectedId=selectedId||records.clients[0]?.id;const client=records.clients.find(c=>c.id===selectedId);if(!client)throw new Error('No active client workspace is available.');
 document.querySelector('#client-name').textContent=client.name;const choice=document.querySelector('#client-choice');choice.replaceChildren(...records.clients.map(c=>new Option(c.name,c.id)));choice.value=selectedId;choice.parentElement.hidden=records.clients.length<2;
 const heading=el('section');heading.className='portfolio-heading';heading.append(el('h1','Account Settings'));main.append(heading);
 const contact=section('Contact details','Save contact details',async msg=>{const saved=await saveContact(db,client,name.value,email.value);Object.assign(client,saved);msg.textContent='Contact details saved.';});
 field(contact.f,'Client legal name',client.name,'text',true);const name=field(contact.f,'Contact name',client.contact_name);name.required=true;const email=field(contact.f,'Contact email',client.contact_email,'email');contact.f.append(el('p','These details are shared with your attorney.'));contact.finish();
 const login=section('Sign-in email','Send verification email',async msg=>{await changeEmail(db,newEmail.value,location.origin);newEmail.value='';msg.textContent='Check your email for confirmation instructions. Your contact email is unchanged.';});
 field(login.f,'Current sign-in email',user.email,'email',true);const newEmail=field(login.f,'New sign-in email','','email');newEmail.required=true;login.f.append(el('p','Confirm the change through the email instructions.'));login.finish();
 const password=section('Password','Send password reset email',async msg=>{await resetPassword(db,location.origin);msg.textContent='Check your sign-in email for the password reset link.';});password.f.append(el('p','Set a new password using a secure email link.'));password.finish();gate.unlock();
 }catch(error){main.replaceChildren();gate.lock(error.message);}}
document.querySelector('#client-choice').addEventListener('change',e=>{selectedId=e.target.value;refresh();});
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#portal-nav');menu?.addEventListener('click',()=>menu.setAttribute('aria-expanded',String(nav.classList.toggle('open'))));
document.querySelector('#messages-button')?.addEventListener('click',()=>location.assign('portal.html'));
document.addEventListener('visibilitychange',()=>{if(document.hidden){gate.lock();main.replaceChildren();}else refresh();});
window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});
await refresh();
