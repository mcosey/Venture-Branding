import {fetchSnapshot,validateSettings} from './record.mjs';
export function createBcmHandler({createClient,env,scan=fetchSnapshot}){
 const origins=(env('VB_ALLOWED_ORIGINS')||'http://127.0.0.1:8000').split(',').map(s=>s.trim());
 return async req=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.includes(origin))return reply({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(req.method!=='POST')return reply({error:'POST required.'},405);
  let admin,ticket;
  try{
   const authorization=req.headers.get('authorization')||'';
   if(!authorization.startsWith('Bearer '))return reply({error:'Please sign in again.'},401);
   const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const user=await db.auth.getUser();if(user.error||!user.data.user)return reply({error:'Please sign in again.'},401);
   const role=await db.rpc('vb_session_role');if(role.error||role.data!=='client')return reply({error:'Client access required.'},403);
   const raw=await req.text();if(raw.length>1024)return reply({error:'Request too large.'},413);
   const input=JSON.parse(raw);
   if(!input||Object.keys(input).some(k=>!['clientId','version','action'].includes(k))||!(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i).test(input.clientId)||!Number.isInteger(input.version)||input.version<1)return reply({error:'Invalid scan request.'},400);
   const settings=await db.from('vb_bcm_settings').select('*').eq('client_id',input.clientId).single();
   if(settings.error||!settings.data)return reply({error:'Saved settings unavailable.'},403);
   const action=input.action||'baseline';if(!['baseline','comparison'].includes(action))return reply({error:'Invalid scan type.'},400);
   validateSettings(settings.data);
   const key=env('SUPABASE_SERVICE_ROLE_KEY');if(!key)return reply({error:'Baseline scanning is not connected yet.'},503);
   const reserved=await db.rpc(action==='baseline'?'vb_begin_bcm_baseline':'vb_begin_bcm_comparison',{target_client:input.clientId,expected_version:input.version});
   if(reserved.error)return reply({error:'A baseline or comparison may already exist, settings changed, or a scan is in progress. Reload scan history before retrying.'},409);
   ticket=reserved.data;
   admin=createClient(env('SUPABASE_URL'),key,{auth:{persistSession:false,autoRefreshToken:false}});
   const snapshot=await scan();
   const result=await admin.rpc('vb_finish_bcm_baseline',{ticket,snapshot,failure:false});
   if(result.error)throw new Error('Unable to save baseline.');
   if(result.data!=='completed')return reply({error:'Settings or access changed during the scan. No baseline was saved.'},409);
   return reply({id:ticket,status:'completed',action});
  }catch{
   if(admin&&ticket)try{await admin.rpc('vb_finish_bcm_baseline',{ticket,snapshot:null,failure:true});}catch{}
   return reply({error:ticket?'Scan failed. No new baseline was saved. Check scan history and try again.':'Unable to start. Save public settings for https://cotivate.com/ and try again.'},400);
  }
 };
}
