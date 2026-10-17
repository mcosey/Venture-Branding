export const MAX_IMAGE_BYTES=10*1024*1024;
export function imageType(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 // Require a real PNG header/IHDR or JPEG with a frame and end marker, not MIME alone.
 if(b.length>=33&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)&&new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(8)===13&&String.fromCharCode(...b.slice(12,16))==='IHDR'){
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength),w=v.getUint32(16),h=v.getUint32(20);
  if(w>0&&h>0&&w*h<=40000000&&b.slice(-8,-4).every((v,i)=>v===[73,69,78,68][i]))return 'image/png';
 }
 if(b.length>=10&&b[0]===255&&b[1]===216&&b.at(-2)===255&&b.at(-1)===217){
  let i=2;
  while(i+3<b.length){if(b[i++]!==255)break;while(b[i]===255)i++;const marker=b[i++];if(marker===0xda||marker===0xd9)break;
   if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   const size=(b[i]<<8)|b[i+1];if(size<2||i+size>b.length)break;
   if([0xc0,0xc1,0xc2].includes(marker)&&size>=8){const h=(b[i+3]<<8)|b[i+4],w=(b[i+5]<<8)|b[i+6];if(w&&h&&w*h<=40000000)return 'image/jpeg';return null;}i+=size;
  }
 }
 return null;
}
export function createHandler({createClient,env}){
 const originAllowed=o=>/^http:\/\/127\.0\.0\.1:(8000|8011|8012)$/.test(o||'');
 return async request=>{
  const origin=request.headers.get('origin'),cors=originAllowed(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{};
  const reply=(status,message)=>new Response(JSON.stringify(typeof message==='string'?{error:message}:message),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(origin&&!originAllowed(origin))return reply(403,'This upload origin is unavailable.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply(405,'Use the upload form.');
  const token=request.headers.get('authorization');if(!token?.startsWith('Bearer '))return reply(401,'Please sign in again.');
  try{
   const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
   if(!url||!key||!secret)return reply(503,'Evidence uploads are not connected.');
   const db=createClient(url,key,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
   const identity=await db.auth.getUser(token.slice(7));if(identity.error||!identity.data.user)return reply(401,'Please sign in again.');
   const role=await db.rpc('vb_session_role');if(role.error||role.data!=='client')return reply(403,'Client access required.');
   const contentLength=Number(request.headers.get('content-length'));if(contentLength>MAX_IMAGE_BYTES+65536)return reply(413,'Choose an image no larger than 10 MB.');
   // Bound the stream even when Content-Length is absent or inaccurate.
   const reader=request.body?.getReader();if(!reader)return reply(400,'Choose an image.');let length=0,chunks=[];
   for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>MAX_IMAGE_BYTES+65536){await reader.cancel();return reply(413,'Choose an image no larger than 10 MB.');}chunks.push(part.value);}
   const raw=new Uint8Array(length);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length;}
   let form;try{form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:raw}).formData();}catch{return reply(400,'The upload could not be read. Choose the image again.');}
   const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function'||file.size<1||file.size>MAX_IMAGE_BYTES)return reply(400,'Choose a PNG or JPEG image no larger than 10 MB.');
   const bytes=new Uint8Array(await file.arrayBuffer()),mime=imageType(bytes);if(!mime||mime!==file.type)return reply(400,'Choose a valid PNG or JPEG image.');
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   let details;try{details=JSON.parse(form.get('details'));}catch{return reply(400,'Check the evidence details.');}
   const {data:reserved,error}=await db.rpc('vb_reserve_evidence',{target_id:form.get('id'),target_client:form.get('client'),target_mark:form.get('mark'),details:{...details,filename:file.name,mimeType:mime,byteSize:file.size,sha256:digest}});
   if(error)return reply(error.code==='42501'?403:400,error.code==='42501'?'This trademark is unavailable to your account.':'Check the evidence details and try again.');
   if(reserved.uploaded_by!==identity.data.user.id)return reply(403,'Evidence unavailable.');
   const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),bucket=service.storage.from('vb-evidence');
   if(!reserved.uploaded_at){
    const stored=await bucket.upload(reserved.object_path,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
    if(stored.error){
     // An interrupted response may leave this same immutable object already saved.
     const previous=await bucket.download(reserved.object_path);
     if(previous.error)return reply(503,'The image could not be saved. Your upload is not complete; try again.');
     const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await previous.data.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
     if(hash!==digest)return reply(409,'This upload changed. Choose the image again.');
    }
   }
   const finished=await service.rpc('vb_finish_evidence',{target_id:reserved.id,actor:identity.data.user.id});
   if(finished.error)return reply(finished.error.code==='42501'?403:503,'The upload could not be completed. Please retry.');
   return reply(200,{evidence:finished.data});
  }catch{return reply(503,'The upload could not be completed. Please retry.');}
 };
}
