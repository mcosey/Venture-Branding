import {memberContext} from '../../auth/member-session.mjs?v=1';
import {BUSINESS_KEY, decodeBusiness} from './llk-business-state.mjs';

// Presentation only. Never load client records or infer authorization from local data.
if(memberContext?.entry==='client'&&location.pathname.endsWith('/member.html'))location.replace('portal.html');
// This changes navigation only; every Client destination still checks access.
if(memberContext?.entry==='client'){
 const nav=document.getElementById('portal-nav');
 const badge=document.querySelector('.member-badge');if(badge)badge.textContent='Client';
 const home=nav?.querySelector('a[href$="member.html"]');if(home)home.href=new URL('portal.html',location.origin).href;
 const routes={'Brand Map':'portal.html','Portfolio':'portfolio.html','VB Agents':'automations.html','Watch':'watch.html','Use History':'use-history.html','Messages':'messages.html'};
 for(const button of nav?.querySelectorAll('button[data-feature]')||[]){
  const route=routes[button.dataset.feature];if(!route)continue;
  const link=document.createElement('a');link.href=new URL(route,location.origin).href;
  for(const child of button.children)if(!child.classList.contains('nav-lock'))link.append(child.cloneNode(true));
  button.replaceWith(link);
 }
 const settings=document.createElement('a');settings.href=new URL('account.html',location.origin).href;
 const icon=nav?.querySelector('a[href$="#business"] svg');if(icon)settings.append(icon.cloneNode(true));
 const label=document.createElement('span');label.textContent='Account Settings';settings.append(label);nav?.append(settings);
}
if(memberContext){
 const label=document.getElementById('member-company');if(label&&memberContext.company)label.textContent=memberContext.company.name;
 const topbar=document.querySelector('.member-topbar');
 const signout=document.createElement('button');signout.textContent='Sign out';signout.type='button';
 signout.addEventListener('click',async()=>{signout.disabled=true;const result=await memberContext.db.auth.signOut({scope:'local'});if(!result.error)location.replace(new URL('login.html',location.origin).href);else signout.disabled=false;});
 topbar?.append(signout);
}else{
 try {const company=decodeBusiness(localStorage.getItem(BUSINESS_KEY)).profile;const label=document.getElementById('member-company');if(company?.name&&label)label.textContent=company.name;}catch{}
}
const menu = document.querySelector('.menu-toggle');
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  document.getElementById('portal-nav').classList.toggle('open', expanded);
});
const dialog = document.getElementById('feature-dialog');
for (const button of document.querySelectorAll('[data-feature]')) {
  button.addEventListener('click', () => {
    document.getElementById('feature-title').textContent = button.dataset.feature;
    dialog.showModal();
  });
}
document.getElementById('close-feature').addEventListener('click', () => dialog.close());
