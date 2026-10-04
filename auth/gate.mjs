export function setupGate(db,audience) {
 const gate=document.querySelector('[data-connection-gate]');
 const areas=[...document.querySelectorAll('[data-connected]')];
 const login=audience==='staff'?'attorney-login.html':'login.html';
 function lock(text='Checking access…'){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  areas.forEach(el=>el.hidden=true);gate.hidden=false;
  gate.replaceChildren();const p=document.createElement('p');p.textContent=text;gate.append(p);
  const link=document.createElement('a');link.href=login;link.textContent='Go to sign in';gate.append(link);
  const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();gate.append(retry);
 }
 function unlock(){gate.hidden=true;areas.forEach(el=>el.hidden=false);}
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')lock('You are signed out.');});
 document.querySelectorAll('[data-signout]').forEach(button=>button.addEventListener('click',async()=>{
  lock('Signing out…');const {error}=await db.auth.signOut({scope:'local'});
  if(error)lock('Could not finish signing out. Please retry.');else location.replace(login);
 }));
 return {lock,unlock};
}
