import {validConfiguration} from './flow.mjs?v=20261011-test-portal';
import {createDiagnostics,isDiagnosticError} from '../shared/diagnostics.mjs';
export function createConnection(audience) {
 if(!['staff','client'].includes(audience))throw new Error('Workspace audience unavailable.');
 if(!validConfiguration(window.VB_AUTH_CONFIG))throw new Error('Connection configuration unavailable.');
 if(!window.supabase)throw new Error('Sign-in library unavailable.');
 if(window.VB_AUTH_CONFIG.environment==='bcm-test'&&!['127.0.0.1','localhost'].includes(window.location.hostname))throw new Error('Test preview is local only.');
 return window.supabase.createClient(window.VB_AUTH_CONFIG.url,window.VB_AUTH_CONFIG.publishableKey,{auth:{storage:sessionStorage,storageKey:(window.VB_AUTH_CONFIG.environment==='bcm-test'?'vb-bcm-ai-test-':'vb-auth-')+audience,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
}
export async function requireAccess(db,audience){
 const {data,error}=await db.auth.getUser();
 if(error||!data.user)throw new Error('Please sign in again.');
 const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 if(assurance.error)throw new Error('Unable to verify sign-in.');
 if((audience==='staff'||assurance.data.nextLevel==='aal2')&&assurance.data.currentLevel!=='aal2')throw new Error('Please verify your authenticator at sign-in.');
 const role=await db.rpc('vb_session_role');
 if(role.error||role.data!==audience){
  if(audience==='client'&&typeof window!=='undefined'&&window.VB_AUTH_CONFIG?.memberAccountsEnabled===true&&window.VB_AUTH_CONFIG.environment==='bcm-test'){
   const {clientFallback}=await import('./client-fallback.mjs?v=1');
   const fallback=await clientFallback(db,window.VB_AUTH_CONFIG,window.location.hostname);
   if(fallback)window.location.replace(fallback);
  }
  throw new Error('This account does not have access to this workspace.');
 }
 return data.user;
}
const recordTables={
 vb_clients:['id'],vb_marks:['id'],vb_service_preferences:['client_id','service'],vb_client_references:['client_id']
};
const recordStages={vb_clients:'clients',vb_marks:'marks',vb_service_preferences:'preferences',vb_client_references:'references'};
async function loadTable(db,table,diagnostic){
 const loadError=()=>diagnostic.error(recordStages[table],'Unable to load all saved records. Please reload and try again.','invalid_response');
 try{
 const keys=recordTables[table],rows=[],seen=new Set();
 let total;
 // Count and stable primary-key ordering detect truncation and common concurrent
 // changes. These REST pages are not an atomic database snapshot.
 do{
  let query=db.from(table).select('*',{count:'exact'});
  if(table==='vb_marks')query=query.is('archived_at',null);
  for(const key of keys)query=query.order(key,{ascending:true});
  const result=await query.range(rows.length,rows.length+249);
  if(result.error)throw diagnostic.error(recordStages[table],'Unable to load all saved records. Please reload and try again.');
  if(!Array.isArray(result.data)||!Number.isSafeInteger(result.count)||result.count<0)throw loadError();
  if(total===undefined)total=result.count;
  if(result.count!==total||rows.length+result.data.length>total||total>50000)throw loadError();
  for(const row of result.data){
   if(keys.some(key=>typeof row[key]!=='string'||!row[key]))throw loadError();
   const key=JSON.stringify(keys.map(key=>row[key]));
   if(seen.has(key))throw loadError();
   seen.add(key);rows.push(row);
  }
  if(rows.length<total&&!result.data.length)throw loadError();
 }while(rows.length<total);
 return rows;
 }catch(error){
  if(isDiagnosticError(error))throw error;
  throw diagnostic.error(recordStages[table],'Unable to load all saved records. Please reload and try again.');
 }
}
export async function loadRecords(db,audience,{diagnostics}={}){
 await requireAccess(db,audience);
 const diagnostic=createDiagnostics('records',diagnostics);
 const [clients,marks,preferences,references]=await Promise.all([
  loadTable(db,'vb_clients',diagnostic),loadTable(db,'vb_marks',diagnostic),loadTable(db,'vb_service_preferences',diagnostic),
  audience==='staff'?loadTable(db,'vb_client_references',diagnostic):Promise.resolve([])
 ]);
 // Do not reveal a completed load if the caller lost workspace access meanwhile.
 await requireAccess(db,audience);
 const byName=(a,b)=>(a.name||'').localeCompare(b.name||'')||a.id.localeCompare(b.id);
 clients.sort(byName);marks.sort(byName);
 return {clients,marks,preferences,references};
}
export const typeLabel=value=>({word:'Word',logo:'Logo',other:'Other'}[value]||'Not specified');
export const statusLabel=value=>({not_filed:'Not yet filed',pending:'Pending',registered:'Registered',inactive:'Inactive',other:'Other'}[value]||'Not provided');
