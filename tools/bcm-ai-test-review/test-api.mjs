import {requireAccess} from '../../auth/connection.mjs';
import {TEST_URL} from '../../supabase/functions/bcm-ai/research.mjs';
export function assertTest(db){if(db.supabaseUrl!==TEST_URL)throw Error('BCM AI is available in Test only.');}
export async function loadAiWorkspace(db,audience,clientId){
 assertTest(db);await requireAccess(db,audience);
 const clients=await db.from('vb_clients').select('id,name').is('archived_at',null).order('name');
 if(clients.error)throw Error('Clients could not load.');
 const id=clientId||clients.data?.[0]?.id;
 if(!id||!clients.data.some(c=>c.id===id))throw Error('No accessible client selected.');
 const queries=[db.from('vb_bcm_settings').select('*').eq('client_id',id).maybeSingle(),db.from('vb_bcm_schedules').select('*').eq('client_id',id).maybeSingle(),db.rpc('vb_bcm_ai_ready'),
 db.from('vb_bcm_ai_publications').select('*').eq('client_id',id).is('withdrawn_at',null),
 audience==='staff'?db.from('vb_bcm_ai_observations').select('*').eq('client_id',id).order('last_seen',{ascending:false}):Promise.resolve({data:[]}),
 audience==='staff'?db.from('vb_bcm_ai_runs').select('*').eq('client_id',id).order('started_at',{ascending:false}).limit(20):db.rpc('vb_bcm_ai_client_history',{target_client:id}),db.rpc('vb_bcm_ai_baseline_progress',{target_client:id})];
 const results=await Promise.all(queries);if(results.some(r=>r.error))throw Error('Test setup or account access is not ready. No changes were made.');
 return {clients:clients.data,clientId:id,settings:results[0].data,schedule:results[1].data,ready:results[2].data===true,publications:results[3].data||[],observations:results[4].data||[],runs:results[5].data||[],baseline:results[6].data};
}
export async function runAiResearch(db,clientId,version){assertTest(db);await requireAccess(db,'client');const r=await db.functions.invoke('bcm-ai-scan',{body:{clientId,version}});if(r.error||r.data?.status!=='completed')throw Error('Research did not complete. Refresh history before retrying; no client update was published.');return r.data;}
export async function reviewAiFinding(db,row,decision,note,aliasTarget=null){
 assertTest(db);await requireAccess(db,'staff');
 const r=await db.rpc('vb_review_bcm_ai_finding',{finding:row.id,expected_revision:row.revision,decision,note,alias_target:aliasTarget});
 if(r.error)throw Error(r.error.code==='40001'?'This finding changed. Reload its evidence before reviewing.':'Review could not be saved. Check your access and review note.');
}

export async function setAiMonitoring(db,clientId,version,revision,enabled){
 assertTest(db);await requireAccess(db,'client');
 if(!Number.isInteger(version)||version<1||!Number.isInteger(revision)||revision<1||typeof enabled!=='boolean')throw Error('Reload saved settings first.');
 const r=await db.rpc('vb_set_bcm_ai_monitoring',{target_client:clientId,expected_settings_version:version,expected_revision:revision,enabled});
 if(r.error||r.data?.client_id!==clientId||r.data?.enabled!==enabled)throw Error(r.error?.code==='40001'?'Settings changed. Reload before trying again.':'Monitoring could not be changed. Check Test readiness and saved settings.');return r.data;
}
