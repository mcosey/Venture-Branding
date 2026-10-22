import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createDiagnostics,isDiagnosticError} from '../shared/diagnostics.mjs';
import {nextStep,validConfiguration} from '../auth/flow.mjs';
import {memberAccountsEnabled,workspaceFor} from '../auth/member-account.mjs';
import {pendingInvitation,invitationDestination} from '../auth/invitation-route.mjs';
const source=(await readFile(new URL('../auth/auth.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'').replace(/initialize\(\);\s*$/,'await initialize();');
const password='Synthetic-only-new-password',current='Synthetic-only-current-password',nonce='12345678';
const tick=()=>new Promise(setImmediate);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

async function harness({audience='client',hash='#type=recovery',nextLevel='aal1',currentLevel='aal1',updates=[],signouts=[],reauth=[],resets=[],waitUpdate,waitCode,search=''}={}){
 const nodes=new Map(),calls=[],diagnostics=[],storage=new Map();
 let user={id:'synthetic-actor',email:'fixture@example.test'},signedIn=true,level=currentLevel,onAuthStateChange;
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{textContent:id,value:'',dataset:{},hidden:false,disabled:false,required:false,events:{},
   addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},removeAttribute(){},replaceChildren(){},add(){},focus(){if(!this.disabled)this.focused=true;},
   reportValidity(){
    if(id!=='set-password')return true;
    return node('new-password').value.length>=12&&node('confirm-password').value.length>=12&&
     (!node('current-password').required||Boolean(node('current-password').value))&&
     (!node('password-nonce').required||/^[0-9]{6,10}$/.test(node('password-nonce').value));
   }});
  return nodes.get(id);
 };
 const outcome=async queue=>{const value=queue.shift();if(value instanceof Error)throw value;return value?{error:value}:{};};
 const db={auth:{getSession:async()=>({data:{session:signedIn?{}:null}}),getUser:async()=>({data:{user:signedIn?user:null}}),
  mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level,nextLevel}}),listFactors:async()=>({data:{totp:[{id:'factor',status:'verified'}]}}),challengeAndVerify:async()=>{calls.push(['mfa']);level='aal2';return {}; }},
  onAuthStateChange(fn){onAuthStateChange=fn;},
  updateUser:async attributes=>{calls.push(['update',JSON.parse(JSON.stringify(attributes))]);if(waitUpdate)await waitUpdate;return outcome(updates);},
  reauthenticate:async()=>{calls.push(['reauth']);if(waitCode)await waitCode;return outcome(reauth);},
  resetPasswordForEmail:async(...args)=>{calls.push(['reset',...args]);return outcome(resets);},
  signOut:async options=>{calls.push(['signout',options.scope]);const result=await outcome(signouts);if(!result.error){signedIn=false;onAuthStateChange('SIGNED_OUT');}return result;}
 }};
 const config={environment:'bcm-test',memberAccountsEnabled:true,url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_example'};
 const back=node('back');
 const context={createDiagnostics:feature=>createDiagnostics(feature,{sink:e=>diagnostics.push(e)}),isDiagnosticError,
  document:{body:{dataset:{audience}},getElementById:node,querySelectorAll:s=>s==='[data-back]'?[back]:s==='button'?['forgot','password-resend','password-reset-link','retry-password-signout','signout'].map(node):[]},
  window:{VB_AUTH_CONFIG:config,supabase:{createClient:()=>db}},
  location:{hash,search,hostname:'127.0.0.1',origin:'http://127.0.0.1:8893',pathname:audience==='staff'?'/attorney-login.html':'/login.html',replace:route=>calls.push(['route',route])},
  sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
  history:{replaceState:(_a,_b,path)=>calls.push(['clean',path])},URLSearchParams,setTimeout,Option:class Option{},
  nextStep,validConfiguration,memberAccountsEnabled,workspaceFor,pendingInvitation,invitationDestination,
  verifiedEntry:async()=>({entry:'member'}),requireAccess:async()=>{},showFlowLoading:()=>()=>{}};
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 const fire=(id,event='click')=>node(id).events[event]({preventDefault(){}});
 const action=async(id,event='click')=>{fire(id,event);await tick();};
 const fill=()=>{node('new-password').value=password;node('confirm-password').value=password;};
 const save=async()=>{fill();await action('set-password','submit');};
 const changeUser=()=>{user={id:'different-actor',email:'different@example.test'};};
 const emit=(event,session)=>{if(event==='SIGNED_OUT')signedIn=false;onAuthStateChange(event,session);};
 return {node,calls,diagnostics,storage,fire,action,fill,save,changeUser,emit};
}

test('fresh recovery and first invite retain password-only setup for both entrances',async()=>{
 for(const audience of ['client','staff'])for(const type of ['invite','recovery']){
  const h=await harness({audience,hash:'#type='+type});assert.equal(h.node('set-password').hidden,false);
  assert.equal(h.node('password-current-step').hidden,true);assert.equal(h.node('current-password').disabled,true);
  assert.equal(h.node('password-code-step').hidden,true);await h.save();
  assert.deepEqual(h.calls.filter(c=>c[0]==='update'),[['update',{password}]]);
  assert.deepEqual(h.calls.filter(c=>c[0]==='signout'),[['signout','global']]);
  assert.equal(h.node('signin').hidden,false);assert.match(h.node('message').textContent,/Password saved/);
  assert.equal(h.node('new-password').value,'');assert.equal(h.node('confirm-password').value,'');
 }
});
test('ordinary Member callback retains invitation routing without password setup',async()=>{
 const invitation='10000000-0000-0000-0000-000000000001';
 const h=await harness({hash:'#type=magiclink',search:'?invitation='+invitation});
 assert(h.calls.some(c=>c[0]==='route'&&c[1]==='invitation.html?invitation='+invitation));
 await h.save();assert.equal(h.calls.some(c=>c[0]==='update'),false);
});
test('form validity and matching confirmation precede mutation',async()=>{
 const h=await harness();h.node('new-password').value='short';h.node('confirm-password').value='short';
 await h.action('set-password','submit');assert.equal(h.calls.some(c=>c[0]==='update'),false);
 h.fill();h.node('confirm-password').value='a-different-long-password';await h.action('set-password','submit');
 assert.equal(h.calls.some(c=>c[0]==='update'),false);assert.match(h.node('message').textContent,/do not match/);
});
test('extra email verification is requested only after Auth asks and the user clicks send',async()=>{
 const h=await harness({updates:[{code:'reauthentication_needed'}]});
 await h.action('password-resend');assert.equal(h.calls.some(c=>c[0]==='reauth'),false);
 await h.save();assert.equal(h.node('password-code-step').hidden,false);assert.equal(h.node('password-nonce').required,true);
  assert.equal(h.node('password-resend').focused,true);
 assert.equal(h.calls.some(c=>c[0]==='reauth'),false);
 await h.action('password-resend');assert.equal(h.calls.filter(c=>c[0]==='reauth').length,1);
 h.node('password-nonce').value=nonce;await h.save();
 assert.deepEqual(h.calls.filter(c=>c[0]==='update')[1],['update',{password,nonce}]);
 assert.equal(h.node('password-nonce').value,'');assert.equal(h.node('current-password').value,'');
});
test('blank or malformed required verification cannot submit another password update',async()=>{
 const h=await harness({updates:[{code:'reauthentication_needed'}]});await h.save();
 for(const value of ['', 'not-a-code','123']){h.node('password-nonce').value=value;await h.save();}
 assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
});
test('invalid or expired nonce supports a new code and successful retry',async()=>{
 for(const code of ['reauthentication_not_valid','otp_expired']){
  const h=await harness({updates:[{code:'reauthentication_needed'},{code}]});await h.save();
  h.node('password-nonce').value=nonce;await h.save();
  assert.equal(h.node('password-nonce').value,'');assert.match(h.node('message').textContent,/invalid or has expired/);
  await h.action('password-resend');h.node('password-nonce').value='87654321';await h.save();
  assert.match(h.node('message').textContent,/Password saved/);
 }
});
test('code delivery error or network exception never implies delivery or password save',async()=>{
 for(const error of [{code:'over_email_send_rate_limit'},Error('SYNTHETIC-PRIVATE-DETAIL')]){
  const h=await harness({updates:[{code:'reauthentication_needed'}],reauth:[error]});await h.save();await h.action('password-resend');
  assert.equal(h.node('message').dataset.error,'true');assert.equal(h.node('set-password').hidden,false);
  assert.doesNotMatch(h.node('message').textContent,/Password saved|SYNTHETIC-PRIVATE-DETAIL/);
  assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
 }
});
test('Auth-requested current password is required, mismatch is retryable, and neither value is stored',async()=>{
 const h=await harness({updates:[{code:'current_password_required'},{code:'current_password_mismatch'}]});await h.save();
 assert.equal(h.node('password-current-step').hidden,false);assert.equal(h.node('current-password').required,true);
 await h.save();assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
 h.node('current-password').value='wrong-synthetic-password';await h.save();assert.equal(h.node('current-password').value,'');
 assert.match(h.node('message').textContent,/Confirm your current password/);
 h.node('current-password').value=current;await h.save();
 assert.deepEqual(h.calls.filter(c=>c[0]==='update')[2],['update',{password,current_password:current}]);
 assert.equal(h.storage.size,0);assert.equal(h.diagnostics.length,0);
});
test('current password and nonce requirements compose without bypassing either',async()=>{
 const h=await harness({updates:[{code:'current_password_required'},{code:'reauthentication_needed'}]});await h.save();
 h.node('current-password').value=current;await h.save();
 assert.equal(h.node('current-password').required,true);assert.equal(h.node('password-nonce').required,true);
 h.node('current-password').value=current;h.node('password-nonce').value=nonce;await h.save();
 assert.deepEqual(h.calls.filter(c=>c[0]==='update')[2],['update',{password,current_password:current,nonce}]);
});
test('forgotten-current-password path sends a fresh reset only to verified identity at the correct entrance',async()=>{
 for(const audience of ['client','staff']){
  const h=await harness({audience,updates:[{code:'current_password_required'}]});await h.save();
  h.node('email').value='different@example.test';h.node('current-password').value=current;
  await h.action('password-reset-link');
  const reset=h.calls.find(c=>c[0]==='reset');assert.equal(reset[1],'fixture@example.test');
  assert.equal(reset[2].redirectTo,'http://127.0.0.1:8893/'+(audience==='staff'?'attorney-login.html':'login.html'));
  assert.equal(h.node('current-password').value,'');assert.equal(h.node('new-password').value,'');assert.equal(h.node('recovery').hidden,false);
 }
});
test('same or weak password errors remain editable without false success',async()=>{
 for(const code of ['same_password','weak_password']){
  const h=await harness({updates:[{code}]});await h.save();assert.equal(h.node('set-password').hidden,false);
  assert.match(h.node('message').textContent,code==='same_password'?/different/:/stronger/);
  assert.equal(h.calls.some(c=>c[0]==='signout'),false);
 }
});
test('a failed fresh-reset request does not leave setup or claim an email was sent',async()=>{
 const h=await harness({updates:[{code:'current_password_required'}],resets:[{code:'over_email_send_rate_limit'}]});await h.save();
 await h.action('password-reset-link');assert.equal(h.node('set-password').hidden,false);
 assert.match(h.node('message').textContent,/could not be requested/);assert.equal(h.node('message').dataset.error,'true');
});
test('password-save network failure does not claim success or expose diagnostics secrets',async()=>{
 const h=await harness({updates:[Error(password+current+nonce)]});await h.save();
 assert.equal(h.node('message').dataset.error,'true');assert.equal(h.calls.some(c=>c[0]==='signout'),false);
 assert.equal(h.diagnostics.length,1);assert.equal(h.diagnostics[0].stage,'password');
 assert(!JSON.stringify(h.diagnostics).includes(password));assert(!h.node('message').textContent.includes(password));
});
test('failed global sign-out reports saved password and retries sign-out without another update',async()=>{
 for(const failure of [{code:'unexpected_failure'},Error('synthetic')]){
  const h=await harness({signouts:[failure]});await h.save();
  assert.equal(h.node('password-saved').hidden,false);assert.equal(h.node('set-password').hidden,true);
  assert.match(h.node('message').textContent,/password was saved, but/);assert.equal(h.node('new-password').value,'');
  assert.equal(h.diagnostics[0].stage,'signout');assert.equal(h.diagnostics[0].feature,'auth');
  await h.action('retry-password-signout');
  assert.equal(h.calls.filter(c=>c[0]==='update').length,1);assert.equal(h.calls.filter(c=>c[0]==='signout').length,2);
  assert(h.calls.filter(c=>c[0]==='signout').every(c=>c[1]==='global'));
  assert.equal(h.node('signin').hidden,false);assert.match(h.node('message').textContent,/Password saved/);
 }
});
test('repeated sign-out failure remains honest, clears secrets and never repeats password mutation',async()=>{
 const h=await harness({signouts:[Error('one'),Error('two')]});await h.save();await h.action('retry-password-signout');
 assert.equal(h.node('password-saved').hidden,false);assert.match(h.node('message').textContent,/password was saved, but/);
 assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
 for(const id of ['password','new-password','confirm-password','current-password','password-nonce','code'])assert.equal(h.node(id).value,'');
});
test('MFA challenge still precedes recovery and verified setup',async()=>{
 const h=await harness({nextLevel:'aal2'});assert.equal(h.node('mfa').hidden,false);await h.save();
 assert.equal(h.calls.some(c=>c[0]==='update'),false);
 await h.action('verify','submit');assert.equal(h.node('set-password').hidden,false);await h.save();assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
});
test('changed verified identity blocks password, code and reset operations',async()=>{
 for(const action of ['save','password-resend','password-reset-link']){
  const h=await harness({updates:[{code:action==='password-reset-link'?'current_password_required':'reauthentication_needed'}]});await h.save();h.changeUser();
  if(action==='save'){h.node('password-nonce').value=nonce;await h.save();}else await h.action(action);
  assert.equal(h.calls.filter(c=>c[0]==='update').length,1);assert.equal(h.calls.some(c=>['reauth','reset'].includes(c[0])),false);
  assert.equal(h.node('signin').hidden,false);assert.match(h.node('message').textContent,/sign-in changed/);
 }
});
test('sign-out during delayed mutation discards late response and clears transient fields',async()=>{
 const wait=deferred(),h=await harness({waitUpdate:wait.promise});h.fill();h.fire('set-password','submit');await tick();
 assert.equal(h.calls.filter(c=>c[0]==='update').length,1);h.emit('SIGNED_OUT');assert.equal(h.node('new-password').value,'');
 wait.resolve();await tick();assert.equal(h.node('signin').hidden,false);assert.doesNotMatch(h.node('message').textContent,/Password saved/);
 assert.equal(h.calls.some(c=>c[0]==='signout'),false);
});
test('a late verification delivery cannot reopen the old password flow after sign-out',async()=>{
 const wait=deferred(),h=await harness({updates:[{code:'reauthentication_needed'}],waitCode:wait.promise});await h.save();
 h.fire('password-resend');await tick();h.emit('SIGNED_OUT');wait.resolve();await tick();
 assert.equal(h.node('signin').hidden,false);assert.equal(h.node('password-nonce').value,'');assert.equal(h.node('password-code-step').hidden,true);
 assert.doesNotMatch(h.node('message').textContent,/Check your sign-in email/);
});
test('busy guard prevents competing password writes',async()=>{
 const wait=deferred(),h=await harness({waitUpdate:wait.promise});h.fill();h.fire('set-password','submit');h.fire('set-password','submit');await tick();
 assert.equal(h.calls.filter(c=>c[0]==='update').length,1);wait.resolve();await tick();assert.equal(h.calls.filter(c=>c[0]==='update').length,1);
});
test('a different account cannot be signed out by retrying a prior account password save',async()=>{
 const h=await harness({signouts:[Error('synthetic')]});await h.save();h.changeUser();await h.action('retry-password-signout');
 assert.equal(h.calls.filter(c=>c[0]==='signout').length,1);assert.equal(h.node('signin').hidden,false);
});
test('leaving password setup clears hidden verification fields and their validity requirements',async()=>{
 const h=await harness({updates:[{code:'current_password_required'}]});await h.save();h.node('current-password').value=current;
 await h.action('forgot');assert.equal(h.node('current-password').value,'');assert.equal(h.node('current-password').required,false);
 assert.equal(h.node('current-password').disabled,true);assert.equal(h.node('new-password').value,'');
});
test('both login documents expose the same accessible, initially disabled verification controls',async()=>{
 for(const file of ['login.html','attorney-login.html']){
  const html=await readFile(new URL('../'+file,import.meta.url),'utf8');
  for(const id of ['current-password','password-nonce'])assert.match(html,new RegExp('<input[^>]+id="'+id+'"[^>]+disabled'));
  assert.match(html,/<label for="current-password">Current password<\/label>/);
  assert.match(html,/<label for="password-nonce">Email verification code<\/label>/);
  assert.match(html,/<section id="password-saved" hidden>/);
  assert.match(html,/auth\/auth.js\?v=20261021-safe-forms/);
 }
});
