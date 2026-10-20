import {createDiagnostics} from '../../../shared/diagnostics.mjs';
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
