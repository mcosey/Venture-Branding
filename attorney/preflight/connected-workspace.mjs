import './checks.js';
import './transfer.js';
import {requireAccess} from '../../auth/connection.mjs';
import {createDraftStore} from './draft-store.mjs';
import {currentReview,canApprove,canRecordReadiness} from './review-state.mjs';

export function setupFilingWorkspace(db) {
 const dialog=document.querySelector('#filing-editor'),$=s=>dialog.querySelector(s),form=$('#filing-inputs');
 let context=null,store=null,saved=null,events=[],versions=[],dirty=false,busy=false,epoch=0,step='prepare';
 const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const values=()=>Object.fromEntries(new FormData(form));
 const message=text=>{$('#filing-status').textContent=text;};
 const review=()=>currentReview(events,saved?.revision);
 const fill=input=>{form.reset();for(const el of form.elements)if(el.name&&el.type!=='submit')el.value=input[el.name]??'';};
 function clearManualReview(){$('#filing-manual').checked=false;}
 function discard(){return !dirty||window.confirm('This draft has unsaved edits. Discard those edits?');}
 function unavailable(error){
  if(['PT409','40001'].includes(error?.code))return 'Another saved version or review exists. Your edits are still here. Reopen the saved version before continuing.';
  if(['42P01','42883','PGRST202','PGRST205'].includes(error?.code))return 'Draft saving is not connected yet. The prepared database update must be tested and activated before this feature can save.';
  return error?.message||'Unable to finish. Your edits have not been discarded.';
 }
 async function operation(action){
  if(busy)return;const token=epoch;busy=true;render();
  try{await requireAccess(db,'staff');if(token!==epoch)return;await action(token);}
  catch(error){if(token===epoch)message(unavailable(error));}
  finally{if(token===epoch){busy=false;render();}}
 }
 function applySaved(record){saved=record;fill(record.input);dirty=false;clearManualReview();}
 async function history(){[events,versions]=await Promise.all([store.history(),store.revisions()]);}
 function render(){
  if(!context)return;
  const r=review(),fresh=Boolean(saved&&!dirty),approved=fresh&&Boolean(r.approval);
  $('#filing-revision').textContent=saved?'Saved revision '+saved.revision+(dirty?' · Unsaved edits — earlier approvals do not apply':' · Changes saved'):'New draft · Not saved';
  $('#filing-content').hidden=!context.editing;$('#filing-picker').hidden=context.editing;
  for(const el of dialog.querySelectorAll('input,textarea,select,button'))el.disabled=busy;
  $('#filing-reopen').disabled=busy||!saved;
  $('#filing-check').disabled=busy||!fresh;
  $('#filing-approve').disabled=busy||!fresh||!canApprove(r)||approved;
  $('#filing-manual').disabled=busy||!approved||Boolean(r.ready);
  $('#filing-ready').disabled=busy||!fresh||!canRecordReadiness(r,$('#filing-manual').checked)||Boolean(r.ready);
  for(const el of dialog.querySelectorAll('[data-filing-panel]'))el.hidden=el.dataset.filingPanel!==step;
  for(const el of dialog.querySelectorAll('[data-filing-step]'))el.toggleAttribute('aria-current',el.dataset.filingStep===step);
  const show=(selector,visible)=>{const el=$(selector);if(el)el.hidden=!visible;};
  show('#use-fields',form.elements.basis.value==='Use in commerce');show('#second-class',form.elements.classCount.value==='2');show('#use-fields2',form.elements.basis2.value==='Use in commerce');
  $('#filing-checks').replaceChildren();
  if(fresh&&r.check)for(const row of r.check.details.rows){
   const el=node('div');el.className='filing-review-row';el.append(node('h3',row.title),node('p',row.status),node('p',row.detail));
   if(r.decisions[row.id])el.append(node('p','Attorney '+r.decisions[row.id].kind+': '+r.decisions[row.id].reason));
   if(['REVIEW','MISSING INFORMATION'].includes(row.status)){
    const label=node('label','Attorney review reason'),reason=node('textarea');reason.maxLength=1500;reason.value=r.decisions[row.id]?.reason??'';reason.disabled=busy;label.append(reason);
    const kind=node('select');for(const text of ['Reviewed','Override']){const option=node('option',text);kind.append(option);}kind.setAttribute('aria-label','Decision for '+row.title);kind.disabled=busy;
    const button=node('button','Record attorney decision');button.type='button';button.disabled=busy;button.onclick=()=>{const text=reason.value.trim();if(!text){message('Enter a reason for this attorney decision.');return;}const details={check_id:r.check.id,issue_id:row.id,kind:kind.value,reason:text};operation(async()=>{events.push(await store.review('resolution',details));message('Attorney decision saved.');});};
    el.append(label,kind,button);
   }
   $('#filing-checks').append(el);
  }
  $('#filing-transfer').replaceChildren();
  if(approved)for(const row of globalThis.Transfer.guide(saved.input)){
   const el=node('div');el.className='filing-review-row';el.append(node('h3',row.section+' → '+row.label),node('p',row.action+': '+row.value),node('p',row.instruction||row.destinationStatus||'Confirm the correct destination with the attorney.'));
   if(['Paste','Enter'].includes(row.action)){
    const button=node('button','Copy');button.className='filing-copy';button.type='button';button.disabled=busy;button.setAttribute('aria-live','polite');
    button.onclick=async()=>{
     button.disabled=true;
     try{await navigator.clipboard.writeText(row.value);button.textContent='✓ Copied';button.dataset.copied='true';message('Copied '+row.label+'.');}
     catch{button.textContent='Copy failed';delete button.dataset.copied;message('Select the displayed value and copy it with your keyboard.');}
     finally{
      button.disabled=busy;
     }
    };el.append(button);
   }
   $('#filing-transfer').append(el);
  }else $('#filing-transfer').append(node('p','Save, check, and approve the current revision before transferring.'));
  $('#filing-manual-status').textContent=fresh&&r.ready?'Manual review recorded for saved revision '+saved.revision+'. No application was filed.':'Compare the approved information with the application in Trademark Center yourself before confirming this review.';
  $('#filing-history').replaceChildren();for(const e of events){const details=node('details');details.append(node('summary',e.action+' · Revision '+e.revision+' · '+new Date(e.created_at).toLocaleString()),node('p','Recorded by staff account '+e.actor_id),node('pre',JSON.stringify(e.details,null,2)));$('#filing-history').append(details);}
  $('#filing-versions').replaceChildren(...versions.map(v=>node('p','Revision '+v.revision+' · '+new Date(v.created_at).toLocaleString()+' · Staff account '+v.actor_id)));
 }
 async function list(token){
  const records=await store.list();if(token!==epoch)return;$('#filing-list').replaceChildren();
  for(const draft of records){const button=node('button','Reopen initial application · Revision '+draft.revision+' · '+new Date(draft.updated_at).toLocaleString());button.type='button';button.onclick=()=>operation(async t=>{const record=await store.load(draft.id);if(t!==epoch)return;applySaved(record);context.editing=true;step='prepare';await history();message('Saved draft reopened. Manual review applies only to the approved saved revision.');});$('#filing-list').append(button);}
  if(!records.length)$('#filing-list').append(node('p','No saved initial applications for this trademark.'));
 }
 form.onsubmit=e=>e.preventDefault();
 form.addEventListener('input',()=>{dirty=true;clearManualReview();render();message('Unsaved edits. Earlier approvals no longer apply. Save and run new checks.');});
 $('#filing-new').onclick=()=>{context.editing=true;saved=null;events=[];versions=[];store=createDraftStore(db,context.client.id,context.mark.id);fill({owner:context.client.name,mark:context.mark.name,format:context.mark.type,register:'Principal Register',category:'Trademark / service mark',ownerCount:'One owner',classCount:'1',basis:'Intent to use',entryMethod:'ID Manual',translationMode:'Not applicable',transliterationMode:'Not applicable',consentMode:'Not applicable',disclaimerMode:'Not applicable',priorMode:'Not applicable'});dirty=true;step='prepare';message('Initial application draft created in memory. Confirm the client information and select the filing basis before saving.');render();};
 $('#filing-save').onclick=()=>{const input=values();operation(async token=>{const record=await store.save(input);if(token!==epoch)return;applySaved(record);await history();message('Draft saved as revision '+record.revision+'. Run new checks before approval.');});};
 $('#filing-reopen').onclick=()=>{if(!discard())return;operation(async token=>{const record=await store.load(saved.id);if(token!==epoch)return;applySaved(record);await history();message('Latest saved revision reopened.');});};
 $('#filing-check').onclick=()=>operation(async()=>{const rows=globalThis.Preflight.check(saved.input);events.push(await store.review('check',{version:globalThis.Preflight.version,input:saved.input,rows}));clearManualReview();message('Preparation check saved. Review every item before transfer.');});
 $('#filing-approve').onclick=()=>{const r=review();if(dirty||!canApprove(r))return;operation(async()=>{events.push(await store.review('transfer_approval',{check_id:r.check.id}));clearManualReview();step='transfer';message('Saved revision approved for manual transfer.');});};
 $('#filing-manual').onchange=render;
 $('#filing-ready').onclick=()=>{const r=review();if(dirty||!canRecordReadiness(r,$('#filing-manual').checked))return;operation(async()=>{events.push(await store.review('readiness',{check_id:r.check.id,approval_id:r.approval.id,manual_review_confirmed:true}));message('Attorney manual review recorded for this revision. No application was filed.');});};
 dialog.addEventListener('click',e=>{const b=e.target.closest('[data-filing-step]');if(b){step=b.dataset.filingStep;render();}});
 $('#filing-close').onclick=()=>{if(!busy&&discard())dialog.close();};
 dialog.addEventListener('cancel',e=>{if(busy||!discard())e.preventDefault();});
 dialog.addEventListener('close',()=>{epoch++;context=store=saved=null;events=[];versions=[];dirty=false;busy=false;fill({});clearManualReview();for(const id of ['filing-history','filing-checks','filing-transfer','filing-versions','filing-list'])$('#'+id).replaceChildren();$('#filing-context').textContent='';message('');});
 window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){dirty=false;dialog.close();}});
 return {open(client,mark){
  if(dialog.open||busy)return;epoch++;context={client,mark,editing:false};store=createDraftStore(db,client.id,mark.id);saved=null;events=[];versions=[];dirty=false;
  $('#filing-context').textContent=client.name+' / '+mark.name;$('#filing-list').replaceChildren();message('Loading saved initial applications…');dialog.showModal();operation(async token=>{await list(token);if(token===epoch)message('Choose a new initial application or reopen a saved draft.');});
 }};
}
