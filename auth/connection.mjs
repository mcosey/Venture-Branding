import {validConfiguration} from './flow.mjs?v=20261011-test-portal';
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
 if(role.error||role.data!==audience)throw new Error('This account does not have access to this workspace.');
 return data.user;
}
export async function loadRecords(db,audience){
 await requireAccess(db,audience);
 const [clients,marks,preferences,references]=await Promise.all([
  db.from('vb_clients').select('*').order('name'),
  db.from('vb_marks').select('*').is('archived_at',null).order('name'),
  db.from('vb_service_preferences').select('*'),
  audience==='staff'?db.from('vb_client_references').select('*'):Promise.resolve({data:[]})
 ]);
 for(const result of [clients,marks,preferences,references])if(result.error)throw new Error('Unable to load saved records. Please retry.');
 return {clients:clients.data,marks:marks.data,preferences:preferences.data,references:references.data};
}
export const typeLabel=value=>({word:'Word',logo:'Logo',other:'Other'}[value]||'Not specified');
export const statusLabel=value=>({not_filed:'Not yet filed',pending:'Pending',registered:'Registered',inactive:'Inactive',other:'Other'}[value]||'Not provided');
