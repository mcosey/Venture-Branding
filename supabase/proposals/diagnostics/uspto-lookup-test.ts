import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {XMLParser, XMLValidator} from 'npm:fast-xml-parser@5.11.2';
export function serialNumber(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value.trim())) throw new Error('Enter the eight-digit USPTO application serial number.');
  return value.trim();
}
const labels = {'600':'Abandoned — incomplete response','601':'Abandoned — express','602':'Abandoned — failure to respond or late response','603':'Abandoned — after ex parte appeal','604':'Abandoned — after inter-partes decision','605':'Abandoned — after publication','606':'Abandoned — no statement of use filed','607':'Abandoned — defective statement of use','608':'Abandoned — after petition decision','609':'Abandoned — defective divided application','614':'Abandoned — petition to revive denied','618':'Abandoned file — backfile','700':'Registered','710':'Cancelled — Section 8','711':'Cancelled — Section 7'};
export function status(code) {
  if (['600','601','602','603','604','605','606','607','608','609','614','618','710','711'].includes(code)) return 'inactive';
  if (code === '700') return 'registered';
  if (['630','631','638','641','645','680','686','688'].includes(code)) return 'pending';
  return 'other'; // No assumptions from a registration number or an unfamiliar code.
}
function scalar(v){return typeof v === 'string' ? v.trim() : '';}
function date(v){
  const s=scalar(v);if(!s||/^0+$/.test(s))return null;
  // XML Schema dates may carry a timezone; retain the recorded calendar date.
  const iso=/^\d{8}$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}`:/^\d{4}-\d{2}-\d{2}(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$/.test(s)?s.slice(0,10):'';
  if(!iso||!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString().slice(0,10)!==iso)throw new Error('Invalid USPTO date.');return iso;
}
function st96Case(parsed){
  const m=parsed.TrademarkTransaction?.TrademarkTransactionBody?.TransactionContentBag?.TransactionData?.TrademarkBag?.Trademark;
  if(!m||Array.isArray(m))throw new Error('USPTO returned an unsupported record. Nothing was saved.');
  const word=m.MarkRepresentation?.MarkReproduction?.WordMarkSpecification;
  const applicants=m.ApplicantBag?.Applicant;
  const owners=(Array.isArray(applicants)?applicants:applicants?[applicants]:[]).map(a=>{
    const n=a.Contact?.Name;
    return {'party-name':scalar(n?.EntityName)||scalar(n?.OrganizationName?.OrganizationStandardName)};
  });
  // Historical and current names must agree. Differing owners require manual review.
  if(owners.some(o=>!o['party-name']))throw new Error('This record needs ownership review in TSDR before importing.');
  const reg=m.RegistrationNumber;
  return {'serial-number':m.ApplicationNumber?.ApplicationNumberText,'registration-number':typeof reg==='object'?reg?.RegistrationNumberText:reg,
    'case-file-header':{'mark-identification':word?.MarkVerbalElementText,'mark-drawing-code':m.MarkRepresentation?.MarkDescriptionBag?.NationalMarkDescription?.MarkFeatureCode,
      'status-code':m.MarkCurrentStatusCode,'filing-date':m.ApplicationDate,'registration-date':m.RegistrationDate,'status-date':m.MarkCurrentStatusDate},
    'case-file-owners':{'case-file-owner':owners}};
}
function findCases(value, results=[], depth=0){
  if(depth>40)throw new Error('Unsupported USPTO response.');
  if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
    if(key==='case-file')results.push(...(Array.isArray(child)?child:[child]));
    else findCases(child,results,depth+1);
  }return results;
}
export function parseRecord(xml, serial) {
  serialNumber(serial);
  if(typeof xml!=='string'||xml.length>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new Error('USPTO returned an unsupported record. Nothing was saved.');
  const parsed=new XMLParser({parseTagValue:false,ignoreAttributes:true,removeNSPrefix:true}).parse(xml);
  const cases=findCases(parsed);
  if(cases.length>1)throw new Error('USPTO returned multiple records. Nothing was saved.');
  const c=cases.length===1?cases[0]:st96Case(parsed), h=c['case-file-header'];
  if(!h||scalar(c['serial-number'])!==serial)throw new Error('USPTO record does not match the requested serial number.');
  const name=scalar(h['mark-identification']), code=scalar(h['status-code']);
  if(!name||name.length>200||!/^\d{3}$/.test(code))throw new Error('This record needs manual review in TSDR before importing.');
  const rawOwners=c['case-file-owners']?.['case-file-owner'];
  const owners=[...new Set((Array.isArray(rawOwners)?rawOwners:rawOwners?[rawOwners]:[]).map(o=>scalar(o['party-name'])).filter(Boolean))];
  if(owners.length!==1)throw new Error('This record has missing or multiple owner names. Review ownership in TSDR before importing.');
  const drawing=scalar(h['mark-drawing-code']);
  const reg=scalar(c['registration-number']);
  if(reg&&!/^\d{1,8}$/.test(reg))throw new Error('Unrecognized registration number.');
  return {name,mark_type:['1','4'].includes(drawing)?'word':['2','3','5'].includes(drawing)?'logo':null,
    status:status(code),uspto_status_text:scalar(h['status-description'])||scalar(h['status-text'])||`${code} — ${labels[code]||'See USPTO status details'}`,
    application_number:serial,registration_number:reg&&!/^0+$/.test(reg)?reg:null,record_owner:owners[0],
    filing_date:date(h['filing-date']),registration_date:date(h['registration-date']),uspto_status_date:date(h['status-date'])};
}
export async function fingerprint(record){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(record)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function fetchRecord(serial,key,fetcher=fetch){
  serialNumber(serial);
  const response=await fetcher(`https://tsdrapi.uspto.gov/ts/cd/casestatus/sn${serial}/info.xml`,{headers:{'USPTO-API-KEY':key,Accept:'application/xml'},signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!response.ok){await response.body?.cancel();throw new Error(response.status===429?'USPTO is busy. Please try again later.':response.status===404?'No USPTO record was found for this number.':'USPTO lookup is unavailable. Check the connection setup and try again.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty USPTO response.');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw new Error('USPTO record is too large to import.');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return parseRecord(new TextDecoder().decode(bytes),serial);
}

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


const defaultFetchRecord=fetchRecord;
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

if(Deno.env.get('SUPABASE_URL')!=='https://imvkhicfmidzbzsbhkzs.supabase.co')throw Error('BCM Test project required');
Deno.serve(createHandler({createClient,env:(key)=>key==='VB_ALLOWED_ORIGINS'?'http://127.0.0.1:8893':Deno.env.get(key)}));
