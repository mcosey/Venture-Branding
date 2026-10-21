import {requireAccess} from './connection.mjs?v=20261018-record-pages';
import {validateMaintenanceDraft} from '../attorney/assets/maintenance-preview-model.mjs';
import {createDiagnostics,databaseCategory} from '../shared/diagnostics.mjs';
// Approved activation: schema and privacy/concurrency checks verified on 2026-10-10.
// Setting false restores the local workflow preview without maintenance queries.
export const MAINTENANCE_ENABLED=true;
const publicFields=['id','client_id','mark_id','description','window_start','window_end','deadline','next_step','status','draft_revision','verified_at'];
function failure(error,diagnostic,stage){const message=error?.code==='40001'?'This entry changed in another window. Close and reopen Maintenance dates before trying again.':error?.code==='42501'?'This maintenance record is unavailable to your account.':error?.code==='22023'?'Check the dates, required fields, and verification confirmation.':'Maintenance records could not be loaded or saved. Please try again.';const e=error?.code==='22023'?new Error(message):diagnostic.error(stage,message,databaseCategory(error?.code));e.code=error?.code;return e;}
function scope(context){if(!context?.clientId||!context?.markId)throw new Error('Select a client and trademark first.');return {target_client:context.clientId,target_mark:context.markId};}
export function createMaintenanceRepository(db,{enabled=MAINTENANCE_ENABLED,diagnostics}={}){
 if(!enabled)return null;
 const cache=new Map();let generation=0;
 const key=c=>JSON.stringify([c.clientId,c.markId]);
 function check(epoch){if(epoch!==generation)throw new Error('This maintenance session has ended.');}
 async function rpc(stage,name,args){
  const epoch=generation;await requireAccess(db,'staff');check(epoch);
  const diagnostic=createDiagnostics('maintenance',diagnostics);let result;
  try{result=await db.rpc(name,args);}catch{check(epoch);throw failure(null,diagnostic,stage);}
  check(epoch);if(result.error)throw failure(result.error,diagnostic,stage);return result.data;
 }
 function remember(c,record){const items=cache.get(key(c))||[];const i=items.findIndex(item=>item.id===record.id);if(i<0)items.push(record);else items[i]=record;cache.set(key(c),items);return record;}
 function version(c,id){const record=(cache.get(key(c))||[]).find(item=>item.id===id);if(!record)throw new Error('Close and reopen Maintenance dates to load this entry.');return record.version;}
 return {
  async list(c){const data=await rpc('drafts_load','vb_list_maintenance_drafts',scope(c));cache.set(key(c),data);return data;},
  async save(c,id,input){const details=validateMaintenanceDraft(input),expected=id?version(c,id):0;const data=await rpc('draft_save','vb_save_maintenance_draft',{...scope(c),target_entry:id||null,expected_version:expected,details});return remember(c,data);},
  async publish(c,id,verified){if(!verified)throw new Error('Confirm that you verified these dates.');const data=await rpc('publish','vb_publish_maintenance',{...scope(c),target_entry:id,expected_version:version(c,id),verified:true});return remember(c,data);},
  async withdraw(c,id){const data=await rpc('withdraw','vb_withdraw_maintenance',{...scope(c),target_entry:id,expected_version:version(c,id)});return remember(c,data);},
  clientView(c,id){const p=(cache.get(key(c))||[]).find(r=>r.id===id)?.published;if(!p)return null;const {description,windowStart,windowEnd,deadline,nextStep,status,verifiedAt}=p;return {description,windowStart,windowEnd,deadline,nextStep,status,verifiedAt};},
  clear(){generation++;cache.clear();}
 };
}
export async function loadMaintenancePublications(db,clientId,{enabled=MAINTENANCE_ENABLED,diagnostics}={}){
 if(!enabled)return {connected:false,records:[]};
 await requireAccess(db,'client');
 const diagnostic=createDiagnostics('maintenance',diagnostics);let result;
 try{result=await db.from('vb_maintenance_publications').select(publicFields.join(',')).eq('client_id',clientId).is('withdrawn_at',null).order('deadline');}catch{throw failure(null,diagnostic,'publications_load');}
 const {data,error}=result;if(error)throw failure(error,diagnostic,'publications_load');
 return {connected:true,records:data.filter(row=>row.client_id===clientId).map(row=>Object.fromEntries(publicFields.map(field=>[field,row[field]])))};
}
