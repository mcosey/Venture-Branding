import {diagnosticRequest,isDiagnosticError,supportMessage} from '../shared/diagnostics.mjs';
import {showFlowLoading} from '../shared/loading.mjs';
import {memberAccountsEnabled,memberClient,verifiedEntry} from './member-account.mjs';
import {pendingInvitation,clearInvitation} from './invitation-route.mjs';
const $=id=>document.getElementById(id);
const unavailableMessage='This invitation is unavailable for this account. It may have expired, been revoked, or already been accepted. Sign in with the invited email or contact Venture Branding Law.';
const acceptanceMessage='The invitation could not be accepted. Reload to check its current status.';
const invitation=pendingInvitation(sessionStorage,location.search);
let db;
function message(text){$('invitation-status').textContent=text;}
async function initialize(){
 const finish=showFlowLoading($('invitation-loading'),'Loading your invitation…','invitation');
 try{
 if(!memberAccountsEnabled(window.VB_AUTH_CONFIG,location.hostname)||!invitation){message('This invitation is unavailable. Contact Venture Branding Law for a current invitation.');return;}
  db=memberClient();const access=await verifiedEntry(db);
  if(access.entry==='onboarding'){location.replace('signup.html?invitation='+invitation);return;}
  if(!['client','member'].includes(access.entry))throw Error('Unavailable');
  const result=await diagnosticRequest('engagement','invitation_load',()=>db.rpc('vb_read_test_engagement_invite',{invitation_id:invitation}),{message:unavailableMessage,silentCodes:['22023','42501','40001'],valid:r=>r?.data&&['client_name','engagement_title','matter_title'].every(key=>typeof r.data[key]==='string')});
  $('client-name').textContent=result.data.client_name;$('invitation-title').textContent=result.data.engagement_title;$('matter-title').textContent=result.data.matter_title;
  $('invitation-details').hidden=false;message('');
 }catch(error){clearInvitation(sessionStorage);message(supportMessage(unavailableMessage,isDiagnosticError(error)?error.supportReference:null));$('invitation-signin').hidden=false;}
 finally{finish();}
}
$('accept-invitation').addEventListener('click',async()=>{
 if(!$('invitation-confirm').checked||!db)return;
 $('accept-invitation').disabled=true;message('');
 const finish=showFlowLoading($('invitation-loading'),'Accepting invitation…');
 try{
  await verifiedEntry(db);
  await diagnosticRequest('engagement','invitation_accept',()=>db.rpc('vb_accept_test_engagement_invite',{invitation_id:invitation,confirmed:true}),{message:acceptanceMessage,silentCodes:['22023','42501','40001']});
  clearInvitation(sessionStorage);location.replace('portal.html');
 }catch(error){message(supportMessage(acceptanceMessage,isDiagnosticError(error)?error.supportReference:null));$('accept-invitation').disabled=false;}
 finally{finish();}
});
$('invitation-signin').href='login.html'+(invitation?'?invitation='+invitation:'');
initialize();
