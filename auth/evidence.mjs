import {diagnosticRequest} from '../shared/diagnostics.mjs';
import {requireAccess} from './connection.mjs?v=20261018-record-pages';
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
export function createEvidenceRepository(db,audience,{enabled=globalThis.VB_EVIDENCE_ENABLED===true,diagnostics}={}){
 if(!enabled)return null;
 let generation=0;
 async function access(){const epoch=generation;await requireAccess(db,audience);if(epoch!==generation)throw new Error('This evidence session has ended.');return epoch;}
 const check=e=>{if(e!==generation)throw new Error('This evidence session has ended.');};
 async function request(stage,work,message,options={}){const epoch=await access();return diagnosticRequest('evidence',stage,work,{diagnostics,message,...options,check:()=>check(epoch)});}
 return {
  async list(clientId,markId){const result=await request('list',()=>{let query=db.from('vb_evidence').select('id,client_id,mark_id,kind,captured_on,source_url,notes,filename,mime_type,byte_size,object_path,uploaded_at').eq('client_id',clientId);if(markId)query=query.eq('mark_id',markId);return query.is('removed_at',null).not('uploaded_at','is',null).order('uploaded_at',{ascending:false});},'Evidence could not be loaded. Please try again.',{valid:r=>Array.isArray(r?.data)});return result.data.filter(r=>r.client_id===clientId&&(!markId||r.mark_id===markId));},
  async upload(clientId,markId,file,input,id){if(audience!=='client')throw new Error('Only clients can upload evidence.');const details=validateEvidence(file,input);const result=await request('upload',()=>{const form=new FormData();form.append('file',file);form.append('client',clientId);form.append('mark',markId);form.append('id',id);form.append('details',JSON.stringify(details));return db.functions.invoke('evidence-upload',{body:form});},'Upload not completed. Check your connection and try again.',{serverReference:true,valid:r=>Boolean(r?.data?.evidence?.uploaded_at)});return result.data.evidence;},
  async remove(clientId,id){await request('remove',()=>db.rpc('vb_remove_evidence',{target_id:id,target_client:clientId}),'This upload could not be removed. Please reload and try again.');},
  async image(record){const result=await request('image',()=>db.storage.from(EVIDENCE_BUCKET).download(record.object_path),'This image is unavailable. Please reload or sign in again.',{valid:r=>r?.data!=null});return result.data;},
  clear(){generation++;}
 };
}
