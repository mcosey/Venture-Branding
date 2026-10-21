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
