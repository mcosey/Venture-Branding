import {pageSkeleton,loadingLabels,attorneySkeleton,attorneyLoadingLabels} from '../shared/loading.mjs';
export function setupGate(db,audience) {
 const gate=document.querySelector('[data-connection-gate]');
 const announce=document.createElement('p');announce.className='vb-loading-status';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');announce.setAttribute('aria-atomic','true');gate.before(announce);gate.removeAttribute('role');
 const areas=[...document.querySelectorAll('[data-connected]')];
 const login=audience==='staff'?'attorney-login.html':'login.html';
 let revision=0;
 const initialLayout=gate.dataset.loadingLayout;
 const labels={...loadingLabels,...attorneyLoadingLabels};
 function loadingLayout(){
  if(audience!=='staff'||!initialLayout?.startsWith('staff-'))return initialLayout;
  const view=location.hash.slice(1)||'overview';
  return view.startsWith('client-')?'staff-client':Object.hasOwn(attorneyLoadingLabels,'staff-'+view)?'staff-'+view:'staff-overview';
 }
 function lock(text='Checking access…'){
  const ticket=++revision;
  const layout=loadingLayout();
  const loading=['Checking access…','Signing out…'].includes(text);
  gate.setAttribute('aria-busy',String(loading));
  const message=loading&&Object.hasOwn(labels,layout)&&text!=='Signing out…'?'Loading '+labels[layout]+'…':text;
  if(announce.textContent!==message)announce.textContent=message;
  if(loading&&gate.hidden===false&&gate.dataset.loadingLayout===layout&&gate.dataset.loadingMessage===message)return ticket;
  gate.dataset.loadingMessage=message;
  if(loading&&Object.hasOwn(labels,layout))gate.dataset.loadingLayout=layout;else delete gate.dataset.loadingLayout;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  areas.forEach(el=>el.hidden=true);gate.hidden=false;
  gate.replaceChildren();
  if(loading&&Object.hasOwn(labels,layout)){
   const status=document.createElement('span');status.className='vb-loading-status';status.textContent=text==='Signing out…'?text:'Loading '+labels[layout]+'…';
   const template=document.createElement('template');template.innerHTML=layout.startsWith('staff-')?attorneySkeleton(layout):pageSkeleton(layout);gate.append(status,template.content);return ticket;
  }
  const p=document.createElement('p');p.textContent=text;gate.append(p);
  if(loading)return ticket;
  const link=document.createElement('a');link.href=login;link.textContent='Go to sign in';gate.append(link);
  const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();gate.append(retry);return ticket;
 }
 function unlock(ticket=revision){if(ticket!==revision)return false;announce.textContent='';gate.setAttribute('aria-busy','false');gate.hidden=true;areas.forEach(el=>el.hidden=false);return true;}
 function current(ticket){return ticket===revision;}
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')lock('You are signed out.');});
 document.querySelectorAll('[data-signout]').forEach(button=>button.addEventListener('click',async()=>{
  lock('Signing out…');const {error}=await db.auth.signOut({scope:'local'});
  if(error)lock('Could not finish signing out. Please retry.');else location.replace(login);
 }));
 return {lock,unlock,current};
}

export function showConnectionError(audience){
 const gate=document.querySelector('[data-connection-gate]');
 document.querySelectorAll('[data-connected]').forEach(area=>area.hidden=true);
 gate.hidden=false;gate.setAttribute('aria-busy','false');delete gate.dataset.loadingLayout;
 gate.replaceChildren();const text=document.createElement('p');text.textContent='Connection unavailable. Please reload this page to try again.';gate.append(text);
 const retry=document.createElement('button');retry.textContent='Retry';retry.type='button';retry.addEventListener('click',()=>location.reload());
 const signIn=document.createElement('a');signIn.href=audience==='staff'?'attorney-login.html':'login.html';signIn.textContent='Go to sign in';gate.append(signIn,retry);
}
