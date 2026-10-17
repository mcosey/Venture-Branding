import {memberContext} from '../../auth/member-session.mjs?v=1';
import {BUSINESS_KEY, decodeBusiness} from './llk-business-state.mjs';

// Presentation only. Never load client records or infer authorization from local data.
if(memberContext?.entry==='client'&&location.pathname.endsWith('/member.html'))location.replace('portal.html');
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
