import {requireAccess} from '../../auth/connection.mjs';
// Read only client-approved snapshots; never fetch raw AI findings or private notes.
const fields='finding_id,client_id,name,kind,context,passage,source_url,approved_at,withdrawn_at';
export function reviewedMapModel(clientId,rows=[]){
 const seen=new Set();const findings=[];
 for(const row of rows){
  if(row.client_id!==clientId||row.withdrawn_at||!row.finding_id||!row.approved_at||seen.has(row.finding_id))continue;
  let source;try{source=new URL(row.source_url);if(source.protocol!=='https:'||source.username||source.password)continue;}catch{continue;}
  seen.add(row.finding_id);findings.push({id:'bcm-reviewed:'+row.finding_id,kind:'reviewed',name:row.name,type:({product:'Product / service name',feature:'Feature name',slogan:'Slogan',sub_brand:'Sub-brand',rename:'Observed name',identity:'Brand identity'})[row.kind]||'Reviewed discovery',status:'Attorney reviewed',excerpt:row.passage,reason:row.context,detectedAt:row.approved_at,sourceUrl:source.href});
 }
 return {status:'ready',clientId,findings,activity:findings.slice(0,3).map(f=>({date:f.detectedAt,label:'Discovery reviewed: '+f.name})),reviewed:true};
}
export async function loadReviewedMap(db,clientId){
 if(!clientId)throw Error('A client workspace is required.');
 await requireAccess(db,'client');
 const result=await db.from('vb_bcm_ai_publications').select(fields).eq('client_id',clientId).is('withdrawn_at',null).order('approved_at',{ascending:false});
 if(result.error)throw Error('Reviewed discoveries could not load.');
 await requireAccess(db,'client');
 return reviewedMapModel(clientId,result.data||[]);
}
