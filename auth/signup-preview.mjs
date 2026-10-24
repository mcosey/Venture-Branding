import {showFlowLoading} from '../shared/loading.mjs';
import {isDiagnosticError,supportMessage} from '../shared/diagnostics.mjs';
import {pendingInvitation,invitationDestination} from './invitation-route.mjs';
import {acknowledgments} from '../free/assets/llk-business-state.mjs';
import {memberAccountsEnabled,memberClient,matchingDraft,matchingClientDraft,signupProfile,SIGNUP_NOTICE,PENDING_SIGNUP,PENDING_CLIENT_SIGNUP,verifiedEntry,workspaceFor,completePendingSignup,completePendingClientSignup,onboardMember,onboardClient} from './member-account.mjs?v=client-onboarding-1';
const $=id=>document.getElementById(id);
const enabled=memberAccountsEnabled(window.VB_AUTH_CONFIG,location.hostname);
const engagementInvitation=enabled?pendingInvitation(sessionStorage,location.search):null;
const afterSetup=route=>invitationDestination(route,engagementInvitation);
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
let db,user,busy=false,initialized=false,clientMode=Boolean(engagementInvitation);
const confirmation=$('acknowledgment-confirmation');confirmation.checked=false;
function message(text,error=false){$('signup-status').textContent=text;$('signup-status').dataset.error=String(error);}
function clearPending(){for(const storage of [sessionStorage,globalThis.localStorage]){try{if(matchingDraft(storage?.getItem(PENDING_SIGNUP),user?.email))storage.removeItem(PENDING_SIGNUP);if(matchingClientDraft(storage?.getItem(PENDING_CLIENT_SIGNUP),user?.email,engagementInvitation))storage.removeItem(PENDING_CLIENT_SIGNUP);}catch{}}}
function accountButtons(){ $('create-account').disabled=!enabled||!initialized||busy; }
function showClientSetup(){
 $('acknowledgment-step').hidden=true;$('account-step').hidden=false;$('back').hidden=true;
 $('acknowledgments').replaceChildren();confirmation.required=false;
 $('heading').textContent=user?'Complete your Client profile':'Create your Client account';
 $('account-steps').textContent='Client account details';
 $('account-intro').textContent='Add a few basics for your account and Legal Launch Kit.';
 $('client-setup-note').hidden=false;
 $('create-account').textContent=user?'Save Client profile':'Create Client account';
}
confirmation.addEventListener('change',()=>{$('continue').disabled=!enabled||!confirmation.checked;});
$('acknowledgment-form').addEventListener('submit',event=>{
 event.preventDefault();if(!enabled||!confirmation.checked||!event.currentTarget.reportValidity())return;
 $('acknowledgment-step').hidden=true;$('account-step').hidden=false;$('account-heading').focus();
});
$('back').addEventListener('click',()=>{$('account-step').hidden=true;$('acknowledgment-step').hidden=false;$('acknowledgment-heading').setAttribute('tabindex','-1');$('acknowledgment-heading').focus();});
async function initialize(){
 const finish=showFlowLoading($('signup-loading'),'Checking account setup…','account');
 try{
  if(!enabled){$('signup-unavailable').hidden=false;return;}
  db=memberClient();const session=await db.auth.getSession();if(session.error)throw session.error;
  if(session.data.session){
   const access=await verifiedEntry(db,{requireProfile:true,invitationId:engagementInvitation});user=access.user;
   const signinPrompt=$('signup-signin');if(signinPrompt)signinPrompt.hidden=true;
   if(access.entry!=='onboarding'){location.replace(afterSetup(workspaceFor(access.entry)));return;}
   clientMode=access.onboardingKind==='client';
   $('heading').textContent='Complete your account setup';
   $('signup-email').value=user.email;$('signup-email').readOnly=true;
   $('password-fields').hidden=true;$('signup-password').required=false;$('confirm-signup-password').required=false;
   $('create-account').textContent='Complete account setup';
   if(access.companies?.[0])for(const [key,id]of [['name','company-name'],['industry','industry']])$(id).value=access.companies[0][key]||'';
   let pending,raw;const pendingKey=clientMode?PENDING_CLIENT_SIGNUP:PENDING_SIGNUP;
   for(const storage of [sessionStorage,globalThis.localStorage]){try{raw=storage?.getItem(pendingKey);pending=clientMode?matchingClientDraft(raw,user.email,engagementInvitation):matchingDraft(raw,user.email);if(pending)break;}catch{}}
   if(pending?.profile){
    for(const [key,id] of [['full_name','full-name'],['name','company-name'],['industry','industry']])$(id).value=pending.profile[key]||'';
    if(!clientMode)confirmation.checked=true;$('acknowledgment-step').hidden=true;$('account-step').hidden=false;
    message('Finishing your account setup…');
    const completed=clientMode?await completePendingClientSignup(db,user,raw,engagementInvitation):await completePendingSignup(db,user,raw);
    if(completed){clearPending();location.replace(afterSetup(clientMode?'portal.html':'member.html'));return;}
   }
  }
  initialized=true;accountButtons();
 }catch(error){const ref=isDiagnosticError(error)?error.supportReference:null;if(user){initialized=true;accountButtons();message(supportMessage('Your email is verified, but setup could not finish. Please try saving your profile again.',ref),true);}else{message(supportMessage('Unable to connect your account or invitation. Please sign in again.',ref),true);$('account-step').hidden=false;}}
 finally{finish();if(enabled&&clientMode)showClientSetup();else if(enabled&&$('account-step').hidden)$('acknowledgment-step').hidden=false;}
}
$('registration-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!enabled||!initialized||busy||(!clientMode&&!confirmation.checked)||!event.currentTarget.reportValidity())return;
 busy=true;accountButtons();message('');
 const finish=showFlowLoading($('signup-loading'),'Saving your account…');
 try{
  const profile=signupProfile({fullName:$('full-name').value,companyName:$('company-name').value,industry:$('industry').value});
  if(user){
   if(clientMode)await onboardClient(db,profile,engagementInvitation);else await onboardMember(db,profile);
   clearPending();
   location.replace(afterSetup(clientMode?'portal.html':'member.html'));return;
  }
  if($('signup-password').value!==$('confirm-signup-password').value){message('The passwords do not match.',true);return;}
  const email=$('signup-email').value.trim();
  const result=await db.auth.signUp({email,password:$('signup-password').value,options:{emailRedirectTo:location.origin+'/login.html'+(engagementInvitation?'?invitation='+encodeURIComponent(engagementInvitation):'')}});
  if(result.error)throw result.error;
  const draft=JSON.stringify(clientMode?{version:1,email,profile,invitation:engagementInvitation}:{notice:SIGNUP_NOTICE,email,profile});
  for(const storage of [sessionStorage,globalThis.localStorage]){try{storage?.setItem(clientMode?PENDING_CLIENT_SIGNUP:PENDING_SIGNUP,draft);}catch{}}
  if(result.data.session){message('Your account is ready to finish setup. Continue through Sign in.');}
  else message('Check your email to verify your account, then sign in to finish setup. If you already have an account, use Sign in.');
 }catch(error){message(supportMessage('Unable to complete registration. Please try again or sign in if you already have an account.',isDiagnosticError(error)?error.supportReference:null),true);}
 finally{finish();$('signup-password').value='';$('confirm-signup-password').value='';busy=false;accountButtons();}
});
initialize();
