import {milestones,emptyProgress,decodeProgress,taskProgressIndex} from './llk-data.mjs';
import {createDiagnostics,databaseCategory} from '../../shared/diagnostics.mjs';
const known=new Set(milestones.map(m=>m.id));
export function progressPayload(progress,id){
 if(!known.has(id))throw Error('Unknown milestone.');
 const normalized=decodeProgress(JSON.stringify(progress));
 return {version:1,tasks:normalized.tasks[id],notes:normalized.notes[id]||''};
}
export function readAccountProgress(rows,companyId){
 const progress=emptyProgress(),versions=new Map();
 for(const row of rows){
  if(row.company_id!==companyId)throw Error('Unexpected company in saved progress.');
  if(!known.has(row.milestone_id))continue;
  const value=row.progress;
  if(value?.version!==1||!Array.isArray(value.tasks)||value.tasks.some(x=>typeof x!=='boolean')||typeof value.notes!=='string'||value.notes.length>3000||!row.updated_at)throw Error('Saved progress format is unavailable.');
  progress.tasks[row.milestone_id]=value.tasks;progress.notes[row.milestone_id]=value.notes;versions.set(row.milestone_id,row.updated_at);
 }
 return {progress:decodeProgress(JSON.stringify(progress)),versions};
}
export function mergeBrowserProgress(account,browser){
 const merged=decodeProgress(JSON.stringify(account)),source=decodeProgress(JSON.stringify(browser));
 for(const m of milestones){merged.tasks[m.id]=Array.from({length:taskProgressIndex(m,m.tasks.length)},(_,i)=>merged.tasks[m.id]?.[i]===true||source.tasks[m.id]?.[i]===true);if(!merged.notes[m.id])merged.notes[m.id]=source.notes[m.id]||'';}
 return merged;
}
export function createAccountProgressStore({db,companyId,onState=()=>{},delay=350,diagnostics}){
 let versions=new Map(),loaded=false,running=null,timer=null,state='loading';const pending=new Map();
 const notify=value=>{state=value;onState(value);};
 async function load(){
  const diagnostic=createDiagnostics('member',diagnostics);
  if(running)await running;
  clearTimeout(timer);notify('loading');
  try{
   if(!companyId)throw Error('Company setup required.');
   const access=await db.rpc('vb_account_access');
   if(access.error||!['member','client','alumni'].includes(access.data))throw Error('Account access unavailable.');
   const response=await db.from('vb_member_progress').select('company_id,milestone_id,progress,updated_at').eq('company_id',companyId);
   if(response.error)throw response.error;
   const parsed=readAccountProgress(response.data,companyId);versions=parsed.versions;pending.clear();loaded=true;notify('saved');return parsed.progress;
  }catch{loaded=false;notify('load-error');throw diagnostic.error('progress_load','Saved progress could not be loaded. Please retry.');}
 }
 function queue(id,progress){
  if(!loaded)throw Error('Load saved progress before making changes.');
  pending.set(id,progressPayload(progress,id));
  if(['error','conflict'].includes(state))return;
  notify('saving');clearTimeout(timer);timer=setTimeout(()=>{timer=null;void flush();},delay);
 }
 async function drain(){
  const diagnostic=createDiagnostics('member',diagnostics);
  while(pending.size){
   const [id,payload]=pending.entries().next().value;pending.delete(id);
   let response;
   try{response=await db.rpc('vb_save_member_progress',{company:companyId,milestone:id,details:payload,expected_updated_at:versions.get(id)||null});}catch(error){response={error};}
   if(response.error||typeof response.data!=='string'){
    diagnostic.failure('progress_save',databaseCategory(response.error?.code));
    if(!pending.has(id))pending.set(id,payload);
    notify(response.error?.code==='40001'?'conflict':'error');return false;
   }
   versions.set(id,response.data);
  }
  notify('saved');return true;
 }
 function flush(){
  clearTimeout(timer);timer=null;
  if(running)return running;
  if(!loaded||state==='conflict')return Promise.resolve(false);
  notify('saving');running=drain().finally(()=>{running=null;});return running;
 }
 return {load,queue,flush,retry:flush,get state(){return state;},get hasPending(){return pending.size>0||running!==null;}};
}
