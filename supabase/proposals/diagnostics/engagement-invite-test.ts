import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
// Fixed, error-only diagnostics. Never accept request bodies, identities or errors.
// Server workers use platform logs; browsers use their local developer console.
const diagnosticStages=Object.freeze({
 auth:['initialize','refresh','recovery','password','mfa_enroll','mfa_verify','signout'],
 records:['clients','marks','preferences','references'],
 account:['contact_save'],
 member:['onboarding','entry','profile_load','profile_save','progress_load','progress_save'],
 maintenance:['drafts_load','draft_save','publish','withdraw','publications_load'],
 filing:['list','load','history','revisions','save','review'],
 digest:['preferences_load','preferences_save','sample','inbox_load','message_open'],
 uspto:['identity','role','input','client_read','mark_read','configuration','fetch','fingerprint','save'],
 engagement_invite:['identity','role','input','reserve','delivery_details','deliver','finalize','cleanup'],
 engagement:['drafts_load','draft_save','close','revoke','send','invitation_load','invitation_accept'],
 client_invite:['identity','role','input','configuration','reserve','deliver','finalize','cleanup'],
 evidence:['configuration','identity','role','input','reserve','store','verify_store','finalize','list','upload','remove','image'],
 watch:['input','database','snapshot_load','configuration_save','review'],
 research:['input','identity','role','reserve','settings','current','provider','finalize','cleanup','workspace_load','manual_run','review','monitoring_save','reviewed_load']
});
const diagnosticCategories=new Set(['unavailable','conflict','permission','invalid_response','invalid_request','unexpected','configuration']);
const diagnosticRelease='2026-10-21-diagnostics-3';
const diagnosticErrors=new WeakSet();
export const isDiagnosticError=error=>error instanceof Error&&diagnosticErrors.has(error);
const validReference=value=>typeof value==='string'&&/^VB-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
export function supportMessage(message,reference){
 return message+(validReference(reference)?' Reference: '+reference+'.':'');
}
export function databaseCategory(code){
 return code==='40001'||code==='23505'?'conflict':code==='42501'?'permission':'unavailable';
}
// Call only after feature/identity/role validation. The caller retains its scope
// and session checks; only fixed messages/categories reach errors or diagnostics.
export async function diagnosticRequest(feature,stage,work,{message,diagnostics,check=()=>{},valid=result=>result&&typeof result==='object',serverReference=false,silentCodes=['22023']}={}){
 const diagnostic=createDiagnostics(feature,diagnostics);
 const text=code=>typeof message==='function'?message(code):message;
 const failure=(code,category)=>silentCodes.includes(code)?new Error(text(code)):diagnostic.error(stage,text(code),category||databaseCategory(code));
 check();let result;
 try{result=await work();}catch(error){check();if(isDiagnosticError(error))throw error;throw failure(null);}
 check();let invalid;
 try{invalid=!valid(result);}catch{invalid=true;}
 if(result?.error||invalid){
  const code=result?.error?.code;
  if(serverReference){
   let reference=result?.data?.supportReference;
   if(!validReference(reference)&&result?.error?.context?.json)try{reference=(await result.error.context.json())?.supportReference;}catch{}
   check();
   if(validReference(reference)){const error=new Error(supportMessage(text(code),reference));error.supportReference=reference;diagnosticErrors.add(error);throw error;}
  }
  throw failure(code,result?.error?null:'invalid_response');
 }
 return result;
}
export function createDiagnostics(feature,{sink=event=>console.error(JSON.stringify(event)),clock=()=>performance.now(),makeReference=()=>crypto.randomUUID()}={}){
 if(!Object.hasOwn(diagnosticStages,feature))throw Error('Unknown diagnostic feature.');
 const readClock=()=>{try{const n=clock();return Number.isFinite(n)?n:0;}catch{return 0;}};
 const started=readClock();let reference=null,emitted=0;
 try{const value=makeReference();if(typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))reference='VB-'+value.toLowerCase();}catch{}
 return Object.freeze({
  failure(stage,category='unexpected',httpStatus){
   if(!diagnosticStages[feature].includes(stage)||!diagnosticCategories.has(category))return null;
   // At most one terminal failure plus a failed recovery/finalization per operation.
   if(emitted++<2){
    const event=Object.freeze({schema:1,release:diagnosticRelease,feature,stage,outcome:'failure',category,
     reference,elapsed_ms:Math.min(3600000,Math.max(0,Math.round(readClock()-started))),
     ...(Number.isInteger(httpStatus)&&httpStatus>=400&&httpStatus<=599?{http_status:httpStatus}:{})});
    try{const pending=sink(event);if(pending&&typeof pending.catch==='function')pending.catch(()=>{});}catch{}
   }
   return reference;
  },
  error(stage,message,category='unavailable'){
   const ref=this.failure(stage,category);
   const error=new Error(message+(ref?' Reference: '+ref+'.':''));
   error.supportReference=ref;diagnosticErrors.add(error);return error;
  }
 });
}


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

Deno.serve(createEngagementInviteHandler({createClient,env:key=>Deno.env.get(key)}));
