import {createDiagnostics} from '../../../shared/diagnostics.mjs';
import {fetchRecord as defaultFetchRecord, fingerprint, serialNumber} from './record.mjs';
// Only our fixed parser/provider messages may reach the UI. Never echo arbitrary
// exceptions merely because they happen to contain the word "USPTO".
const safeLookupMessages=new Set([
 'Enter the eight-digit USPTO application serial number.',
 'Invalid USPTO date.','USPTO returned an unsupported record. Nothing was saved.',
 'This record needs ownership review in TSDR before importing.','Unsupported USPTO response.',
 'USPTO returned multiple records. Nothing was saved.','USPTO record does not match the requested serial number.',
 'This record needs manual review in TSDR before importing.',
 'This record has missing or multiple owner names. Review ownership in TSDR before importing.',
 'Unrecognized registration number.','USPTO is busy. Please try again later.',
 'No USPTO record was found for this number.',
 'USPTO lookup is unavailable. Check the connection setup and try again.',
 'Empty USPTO response.','USPTO record is too large to import.'
]);
export function createHandler({createClient,env,fetchRecord=defaultFetchRecord,diagnostics}) {
const origins=(env('VB_ALLOWED_ORIGINS')||'http://127.0.0.1:8000').split(',').map(s=>s.trim());
return async req=>{
  const diagnostic=createDiagnostics('uspto',diagnostics);let stage='input';
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body,status=200)=>{if(status>=400&&!['input','identity','role'].includes(stage)){const ref=diagnostic.failure(stage,status===409?'conflict':status===403?'permission':'unavailable',status);if(ref)body={...body,supportReference:ref};}return new Response(JSON.stringify(body),{status,headers});};
  if(origin&&!origins.includes(origin))return reply({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(req.method!=='POST')return reply({error:'POST required.'},405);
  try{
    const authorization=req.headers.get('authorization')||'';
    if(!authorization.startsWith('Bearer '))return reply({error:'Please sign in again.'},401);
    // Use caller identity and RLS throughout; never use an admin client.
    const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    stage='identity';const user=await db.auth.getUser();if(user.error||!user.data.user)return reply({error:'Please sign in again.'},401);
    stage='role';const role=await db.rpc('vb_session_role');if(role.error||role.data!=='staff')return reply({error:'Attorney sign-in with authenticator required.'},403);
    stage='input';const bodyText=await req.text();if(bodyText.length>4096)return reply({error:'Request too large.'},413);
    const input=JSON.parse(bodyText), serial=serialNumber(input.serial);
    if(!['preview','save'].includes(input.action))return reply({error:'Invalid action.'},400);
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if(!uuid.test(input.clientId)||input.markId&&!uuid.test(input.markId))return reply({error:'Invalid record.'},400);
    stage='client_read';const client=await db.from('vb_clients').select('id').eq('id',input.clientId).is('archived_at',null).single();
    if(client.error)return reply({error:'Client unavailable.'},404);
    if(input.markId){stage='mark_read';const mark=await db.from('vb_marks').select('updated_at').eq('id',input.markId).eq('client_id',input.clientId).is('archived_at',null).single();if(mark.error||mark.data.updated_at!==input.expectedUpdatedAt)return reply({error:'Mark changed or unavailable. Reopen it and look up again.'},409);}
    stage='configuration';const key=env('USPTO_API_KEY');if(!key)return reply({error:'USPTO connection is not configured yet. Nothing was saved.'},503);
    stage='fetch';const record=await fetchRecord(serial,key);stage='fingerprint';const hash=await fingerprint(record);
    if(input.action==='preview')return reply({record,fingerprint:hash,checkedAt:new Date().toISOString()});
    // Fetch again at approval: accept only unchanged official data, never browser-supplied fields.
    stage='input';if(input.confirmOwner!==true||input.fingerprint!==hash)return reply({error:'The record changed or was not confirmed. Look it up and review again.'},409);
    stage='save';const saved=await db.rpc('vb_save_uspto_mark',{target_client:input.clientId,target_mark:input.markId||null,expected_updated_at:input.expectedUpdatedAt||null,details:{...record,source_checked_at:new Date().toISOString()}});
    if(saved.error)return reply({error:'Unable to save. The mark may have changed or already be linked. Reload and review again.'},409);
    return reply({id:saved.data});
  }catch(error){return reply({error:error instanceof SyntaxError?'Invalid request.':safeLookupMessages.has(error?.message)?error.message:'Lookup could not complete. Nothing was saved; please try again.'},400);}
};
}
