import {PRODUCTION_URL,researchWebsite,settingsValid} from './research.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
function sameSecret(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
export function createAiBcmHandler({createClient,env,research=researchWebsite,scheduled=false}){
 return async req=>{
  const origin=req.headers.get('origin')||'',allowed=(env('VB_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim());
  const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin',...(allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  // Production pilot: exact project AND explicit worker switch required before any DB/API access.
  if(env('SUPABASE_URL')!==PRODUCTION_URL||env('BCM_AI_RELEASE_ENABLED')!=='true')return reply({error:'BCM research is paused.'},503);
  if(origin&&(scheduled||!allowed.includes(origin)))return reply({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS'&&!scheduled)return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});
  if(req.method!=='POST')return reply({error:'POST required.'},405);
  const apiKey=env('OPENAI_API_KEY'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  if(!apiKey||/\s/.test(apiKey)||!serviceKey)return reply({error:'Research is not connected.'},503);
  let admin,ticket;
  try{
   const raw=await req.text();if(raw.length>(scheduled?64:1024))return reply({error:'Invalid request.'},400);
   let input;try{input=raw.trim()?JSON.parse(raw):{};}catch{return reply({error:'Invalid request.'},400);}if(!input||Array.isArray(input)||typeof input!=='object')return reply({error:'Invalid request.'},400);
   let reservation;
   if(scheduled){
    const secret=env('BCM_SCHEDULER_SECRET');if(!secret||secret.length<32||/\s/.test(secret))return reply({error:'Private scheduler access unavailable.'},503);
    if(!sameSecret(req.headers.get('x-bcm-scheduler-secret'),secret))return reply({error:'Private scheduler access required.'},403);
    if(Object.keys(input).length)return reply({error:'Invalid scheduled request.'},400);
    admin=createClient(PRODUCTION_URL,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    reservation=await admin.rpc('vb_claim_bcm_ai_due_run');
   }else{
    if(Object.keys(input).some(k=>!['clientId','version'].includes(k))||!uuid(input.clientId)||!Number.isInteger(input.version)||input.version<1)return reply({error:'Save settings before scanning.'},400);
    const authorization=req.headers.get('authorization')||'';if(!authorization.startsWith('Bearer '))return reply({error:'Sign-in required.'},401);
    const db=createClient(PRODUCTION_URL,env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const user=await db.auth.getUser();if(user.error||!user.data?.user)return reply({error:'Sign-in required.'},401);
    const role=await db.rpc('vb_session_role');if(role.error||role.data!=='client')return reply({error:'Client access required.'},403);
    reservation=await db.rpc('vb_begin_bcm_ai_run',{target_client:input.clientId,expected_version:input.version});
    if(reservation.error)return reply({error:'Research unavailable, limit reached, or settings changed. Reload before retrying.'},409);
    admin=createClient(PRODUCTION_URL,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
   }
   if(reservation.error)throw Error('Reservation unavailable');
   if(!reservation.data)return reply({status:'idle'});
   if(!uuid(reservation.data.ticket))throw Error('Invalid reservation');ticket=reservation.data.ticket;
   const cfg=settingsValid(reservation.data.settings);
   const current=await admin.rpc('vb_bcm_ai_run_is_current',{ticket});if(current.error||current.data!==true)throw Error('Stale reservation');
   const result=await research(cfg,{key:apiKey,knownNames:reservation.data.known_names||[]});
   const finished=await admin.rpc('vb_finish_bcm_ai_run',{ticket,payload:result,failure:false});if(finished.error)throw Error('Unable to save observations');
   return reply({status:finished.data==='completed'?'completed':'discarded',id:ticket});
  }catch{
   if(admin&&ticket)try{await admin.rpc('vb_finish_bcm_ai_run',{ticket,payload:null,failure:true});}catch{}
   return reply({error:'Research could not complete. No new client update was published.'},500);
  }
 };
}
