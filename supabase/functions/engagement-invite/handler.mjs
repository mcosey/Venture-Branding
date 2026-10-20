import {createDiagnostics} from '../../../shared/diagnostics.mjs';
const TEST_URL='https://imvkhicfmidzbzsbhkzs.supabase.co';
const ORIGIN='http://127.0.0.1:8893';
const UUID=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function createEngagementInviteHandler({createClient,env,diagnostics}){
 return async request=>{
  const diagnostic=createDiagnostics('engagement_invite',diagnostics);let stage='input';
  const origin=request.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN}:{})};
  const response=(value,status=200)=>{if(status>=400&&!['input','identity','role'].includes(stage)){const ref=diagnostic.failure(stage,status===409?'conflict':'unavailable',status);if(ref)value={...value,supportReference:ref};}return new Response(JSON.stringify(value),{status,headers});};
  if(env('SUPABASE_URL')!==TEST_URL||env('VB_ENGAGEMENT_INVITES_ENABLED')!=='true')return response({error:'Invitation delivery is not enabled.'},503);
  if(origin&&origin!==ORIGIN)return response({error:'Origin not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});
  if(request.method!=='POST')return response({error:'POST required.'},405);
  let admin,ticket;
  try{
   const authorization=request.headers.get('authorization')||'';if(!authorization.startsWith('Bearer '))return response({error:'Sign in again.'},401);
   const db=createClient(TEST_URL,env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   stage='identity';const user=await db.auth.getUser();if(user.error||!user.data.user)return response({error:'Sign in again.'},401);
   stage='role';const role=await db.rpc('vb_session_role');if(role.error||role.data!=='staff')return response({error:'Attorney sign-in with authenticator required.'},403);
   stage='input';const text=await request.text();if(text.length>1024)return response({error:'Request too large.'},413);
   const input=JSON.parse(text);
   if(!UUID.test(input.draftId)||!Number.isInteger(input.revision)||input.revision<1||input.confirmSend!==true||typeof input.expectedEmail!=='string'||input.expectedEmail.length>254||typeof input.contactUpdatedAt!=='string'||Object.keys(input).some(k=>!['draftId','revision','confirmSend','expectedEmail','contactUpdatedAt'].includes(k)))return response({error:'Review the saved client contact before sending.'},400);
   stage='reserve';const prepared=await db.rpc('vb_prepare_test_engagement_invite',{target_draft:input.draftId,expected_revision:input.revision,expected_email:input.expectedEmail,expected_contact_updated_at:input.contactUpdatedAt,confirmed:true});
   if(prepared.error||!UUID.test(prepared.data))return response({error:'Invitation not sent. Refresh and review the contact, draft and invitation status.'},409);
   ticket=prepared.data;
   admin=createClient(TEST_URL,env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
   stage='delivery_details';const delivery=await admin.rpc('vb_test_invite_delivery',{ticket});if(delivery.error||!delivery.data?.email)throw Error('Delivery unavailable');
   const redirectTo=ORIGIN+'/login.html?invitation='+ticket;
   // Both use the existing Supabase Auth email service. Account presence remains
   // internal to this function and is never returned to the attorney browser.
   stage='deliver';const sent=delivery.data.existing
    ? await createClient(TEST_URL,env('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}}).auth.signInWithOtp({email:delivery.data.email,options:{shouldCreateUser:false,emailRedirectTo:redirectTo}})
    : await admin.auth.admin.inviteUserByEmail(delivery.data.email,{redirectTo});
   stage='finalize';const finished=await admin.rpc('vb_complete_test_invite_delivery',{ticket,succeeded:!sent.error});
   if(sent.error){if(finished.error)diagnostic.failure('finalize','unavailable',500);stage='deliver';return response({error:'Email delivery failed. Review the invitation status before retrying.'},502);}
   if(finished.error)return response({error:'An email may have been sent, but the invitation is unavailable. Refresh its status.'},409);
   return response({sent:true});
  }catch{
   if(admin&&ticket)try{const cleanup=await admin.rpc('vb_complete_test_invite_delivery',{ticket,succeeded:false});if(cleanup.error)diagnostic.failure('cleanup','unavailable',500);}catch{diagnostic.failure('cleanup','unexpected',500);}
   return response({error:'Invitation could not be completed. Refresh its status before retrying.'},500);
  }
 };
}
