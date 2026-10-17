const clientPages=new Set(['portal.html','portfolio.html','automations.html','watch.html','trademark-watch.html','watch-finding.html','trademark.html','new-mark.html','use-history.html','messages.html','account.html','maintenance.html','brand-monitor.html','digest.html']);

export function selectedClientId(clients,current,search){
 const id=current||new URLSearchParams(search).get('client')||clients[0]?.id;
 if(!clients.some(client=>client.id===id))throw new Error('This client is not available to your account.');
 return id;
}

export function clientDestination(href,id,base){
 const url=new URL(href,base),current=new URL(base);
 if(!id||url.origin!==current.origin||!clientPages.has(url.pathname.slice(1)))return null;
 url.searchParams.set('client',id);
 return url.pathname+url.search+url.hash;
}

export function setupClientNavigation(document,location,history,getClientId){
 const update=anchor=>{
  const href=anchor.getAttribute('href');
  if(!href||href.startsWith('#'))return;
  const destination=clientDestination(href,getClientId(),location.href);
  if(destination)anchor.setAttribute('href',destination);
 };
 // Also cover links added by asynchronous panels and modified/middle clicks.
 for(const event of ['click','auxclick'])document.addEventListener(event,e=>{
  const anchor=e.target.closest?.('a[href]');if(anchor)update(anchor);
 },true);
 return ()=>{
  const id=getClientId();if(!id)return;
  document.querySelectorAll('#portal-nav a[href], main a[href]').forEach(update);
  const url=new URL(location.href);url.searchParams.set('client',id);history.replaceState(null,'',url);
 };
}
