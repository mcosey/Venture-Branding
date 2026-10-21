import {createDiagnostics,isDiagnosticError} from '../shared/diagnostics.mjs';
import {showFlowLoading} from '../shared/loading.mjs';
import {pendingInvitation,invitationDestination} from './invitation-route.mjs';
import {memberAccountsEnabled,verifiedEntry,workspaceFor} from './member-account.mjs?v=1';
import {nextStep, validConfiguration} from './flow.mjs?v=20261011-test-portal';
import {requireAccess} from './connection.mjs?v=20261018-record-pages';
const $ = id => document.getElementById(id);
const audience = document.body.dataset.audience;
const signupPrompt=$('signup-prompt');
if(signupPrompt)signupPrompt.hidden=!memberAccountsEnabled(window.VB_AUTH_CONFIG,location.hostname);
const initialTitle = $('heading').textContent;
const initialIntro = $('intro').textContent;
const callback = new URLSearchParams(location.hash.slice(1));
const engagementInvitation=audience==='client'&&memberAccountsEnabled(window.VB_AUTH_CONFIG,location.hostname)?pendingInvitation(sessionStorage,location.search):null;
let passwordSetup = ['invite','recovery'].includes(callback.get('type'));
let client;
let busy = false;
let firstLoad = true;
let pendingFactor = null;
let passwordActor = null;
let passwordSaved = false;
let authGeneration = 0;
let needsCurrentPassword = false;
let needsPasswordCode = false;
let focusAfterAction = null;
function message(text = '', error = false) {
  $('message').textContent = text;
  $('message').dataset.error = String(error);
}
function show(id, title = initialTitle, intro = initialIntro) {
  for (const section of ['signin','recovery','set-password','password-saved','mfa','signed-in']) $(section).hidden = section !== id;
  if(id!=='set-password'){
    clearPasswordChecks();$('new-password').value='';$('confirm-password').value='';
  }
  $('heading').textContent = title;
  $('intro').textContent = intro;
  message();
}
function clearSecrets() {
  for (const id of ['password','new-password','confirm-password','code']) $(id).value = '';
  clearPasswordChecks();
  $('qr').removeAttribute('src'); $('qr').hidden = true;
  $('setup-key').textContent = ''; $('setup-key').hidden = true;
}
function clearPasswordChecks(){
  focusAfterAction=null;
  needsCurrentPassword=false;needsPasswordCode=false;
  for(const [section,input]of [['password-current-step','current-password'],['password-code-step','password-nonce']]){
    $(section).hidden=true;$(input).value='';$(input).disabled=true;$(input).required=false;
  }
  $('password-resend').textContent='Send verification code';
}
function requestPasswordCheck(kind){
  const current=kind==='current';
  if(current)needsCurrentPassword=true;else needsPasswordCode=true;
  $(current?'password-current-step':'password-code-step').hidden=false;
  const input=$(current?'current-password':'password-nonce');
  input.disabled=false;input.required=true;input.value='';
  focusAfterAction=current?input:$('password-resend');
}
function passwordContextCurrent(context){
  return context&&passwordSetup&&!passwordSaved&&context.actor===passwordActor&&context.generation===authGeneration;
}
function passwordSessionExpired(){
  passwordSetup=false;passwordSaved=false;passwordActor=null;clearSecrets();show('signin');
  message('Your sign-in changed. Sign in again or request a new password reset link.',true);
}
async function passwordContext(){
  if(!passwordSetup||passwordSaved||!passwordActor)return null;
  const context={actor:passwordActor,generation:authGeneration};
  const {data,error}=await client.auth.getUser();
  if(error||!data.user||data.user.id!==context.actor||!passwordContextCurrent(context)){
    passwordSessionExpired();return null;
  }
  const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assuranceError)throw assuranceError;
  if(!passwordContextCurrent(context)){passwordSessionExpired();return null;}
  if(assurance.currentLevel!=='aal2'&&assurance.nextLevel==='aal2'){
    clearSecrets();await refresh();return null;
  }
  return context;
}
async function finishPasswordSignout(){
  if(!passwordSaved)return;
  try{
    const {data,error:identityError}=await client.auth.getUser();
    if(identityError)throw identityError;
    if(!passwordSaved)return;
    if(!data.user)throw Error('Sign-out identity unavailable');
    if(data.user?.id!==passwordActor){passwordSessionExpired();return;}
    const {error}=await client.auth.signOut({scope:'global'});
    if(error)throw error;
  }catch{
    if(!passwordSaved)return;
    show('password-saved','Password saved','Finish signing out before continuing.');
    $('signout').hidden=true;
    message(createDiagnostics('auth').error('signout','Your password was saved, but we couldn’t finish signing out. Retry signing out. If this continues, contact Venture Branding.').message,true);
    return;
  }
  if(!passwordSaved)return;
  passwordSaved=false;passwordSetup=false;passwordActor=null;clearSecrets();
  show('signin');$('signout').hidden=true;
  message('Password saved. Please sign in with your new password.');
}
async function perform(action,stage='refresh') {
  const diagnostic=createDiagnostics('auth');
  if (busy) return;
  busy = true;
  const host=$('auth-flow-loading');
  const finish=host?showFlowLoading(host,firstLoad?'Checking sign-in…':'Please wait…',firstLoad?'account':'action'):()=>{};
  document.querySelectorAll('button').forEach(button => button.disabled = true);
  message();
  try { await action(); }
  catch(error) { if(firstLoad)show('signin');message(isDiagnosticError(error)?error.message:diagnostic.error(stage,'Unable to complete this step. Please try again or contact Venture Branding.').message, true); }
  finally {
    finish();firstLoad=false;busy = false;
    document.querySelectorAll('button').forEach(button => button.disabled = false);
    focusAfterAction?.focus();focusAfterAction=null;
  }
}
async function refresh() {
  const {data: sessionData, error: sessionError} = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    clearSecrets(); pendingFactor = null;passwordActor=null;
    $('signout').hidden = true; show('signin'); return;
  }
  // Confirm identity with Auth; never trust a stored session or editable metadata alone.
  const {data, error} = await client.auth.getUser();
  if (error || !data.user) {
    await client.auth.signOut({scope:'local'});
    show('signin'); $('signout').hidden = true;
    message('Your session has expired. Please sign in again.', true); return;
  }
  $('signout').hidden = false;
  const {data: assurance, error: assuranceError} = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  const step = nextStep({user:data.user, audience, currentLevel:assurance.currentLevel,
    nextLevel:assurance.nextLevel, passwordSetup});
  if (step === 'mfa') {
    show('mfa','Verify your sign-in','Use your authenticator app.');
    const {data:factors, error:factorError} = await client.auth.mfa.listFactors();
    if (factorError) throw factorError;
    const verified = factors.totp.filter(f => f.status === 'verified');
    $('factor').replaceChildren();
    for (const factor of verified) $('factor').add(new Option(factor.friendly_name || 'Authenticator',factor.id));
    $('enroll').hidden = verified.length > 0 || Boolean(pendingFactor);
    $('verify').hidden = verified.length === 0 && !pendingFactor;
    if (pendingFactor) $('factor').add(new Option('New authenticator',pendingFactor));
    $('mfa-instructions').textContent = verified.length || pendingFactor ? 'Enter the six-digit code from your app.' : 'Set up an authenticator before continuing.';
  } else if (step === 'set-password') {
    if(passwordActor!==data.user.id)clearSecrets();
    passwordActor=data.user.id;
    show('set-password','Set your password','Choose a password for your Venture Branding account.');
  } else {
    if(audience==='client'&&memberAccountsEnabled(window.VB_AUTH_CONFIG,location.hostname)){
      const access=await verifiedEntry(client);clearSecrets();location.replace(invitationDestination(workspaceFor(access.entry),engagementInvitation));return;
    }
    await requireAccess(client,audience);
    clearSecrets();
    location.replace(audience === 'staff' ? 'attorney.html' : 'portal.html');
  }
}
$('forgot').addEventListener('click', () => {passwordSetup=false;passwordActor=null;clearSecrets();show('recovery','Reset your password','We’ll email you a reset link.');$('recovery-email').value=$('email').value;});
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click',()=>{passwordSetup=false;passwordActor=null;clearSecrets();show('signin');}));
$('signin').addEventListener('submit', event => {event.preventDefault(); perform(async()=>{
  const {error} = await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  $('password').value='';
  if(error){message('Unable to sign in. Check your email and password, or use your invitation link.',true);return;}
  passwordSetup=false; await refresh();
});});
$('recovery').addEventListener('submit',event=>{event.preventDefault();perform(async()=>{
  const {error} = await client.auth.resetPasswordForEmail($('recovery-email').value.trim(),{redirectTo:location.origin+location.pathname});
  if(error){message('The reset email could not be requested. Please try again later.',true);return;}
  message('If this address has an account, a reset link will arrive shortly.');
});});
$('set-password').addEventListener('submit',event=>{event.preventDefault();perform(async()=>{
  if(passwordSaved||!passwordSetup)return;
  if(!$('set-password').reportValidity())return;
  if($('new-password').value!==$('confirm-password').value){message('The passwords do not match.',true);return;}
  const context=await passwordContext();if(!context)return;
  const attributes={password:$('new-password').value};
  if(needsCurrentPassword)attributes.current_password=$('current-password').value;
  if(needsPasswordCode)attributes.nonce=$('password-nonce').value.trim();
  let result;
  try{result=await client.auth.updateUser(attributes);}
  finally{$('current-password').value='';$('password-nonce').value='';}
  if(!passwordContextCurrent(context)){passwordSessionExpired();return;}
  if(result.error){
    const code=result.error.code;
    if(['current_password_required','current_password_mismatch'].includes(code)){
      requestPasswordCheck('current');message('Confirm your current password, or use a new reset link if you’ve forgotten it.',true);
    }else if(code==='reauthentication_needed'){
      requestPasswordCheck('code');message('Request an email verification code, then enter it to save your password.');
    }else if(['reauthentication_not_valid','otp_expired'].includes(code)){
      requestPasswordCheck('code');$('password-nonce').focus();message('That verification code is invalid or has expired. Enter the latest code or request a new one.',true);
    }else if(code==='same_password')message('Choose a new password that is different from your current password.',true);
    else if(code==='weak_password')message('Choose a stronger password that meets the displayed requirements.',true);
    else message('The password could not be saved. Check the requirements or request a new link.',true);
    return;
  }
  passwordSaved=true;passwordSetup=false;clearSecrets();
  await finishPasswordSignout();
},'password');});
$('password-resend').addEventListener('click',()=>perform(async()=>{
  if(!needsPasswordCode)return;
  const context=await passwordContext();if(!context)return;
  $('password-nonce').value='';
  const {error}=await client.auth.reauthenticate();
  if(!passwordContextCurrent(context)){passwordSessionExpired();return;}
  if(error){message('The verification code could not be requested. Please wait before trying again, or request a new reset link.',true);return;}
  $('password-resend').textContent='Send a new code';$('password-nonce').focus();
  message('Check your sign-in email for the verification code. Enter the latest code to continue.');
},'password'));
$('password-reset-link').addEventListener('click',()=>perform(async()=>{
  if(!needsCurrentPassword)return;
  const context=await passwordContext();if(!context)return;
  const {data,error}=await client.auth.getUser();
  if(error||data.user?.id!==context.actor||!data.user.email||!passwordContextCurrent(context)){passwordSessionExpired();return;}
  const result=await client.auth.resetPasswordForEmail(data.user.email,{redirectTo:location.origin+location.pathname});
  if(!passwordContextCurrent(context)){passwordSessionExpired();return;}
  if(result.error){message('The reset email could not be requested. Please try again later.',true);return;}
  clearSecrets();passwordSetup=false;passwordActor=null;
  show('recovery','Check your email','Open the new reset link to choose your password.');
  $('recovery-email').value=data.user.email;
  message('A reset link has been requested for your sign-in email.');
},'recovery'));
$('retry-password-signout').addEventListener('click',()=>perform(finishPasswordSignout,'signout'));
$('enroll').addEventListener('click',()=>perform(async()=>{
  const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'VB '+new Date().toISOString()});
  if(error)throw error;
  pendingFactor=data.id;
  $('qr').src=data.totp.qr_code.startsWith('data:image/')?data.totp.qr_code:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data.totp.qr_code);
  $('qr').hidden=false;
  $('setup-key').textContent='Manual setup key: '+data.totp.secret; $('setup-key').hidden=false;
  $('factor').replaceChildren(new Option('New authenticator',pendingFactor));
  $('enroll').hidden=true;$('verify').hidden=false;
}));
$('verify').addEventListener('submit',event=>{event.preventDefault();perform(async()=>{
  const {error}=await client.auth.mfa.challengeAndVerify({factorId:$('factor').value,code:$('code').value});
  $('code').value='';
  if(error){message('That code could not be verified. Try the latest code from your app.',true);return;}
  pendingFactor=null; clearSecrets();await refresh();
});});
$('signout').addEventListener('click',()=>perform(async()=>{
  if(passwordSaved){await finishPasswordSignout();return;}
  const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;
  passwordSetup=false;await refresh();
}));
async function initialize() {
 try {
  if(!validConfiguration(window.VB_AUTH_CONFIG)||!window.supabase){
    if($('auth-flow-loading')){$('auth-flow-loading').hidden=true;$('auth-flow-loading').setAttribute('aria-busy','false');}
    show('signin');
    document.querySelectorAll('form button,#forgot').forEach(button=>button.disabled=true);
    message('Sign-in setup is not available yet. Please contact Venture Branding.',true);return;
  }
  if(window.VB_AUTH_CONFIG.environment==='bcm-test'&&!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Test preview is local only.');
  client=window.supabase.createClient(window.VB_AUTH_CONFIG.url,window.VB_AUTH_CONFIG.publishableKey,{
    auth:{storage:sessionStorage,storageKey:(window.VB_AUTH_CONFIG.environment==='bcm-test'?'vb-bcm-ai-test-':'vb-auth-')+audience,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}
  });
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY')passwordSetup=true;
    if(event==='SIGNED_IN'&&passwordActor&&session?.user?.id&&session.user.id!==passwordActor){
      authGeneration++;passwordSessionExpired();
    }
    // Do not await Auth calls inside its state-change callback (SDK holds a lock).
    if(event==='SIGNED_OUT'){
      authGeneration++;clearSecrets();
      setTimeout(()=>{if(!busy&&!passwordSaved){passwordSetup=false;passwordActor=null;clearSecrets();$('signout').hidden=true;if($('signin').hidden)show('signin');}},0);
    }
  });
  await perform(async()=>{
    await refresh();
    if(callback.has('error'))message('This link is invalid or has expired. Request a new invitation or reset link.',true);
  },'initialize');
 } finally {
  // Wait for SDK initialization before removing callback state, including errors.
  // The pending invitation was retained separately before initialization began.
  history.replaceState(null,'',location.pathname);
 }
}
initialize();
