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


export function createInviteHandler({createClient,env,diagnostics}) {
 const origins=(env('VB_ALLOWED_ORIGINS')||'http://127.0.0.1:8000').split(',').map(s=>s.trim());
 return async req=>{
  const diagnostic=createDiagnostics('client_invite',diagnostics);let stage='input';
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(error,status=400)=>{const ref=!['input','identity','role'].includes(stage)?diagnostic.failure(stage,status===409?'conflict':'unavailable',status):null;return new Response(JSON.stringify({error,...(ref?{supportReference:ref}:{})}),{status,headers});};
  if(origin&&!origins.includes(origin))return reply('Origin not allowed.',403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(req.method!=='POST')return reply('POST required.',405);
  let admin,ticket;
  const cleanupInvite=async()=>{try{const cleanup=await admin.rpc('vb_complete_client_invite',{ticket,invited_user:null,succeeded:false});if(cleanup.error)diagnostic.failure('cleanup','unavailable',500);}catch{diagnostic.failure('cleanup','unexpected',500);}};
  try {
   const authorization=req.headers.get('authorization')||'';
   if(!authorization.startsWith('Bearer '))return reply('Please sign in again.',401);
   const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   stage='identity';const user=await db.auth.getUser();if(user.error||!user.data.user)return reply('Please sign in again.',401);
   stage='role';const role=await db.rpc('vb_session_role');if(role.error||role.data!=='staff')return reply('Attorney sign-in with authenticator required.',403);
   stage='input';const text=await req.text();if(text.length>2048)return reply('Request too large.',413);
   const input=JSON.parse(text);
   if(input.confirmSend!==true||!(/^[0-9a-f-]{36}$/i).test(input.clientId)||typeof input.email!=='string'||!input.expectedUpdatedAt)return reply('Confirm the client and recipient before sending.');
   // Fixed server-configured redirect: never accept a browser-supplied return URL.
   stage='configuration';const redirect=env('VB_CLIENT_INVITE_REDIRECT'),key=env('SUPABASE_SERVICE_ROLE_KEY');
   if(!redirect||!key)return reply('Invitation delivery is not configured yet.',503);
   const url=new URL(redirect);if(!origins.includes(url.origin)||url.pathname!=='/login.html'||url.search||url.hash)return reply('Invitation destination needs configuration.',503);
   stage='reserve';const reserved=await db.rpc('vb_prepare_client_invite',{target_client:input.clientId,recipient:input.email,expected_updated_at:input.expectedUpdatedAt});
   if(reserved.error)return reply('Invitation not sent. Reload and check access, email, or wait a minute before retrying.',409);
   ticket=reserved.data;
   admin=createClient(env('SUPABASE_URL'),key,{auth:{persistSession:false,autoRefreshToken:false}});
   stage='deliver';const sent=await admin.auth.admin.inviteUserByEmail(input.email.trim().toLowerCase(),{redirectTo:redirect});
   if(sent.error||!sent.data.user){await cleanupInvite();return reply('Invitation could not be sent. Check the email delivery setup and try again.',502);}
   stage='finalize';const finished=await admin.rpc('vb_complete_client_invite',{ticket,invited_user:sent.data.user.id,succeeded:true});
   if(finished.error){await cleanupInvite();return reply('An email was sent, but access was not completed. Review this client before retrying.',409);}
   return new Response(JSON.stringify({sent:true}),{status:200,headers});
  }catch{
   if(admin&&ticket)try{await cleanupInvite();}catch{}
   return reply('Invitation could not be completed. Check its status before retrying.',500);
  }
 };
}

Deno.serve(createInviteHandler({createClient,env:key=>Deno.env.get(key)}));
