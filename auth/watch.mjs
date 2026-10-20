import {requireAccess} from './connection.mjs?v=20261018-record-pages';
export const watchEnabled=()=>globalThis.window?.VB_WATCH_ENABLED===true;
export function createWatchRepository(db,audience='client',{enabled=watchEnabled()}={}){
 let epoch=0;
 async function rpc(name,args){
  if(!enabled)throw Error('Trademark Watch is awaiting activation.');
  const ticket=epoch;await requireAccess(db,audience);
  if(ticket!==epoch)throw Error('Watch session ended.');
  const {data,error}=await db.rpc(name,args);
  if(ticket!==epoch)throw Error('Watch session ended.');
  if(error)throw Error(error.code==='40001'?'This record changed. Refresh and review again.':error.code==='42501'?'Watch access is unavailable. Refresh your workspace or contact your attorney.':error.code==='22023'?'This selection cannot be saved. Review your marks or contact your attorney.':'Watch could not load or save. Please retry.');
  return data;
 }
 return {enabled,clear(){epoch++;},load(clientId){return rpc('vb_watch_snapshot',{target_client:clientId});},
 save(clientId,state,markIds,monitoring,configuration){
  if(state.scoped){
   if(!configuration||!state.configurations.some(c=>c.scope_id===configuration.scope_id&&c===configuration))throw Error('Choose a Watch configuration.');
   return rpc('vb_watch_save_scoped',{target_client:clientId,target_engagement:configuration.scope_id,expected_configuration:configuration.settings.id,expected_version:configuration.settings.version,selected_marks:markIds,monitoring});
  }
  return rpc('vb_watch_save',{target_client:clientId,expected_version:state.settings.version,selected_marks:markIds,monitoring});
 },
 review(clientId,finding,decision,note,summary){if(audience!=='staff')throw Error('Attorney review required.');return rpc('vb_watch_review',{target_client:clientId,target_finding:finding.id,expected_version:finding.version,decision,private_note:note,client_summary:summary});}};
}
