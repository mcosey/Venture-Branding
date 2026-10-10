import {createEvidenceRepository,validateEvidence} from '../../auth/evidence.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function field(form,text,control){const label=el('label',text,'evidence-field');label.append(control);form.append(label);return control;}
const input=(type)=>{const n=el('input');n.type=type;return n;};
export function renderEvidence(host,client,marks,db,{audience='client',markId=null}={}){
 if(!document.querySelector('[data-evidence-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./evidence.css',import.meta.url).href;style.dataset.evidenceStyle='';document.head.append(style);}
 const repo=createEvidenceRepository(db,audience),root=el('section',undefined,audience==='staff'?'evidence-area evidence-inline':'panel connected-card evidence-area');host.append(root);
 root.append(el('h2','Evidence of Use'),el('p',audience==='client'?'Upload screenshots or photos showing how you use your trademark. Your attorney can view the files.':'Files uploaded by this client.','muted'));
 if(!repo){root.append(el('p','Evidence uploads are not connected in this workspace.','muted'));return ()=>{};}
 const allowed=marks.filter(m=>(!m.client_id||m.client_id===client.id)&&(!markId||m.id===markId));
 let disposed=false,revision=0,uploadId=null,blobUrls=new Set();
 const list=el('div',undefined,'evidence-list'),status=el('p',undefined,'evidence-status');status.setAttribute('role','status');
 root.append(status);
 function resetUrls(){for(const url of blobUrls)URL.revokeObjectURL(url);blobUrls.clear();}
 const signout=(_event)=>{if(_event==='SIGNED_OUT')dispose();};const subscription=db.auth.onAuthStateChange(signout).data?.subscription;
 function dispose(){if(disposed)return;disposed=true;revision++;repo.clear();resetUrls();root.replaceChildren();subscription?.unsubscribe();}
 async function showImage(record,target,button){const ticket=revision;button.disabled=true;try{const blob=await repo.image(record);if(disposed||ticket!==revision||!root.isConnected)return;const url=URL.createObjectURL(blob);blobUrls.add(url);const img=el('img',undefined,'evidence-image');img.src=url;img.alt='Uploaded evidence for '+(allowed.find(m=>m.id===record.mark_id)?.name||'trademark');const download=el('a','Download image','outline-button');download.href=url;download.download=record.filename;target.replaceChildren(img,download);button.remove();}catch(error){if(!disposed){target.textContent=error.message;button.disabled=false;}}}
 async function load(){const ticket=++revision;status.textContent='Loading evidence…';try{const records=await repo.list(client.id,markId);if(disposed||ticket!==revision||!root.isConnected)return;resetUrls();list.replaceChildren();if(!records.length)list.append(el('p','No evidence uploaded yet.','muted'));
 for(const record of records){const card=el('article',undefined,'evidence-entry');card.append(el('h3',allowed.find(m=>m.id===record.mark_id)?.name||'Trademark evidence'),el('p',record.filename),el('p','Captured '+record.captured_on+' · Uploaded '+new Date(record.uploaded_at).toLocaleString(),'muted'));if(record.source_url)card.append(el('p','Webpage: '+record.source_url));if(record.notes)card.append(el('p',record.notes));const target=el('div');const button=el('button','View image','outline-button');button.type='button';button.addEventListener('click',()=>showImage(record,target,button));const remove=el('button','Remove','outline-button');remove.type='button';remove.setAttribute('aria-label','Remove '+record.filename);const confirmation=el('div',undefined,'evidence-removal-confirmation');
 remove.addEventListener('click',()=>{if(confirmation.childElementCount)return;confirmation.append(el('p','Remove this upload from both views? The file will be kept privately for recovery.'));const yes=el('button','Remove upload','outline-button'),cancel=el('button','Cancel','outline-button');yes.type=cancel.type='button';cancel.addEventListener('click',()=>confirmation.replaceChildren());yes.addEventListener('click',async()=>{yes.disabled=cancel.disabled=remove.disabled=true;try{await repo.remove(client.id,record.id);if(disposed)return;card.remove();resetUrls();await load();if(!disposed)status.textContent='Upload removed.';}catch(error){if(!disposed){status.textContent=error.message;yes.disabled=cancel.disabled=remove.disabled=false;}}});confirmation.append(yes,cancel);});
 card.append(button,document.createTextNode(' '),remove,confirmation,target);list.append(card);}status.textContent='';
 }catch(error){if(!disposed&&ticket===revision){status.textContent=error.message;}}}
 if(audience==='client'){
  if(!allowed.length){root.append(el('p','Your attorney must add a trademark before you can upload evidence.'));}
  else{
   const form=el('form',undefined,'evidence-form'),select=el('select');select.required=true;for(const mark of allowed)select.append(new Option(mark.name,mark.id));const requested=new URLSearchParams(location.search).get('mark');if(allowed.some(m=>m.id===requested))select.value=requested;field(form,'Trademark',select);
   const kind=el('select');kind.append(new Option('Website screenshot','webpage'),new Option('Photo of product, label or other use','photo'));field(form,'Evidence type',kind);
   const file=field(form,'Screenshot or photo (PNG/JPEG, up to 10 MB)',input('file'));file.accept='image/png,image/jpeg';file.required=true;
   const date=field(form,'Capture or photo date',input('date'));date.required=true;date.max=new Date().toISOString().slice(0,10);
   const source=field(form,'Webpage address',input('url'));source.required=true;source.maxLength=2048;source.placeholder='https://example.com/product';kind.addEventListener('change',()=>{source.required=kind.value==='webpage';source.parentElement.hidden=kind.value!=='webpage';});
   const notes=el('textarea');notes.maxLength=1000;field(form,'Notes (optional)',notes);
   const save=el('button','Upload evidence','mark-primary');save.type='submit';form.append(save);root.append(form);
   file.addEventListener('change',()=>{uploadId=null;});form.addEventListener('input',event=>{if(event.target!==file)uploadId=null;});
   form.addEventListener('submit',async event=>{event.preventDefault();const selected=file.files[0],details={kind:kind.value,capturedOn:date.value,sourceUrl:source.value,notes:notes.value};try{validateEvidence(selected,details);}catch(error){status.textContent=error.message;return;}
    try{const decoded=await createImageBitmap(selected);if(decoded.width*decoded.height>40000000){decoded.close();throw new Error('Choose an image smaller than 40 million pixels.');}decoded.close();}catch(error){status.textContent=error.message.includes('40 million')?error.message:'This image could not be opened. Choose a valid PNG or JPEG.';return;}
    uploadId??=crypto.randomUUID();const controls=[...form.elements];controls.forEach(c=>c.disabled=true);status.textContent='Uploading evidence…';
    try{await repo.upload(client.id,select.value,selected,details,uploadId);if(disposed)return;form.reset();source.parentElement.hidden=false;source.required=true;uploadId=null;await load();if(!disposed)status.textContent='Evidence uploaded.';}
    catch(error){if(!disposed)status.textContent=error.message;}
    finally{if(!disposed)controls.forEach(c=>c.disabled=false);}
   });
  }
 }
 const refresh=el('button','Refresh evidence','outline-button');refresh.type='button';refresh.addEventListener('click',load);root.append(refresh,list);load();return dispose;
}
