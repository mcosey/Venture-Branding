import {diagnosticRequest} from '../shared/diagnostics.mjs';
import {requireAccess} from './connection.mjs?v=20261018-record-pages';
const PRODUCTION_URL='https://omvkwiosonatswocbdgx.supabase.co';
export function assertProduction(db){if(db.supabaseUrl!==PRODUCTION_URL||window.VB_AUTH_CONFIG?.environment!=='bcm-production'||window.VB_AUTH_CONFIG?.bcmEnabled!==true)throw Error('BCM is not enabled for this portal.');}
export async function loadAiWorkspace(db,audience,clientId,{diagnostics}={}){
 assertProduction(db);await requireAccess(db,audience);
 const clients=await diagnosticRequest('research','workspace_load',()=>db.from('vb_clients').select('id,name').is('archived_at',null).order('name'),{diagnostics,message:'Clients could not load.',valid:r=>Array.isArray(r?.data)});
 const id=clientId||clients.data?.[0]?.id;
 if(!id||!clients.data.some(c=>c.id===id))throw Error('No accessible client selected.');
 const loaded=await diagnosticRequest('research','workspace_load',async()=>{const queries=[db.from('vb_bcm_settings').select('*').eq('client_id',id).maybeSingle(),db.from('vb_bcm_schedules').select('*').eq('client_id',id).maybeSingle(),db.rpc('vb_bcm_ai_ready'),
 db.from('vb_bcm_ai_publications').select('*').eq('client_id',id).is('withdrawn_at',null),
 audience==='staff'?db.from('vb_bcm_ai_observations').select('*').eq('client_id',id).order('last_seen',{ascending:false}):Promise.resolve({data:[]}),
 audience==='staff'?db.from('vb_bcm_ai_runs').select('*').eq('client_id',id).order('started_at',{ascending:false}).limit(20):db.rpc('vb_bcm_ai_client_history',{target_client:id}),db.rpc('vb_bcm_ai_baseline_progress',{target_client:id}),db.rpc('vb_bcm_ai_allowance',{target_client:id})];
 const results=await Promise.all(queries);return {data:results,error:results.find(r=>r?.error)?.error};},{diagnostics,message:'BCM setup or account access is not ready. No changes were made.',valid:r=>Array.isArray(r?.data)&&r.data.every(item=>item&&typeof item==='object')});
 const results=loaded.data;
 return {clients:clients.data,clientId:id,settings:results[0].data,schedule:results[1].data,connected:results[2].data===true,ready:results[2].data===true&&results[7].data?.available===true,allowance:results[7].data,publications:results[3].data||[],observations:results[4].data||[],runs:results[5].data||[],baseline:results[6].data};
}
export async function runAiResearch(db,clientId,version,{diagnostics}={}){assertProduction(db);await requireAccess(db,'client');return (await diagnosticRequest('research','manual_run',()=>db.functions.invoke('bcm-ai-scan',{body:{clientId,version}}),{diagnostics,message:'Research did not complete. Refresh history before retrying; no client update was published.',serverReference:true,valid:r=>r?.data?.status==='completed'})).data;}

export async function reviewAiFinding(db,row,decision,note,aliasTarget=null,{diagnostics}={}){
 assertProduction(db);await requireAccess(db,'staff');
 await diagnosticRequest('research','review',()=>db.rpc('vb_review_bcm_ai_finding',{finding:row.id,expected_revision:row.revision,decision,note,alias_target:aliasTarget}),{diagnostics,message:code=>code==='40001'?'This finding changed. Reload its evidence before reviewing.':'Review could not be saved. Check your access and review note.'});
}

export async function setAiMonitoring(db,clientId,version,revision,enabled,{diagnostics}={}){
 assertProduction(db);await requireAccess(db,'client');
 if(!Number.isInteger(version)||version<1||!Number.isInteger(revision)||revision<1||typeof enabled!=='boolean')throw Error('Reload saved settings first.');
 const r=await diagnosticRequest('research','monitoring_save',()=>db.rpc('vb_set_bcm_ai_monitoring',{target_client:clientId,expected_settings_version:version,expected_revision:revision,enabled}),{diagnostics,valid:r=>r?.data?.client_id===clientId&&r.data.enabled===enabled,message:code=>code==='40001'?'Settings changed. Reload before trying again.':'Monitoring could not be changed. Check research readiness and saved settings.'});return r.data;
}
