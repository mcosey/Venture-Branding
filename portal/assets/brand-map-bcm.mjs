import {requireAccess} from '../../auth/connection.mjs';
import {findBcmCandidates} from '../../auth/bcm.mjs';

const scanFields='id,client_id,status,scan_type,baseline_id,started_at,finished_at,snapshot';
// Read saved results only. No scanner invocation, writes, or new permissions.
export async function loadBrandMapBcm(db,clientId){
 if(!clientId)throw new Error('A client workspace is required.');
 await requireAccess(db,'client');
 const recent=await db.from('vb_bcm_scans').select(scanFields).eq('client_id',clientId).order('started_at',{ascending:false}).limit(10);
 if(recent.error)throw new Error('Saved monitor results could not be loaded.');
 const scans=(recent.data||[]).filter(scan=>scan.client_id===clientId);
 const missing=[...new Set(scans.filter(scan=>scan.status==='completed'&&scan.scan_type==='comparison').map(scan=>scan.baseline_id).filter(id=>id&&!scans.some(scan=>scan.id===id)))];
 let baselines=[];
 if(missing.length){
  const result=await db.from('vb_bcm_scans').select(scanFields).eq('client_id',clientId).in('id',missing);
  if(result.error)throw new Error('Saved monitor baselines could not be loaded.');
  baselines=result.data||[];
 }
 return brandMapBcmModel(clientId,scans,baselines);
}

export function brandMapBcmModel(clientId,scans=[],baselines=[]){
 const recent=scans.filter(scan=>scan.client_id===clientId).slice().sort((a,b)=>(Date.parse(b.started_at)||0)-(Date.parse(a.started_at)||0)).slice(0,10);
 const available=[...recent,...baselines.filter(scan=>scan.client_id===clientId)];
 const findings=[],seen=new Set();let compared=0,missingBaselines=0;
 for(const scan of recent){
  if(scan.status!=='completed'||scan.scan_type!=='comparison')continue;
  const baseline=available.find(row=>row.id===scan.baseline_id&&row.scan_type==='baseline'&&row.status==='completed'&&row.snapshot);
  if(!baseline||!scan.snapshot){missingBaselines++;continue;}compared++;
  for(const candidate of findBcmCandidates(baseline.snapshot,scan.snapshot)){
   const key=candidate.type+'|'+candidate.term.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
   if(seen.has(key))continue;seen.add(key);
   findings.push({id:'bcm:'+scan.id+':'+findings.length,kind:'detected',name:candidate.term,type:candidate.title,status:'Possible change · needs review',excerpt:candidate.excerpt,reason:candidate.reason,detectedAt:scan.finished_at||scan.started_at,sourceUrl:scan.snapshot.pages?.find(page=>typeof page.text==='string'&&page.text.includes(candidate.excerpt))?.url||scan.snapshot.url||'Not recorded'});
  }
 }
 const activity=recent.slice(0,3).map(scan=>({date:scan.finished_at||scan.started_at,label:scan.status==='completed'?(scan.scan_type==='comparison'?'Text comparison saved':'Baseline saved'):scan.status==='failed'?'Scan failed':'Scan not completed'}));
 return {status:'ready',clientId,findings,activity,scanCount:recent.length,compared,missingBaselines};
}
