import {acknowledgments} from '../free/assets/llk-business-state.mjs';
import {memberAccountsEnabled,memberClient,matchingDraft,signupProfile,SIGNUP_NOTICE,PENDING_SIGNUP,verifiedEntry,workspaceFor,completePendingSignup} from './member-account.mjs?v=2';
const $=id=>document.getElementById(id);
const enabled=memberAccountsEnabled(window.VB_AUTH_CONFIG,location.hostname);
for(const acknowledgment of acknowledgments.filter(item=>item.id!=='prototype')){
 const item=document.createElement('li');
 if(acknowledgment.id==='policies'){
  const privacy=document.createElement('a');privacy.href='privacy.html';privacy.textContent='Privacy Policy';privacy.target='_blank';privacy.rel='noopener noreferrer';
  const terms=document.createElement('a');terms.href='terms.html';terms.textContent='Terms of Service';terms.target='_blank';terms.rel='noopener noreferrer';
  item.append('I have read, understood, and accepted the ',privacy,' and ',terms,'.');
 }else{
  const text=acknowledgment.id==='information'?'I understand that I should not assume my entries are attorney-client privileged. I will avoid confidential legal details. My entries are not sent to an attorney for review.':acknowledgment.text;
  item.textContent=text.replace(/\bLLK\b/g,'the Legal Launch Kit');
 }
 $('acknowledgments').append(item);
}
let db,user,busy=false,initialized=false;
const confirmation=$('acknowledgment-confirmation');confirmation.checked=false;
function message(text,error=false){$('signup-status').textContent=text;$('signup-status').dataset.error=String(error);}
function clearPending(){for(const storage of [sessionStorage,globalThis.localStorage]){try{if(matchingDraft(storage?.getItem(PENDING_SIGNUP),user?.email))storage.removeItem(PENDING_SIGNUP);}catch{}}}
function accountButtons(){ $('create-account').disabled=!enabled||!initialized||busy; }
confirmation.addEventListener('change',()=>{$('continue').disabled=!confirmation.checked;});
$('acknowledgment-form').addEventListener('submit',event=>{
 event.preventDefault();if(!confirmation.checked||!event.currentTarget.reportValidity())return;
 $('acknowledgment-step').hidden=true;$('account-step').hidden=false;$('account-heading').focus();
});
$('back').addEventListener('click',()=>{$('account-step').hidden=true;$('acknowledgment-step').hidden=false;$('acknowledgment-heading').setAttribute('tabindex','-1');$('acknowledgment-heading').focus();});
async function initialize(){
 if(!enabled)return;
 try{
  db=memberClient();const session=await db.auth.getSession();if(session.error)throw session.error;
  if(session.data.session){
   const access=await verifiedEntry(db);user=access.user;
   if(access.entry!=='onboarding'){location.replace(workspaceFor(access.entry));return;}
   $('signup-email').value=user.email;$('signup-email').readOnly=true;
   $('password-fields').hidden=true;$('signup-password').required=false;$('confirm-signup-password').required=false;
   $('create-account').textContent='Complete account setup';
   let pending,raw;
   for(const storage of [sessionStorage,globalThis.localStorage]){try{raw=storage?.getItem(PENDING_SIGNUP);pending=matchingDraft(raw,user.email);if(pending)break;}catch{}}
   if(pending?.profile){
    for(const [key,id] of [['full_name','full-name'],['name','company-name'],['industry','industry']])$(id).value=pending.profile[key]||'';
    confirmation.checked=true;$('acknowledgment-step').hidden=true;$('account-step').hidden=false;
    message('Finishing your account setup…');
    if(await completePendingSignup(db,user,raw)){clearPending();location.replace('member.html');return;}
   }
  }
  initialized=true;accountButtons();
 }catch{if(user){initialized=true;accountButtons();message('Your email is verified, but setup could not finish. Please try Complete account setup again.',true);}else message('Unable to connect your account. Please sign in again.',true);}
}
$('registration-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!enabled||!initialized||busy||!confirmation.checked||!event.currentTarget.reportValidity())return;
 busy=true;accountButtons();message('');
 try{
  const profile=signupProfile({fullName:$('full-name').value,companyName:$('company-name').value,industry:$('industry').value});
  if(user){
   const result=await db.rpc('vb_onboard_test_member',{profile,notice:SIGNUP_NOTICE,confirmed:true});
   if(result.error)throw result.error;
   clearPending();
   location.replace('member.html');return;
  }
  if($('signup-password').value!==$('confirm-signup-password').value){message('The passwords do not match.',true);return;}
  const email=$('signup-email').value.trim();
  const result=await db.auth.signUp({email,password:$('signup-password').value,options:{emailRedirectTo:location.origin+'/login.html'}});
  if(result.error)throw result.error;
  const draft=JSON.stringify({notice:SIGNUP_NOTICE,email,profile});
  for(const storage of [sessionStorage,globalThis.localStorage]){try{storage?.setItem(PENDING_SIGNUP,draft);}catch{}}
  if(result.data.session){message('Your account is ready to finish setup. Continue through Sign in.');}
  else message('Check your email to verify your account, then sign in to finish setup. If you already have an account, use Sign in.');
 }catch{message('Unable to complete registration. Please try again or sign in if you already have an account.',true);}
 finally{$('signup-password').value='';$('confirm-signup-password').value='';busy=false;accountButtons();}
});
initialize();
