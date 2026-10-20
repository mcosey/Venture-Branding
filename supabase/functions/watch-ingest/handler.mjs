import {createDiagnostics} from '../../../shared/diagnostics.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validateInput(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid request');
 const keys={begin:['action','filename','revision','expected','manifest_revision'],batch:['action','file_id','number','records'],complete:['action','file_id'],run:['action'],inventory:['action']}[p.action];
 if(!keys||Object.keys(p).some(k=>!keys.includes(k)))throw Error('Invalid request');
 if(p.action==='begin'&&(!/^apc\d{6}\.zip$/.test(p.filename)||!/^[a-f0-9]{64}$/.test(p.revision)||!/^[a-f0-9]{64}$/.test(p.manifest_revision)||!Number.isInteger(p.expected)||p.expected<0||p.expected>20000))throw Error('Invalid manifest');
 if(['batch','complete'].includes(p.action)&&!uuid.test(p.file_id))throw Error('Invalid file');
 if(p.action==='batch'){
  if(!Number.isInteger(p.number)||p.number<0||p.number>1999||!Array.isArray(p.records)||!p.records.length||p.records.length>100)throw Error('Invalid batch');
  for(const r of p.records){
   if(!r||Object.keys(r).sort().join(',')!=='classes,filing_date,goods,name,owners,serial,status_code'||!/^\d{8}$/.test(r.serial)||typeof r.name!=='string'||!r.name.trim()||r.name.length>4096||!/^[\d]{4}-\d{2}-\d{2}$/.test(r.filing_date)||!Number.isFinite(Date.parse(r.filing_date))||new Date(r.filing_date).toISOString().slice(0,10)!==r.filing_date||!/^\d{3}$/.test(r.status_code))throw Error('Invalid application');
   if(!Array.isArray(r.classes)||r.classes.length>45||r.classes.some(c=>typeof c!=='string'||!/^([1-9]|[1-3][0-9]|4[0-5]|A|B|200)$/.test(c))||!Array.isArray(r.owners)||r.owners.length>50||r.owners.some(o=>typeof o!=='string'||o.length>4096)||!Array.isArray(r.goods)||r.goods.length>45||r.goods.some(g=>!g||Object.keys(g).sort().join(',')!=='class,text'||!/^(?:\d{3}|A|B)$/.test(g.class)||typeof g.text!=='string'||g.text.length>524288))throw Error('Invalid evidence');
  }
 }
 return p;
}
async function equalSecrets(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length>256||b.length<32)return false;
 const encode=new TextEncoder();const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',encode.encode(v))));
 const left=new Uint8Array(x),right=new Uint8Array(y);let different=0;for(let i=0;i<left.length;i++)different|=left[i]^right[i];return different===0;
}
export function createWatchHandler({env,createClient,diagnostics}){
 return async req=>{
  const diagnostic=createDiagnostics('watch',diagnostics);let stage='input';
  const reply=(data,status=200)=>{if(status>=400&&stage==='database'){const ref=diagnostic.failure(stage,'unavailable',status);if(ref)data={...data,supportReference:ref};}return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});};
  if(req.method!=='POST')return reply({error:'POST required'},405);
  if(!['https://omvkwiosonatswocbdgx.supabase.co','https://imvkhicfmidzbzsbhkzs.supabase.co'].includes(env('SUPABASE_URL')))return reply({error:'Wrong Watch project'},503);
  if(env('WATCH_RELEASE_ENABLED')!=='true')return reply({error:'Watch ingestion disabled'},503);
  if(!await equalSecrets(req.headers.get('x-watch-ingest-key'),env('WATCH_INGEST_KEY')))return reply({error:'Unauthorized'},401);
  try{
   // Enforce streamed byte cap before parsing, including missing Content-Length.
   const reader=req.body?.getReader();if(!reader)throw Error('Empty request');let size=0;const chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1048576)return reply({error:'Request too large'},413);chunks.push(value);}}finally{await reader.cancel();}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   const p=validateInput(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
   const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
   stage='database';const result=await db.rpc(p.action==='run'?'vb_watch_run_due':'vb_watch_ingest',p.action==='run'?{}:{details:p});
   // Don't return raw SQL errors, application records or secrets to the runner.
   if(result.error)return reply({error:'Watch operation failed'},409);
   return reply(result.data);
  }catch{return reply({error:'Invalid Watch request'},400);}
 };
}
