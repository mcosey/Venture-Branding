import {nextStep, validConfiguration} from './flow.mjs';
const $ = id => document.getElementById(id);
const audience = document.body.dataset.audience;
const initialTitle = $('heading').textContent;
const initialIntro = $('intro').textContent;
const callback = new URLSearchParams(location.hash.slice(1));
let passwordSetup = ['invite','recovery'].includes(callback.get('type'));
let client;
let busy = false;
let pendingFactor = null;
function message(text = '', error = false) {
  $('message').textContent = text;
  $('message').dataset.error = String(error);
}
function show(id, title = initialTitle, intro = initialIntro) {
  for (const section of ['signin','recovery','set-password','mfa','signed-in']) $(section).hidden = section !== id;
  $('heading').textContent = title;
  $('intro').textContent = intro;
  message();
}
function clearSecrets() {
  for (const id of ['password','new-password','confirm-password','code']) $(id).value = '';
  $('qr').removeAttribute('src'); $('qr').hidden = true;
  $('setup-key').textContent = ''; $('setup-key').hidden = true;
}
async function perform(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(button => button.disabled = true);
  message();
  try { await action(); }
  catch { message('Unable to complete this step. Please try again or contact Venture Branding.', true); }
  finally { busy = false; document.querySelectorAll('button').forEach(button => button.disabled = false); }
}
async function refresh() {
  const {data: sessionData, error: sessionError} = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    clearSecrets(); pendingFactor = null;
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
    show('set-password','Set your password','Choose a password for your Venture Branding account.');
  } else {
    show('signed-in','Sign-in complete',''); clearSecrets();
  }
}
$('forgot').addEventListener('click', () => {show('recovery','Reset your password','We’ll email you a reset link.');$('recovery-email').value=$('email').value;});
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click',()=>show('signin')));
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
  if($('new-password').value!==$('confirm-password').value){message('The passwords do not match.',true);return;}
  const {error}=await client.auth.updateUser({password:$('new-password').value});
  if(error){message('The password could not be saved. Check the requirements or request a new link.',true);return;}
  clearSecrets(); passwordSetup=false;
  const {error:outError}=await client.auth.signOut({scope:'global'});
  if(outError)throw outError;
  await refresh();message('Password saved. Please sign in with your new password.');
});});
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
  const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;
  passwordSetup=false;await refresh();
}));
async function initialize() {
  if(!validConfiguration(window.VB_AUTH_CONFIG)||!window.supabase){
    document.querySelectorAll('form button,#forgot').forEach(button=>button.disabled=true);
    message('Sign-in setup is not available yet. Please contact Venture Branding.',true);return;
  }
  client=window.supabase.createClient(window.VB_AUTH_CONFIG.url,window.VB_AUTH_CONFIG.publishableKey,{
    auth:{storage:sessionStorage,storageKey:'vb-auth-'+audience,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}
  });
  client.auth.onAuthStateChange(event=>{
    if(event==='PASSWORD_RECOVERY')passwordSetup=true;
    // Do not await Auth calls inside its state-change callback (SDK holds a lock).
    if(event==='SIGNED_OUT')setTimeout(()=>{if(!busy){clearSecrets();$('signout').hidden=true;show('signin');}},0);
  });
  await perform(async()=>{
    await refresh();
    // Auth consumes fragments; remove errors/tokens from address bar even after failed callbacks.
    history.replaceState(null,'',location.pathname);
    if(callback.has('error'))message('This link is invalid or has expired. Request a new invitation or reset link.',true);
  });
}
initialize();
