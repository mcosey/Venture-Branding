import {requireAccess} from './connection.mjs';
export const EVIDENCE_BUCKET='vb-evidence',MAX_EVIDENCE_BYTES=10485760;
export function validateEvidence(file,input,today=new Date().toISOString().slice(0,10)){
 if(!file||!['image/png','image/jpeg'].includes(file.type)||file.size<1||file.size>MAX_EVIDENCE_BYTES)throw new Error('Choose a PNG or JPEG image no larger than 10 MB.');
 if(!file.name||file.name.length>200||/[\x00-\x1f\x7f]/.test(file.name))throw new Error('Use an image filename of 200 characters or fewer.');
 const date=input.capturedOn;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<'1900-01-01'||date>today)throw new Error('Enter a valid capture date that is not in the future.');
 if(!['webpage','photo'].includes(input.kind))throw new Error('Choose screenshot or photo.');
 const source=(input.sourceUrl||'').trim(),notes=(input.notes||'').trim();
 if(input.kind==='webpage'){let url;try{url=new URL(source);}catch{}if(!url||!['http:','https:'].includes(url.protocol)||url.username||url.password||source.length>2048)throw new Error('Enter the webpage address without passwords or sign-in details.');}
 if(notes.length>1000)throw new Error('Keep notes to 1,000 characters or fewer.');
 return {kind:input.kind,capturedOn:date,sourceUrl:input.kind==='webpage'?source:null,notes};
}
export function createEvidenceRepository(db,audience,{enabled=globalThis.VB_EVIDENCE_ENABLED===true}={}){
 if(!enabled)return null;
 let generation=0;
 async function access(){const epoch=generation;await requireAccess(db,audience);if(epoch!==generation)throw new Error('This evidence session has ended.');return epoch;}
 const check=e=>{if(e!==generation)throw new Error('This evidence session has ended.');};
 return {
  async list(clientId,markId){const epoch=await access();let query=db.from('vb_evidence').select('id,client_id,mark_id,kind,captured_on,source_url,notes,filename,mime_type,byte_size,object_path,uploaded_at').eq('client_id',clientId);if(markId)query=query.eq('mark_id',markId);const result=await query.is('removed_at',null).not('uploaded_at','is',null).order('uploaded_at',{ascending:false});check(epoch);if(result.error)throw new Error('Evidence could not be loaded. Please try again.');return result.data.filter(r=>r.client_id===clientId&&(!markId||r.mark_id===markId));},
  async upload(clientId,markId,file,input,id){if(audience!=='client')throw new Error('Only clients can upload evidence.');const details=validateEvidence(file,input),epoch=await access();const form=new FormData();form.append('file',file);form.append('client',clientId);form.append('mark',markId);form.append('id',id);form.append('details',JSON.stringify(details));const result=await db.functions.invoke('evidence-upload',{body:form});check(epoch);if(result.error||!result.data?.evidence?.uploaded_at){let message='Upload not completed. Check your connection and try again.';try{message=(await result.error.context.json()).error||message;}catch{}throw new Error(message);}return result.data.evidence;},
  async remove(clientId,id){const epoch=await access();const result=await db.rpc('vb_remove_evidence',{target_id:id,target_client:clientId});check(epoch);if(result.error)throw new Error('This upload could not be removed. Please reload and try again.');},
  async image(record){const epoch=await access();const result=await db.storage.from(EVIDENCE_BUCKET).download(record.object_path);check(epoch);if(result.error)throw new Error('This image is unavailable. Please reload or sign in again.');return result.data;},
  clear(){generation++;}
 };
}
