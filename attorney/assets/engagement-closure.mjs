import {showFlowLoading} from '../../shared/loading.mjs';
export function createEngagementClosure(repository,onClosed){
 const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const dialog=make('dialog');dialog.className='engagement-closure';dialog.setAttribute('aria-labelledby','engagement-close-heading');
 const heading=make('h2','Close engagement');heading.id='engagement-close-heading';
 const description=make('p'),explanation=make('p','Closing this engagement removes client access to its records and stops its scheduled tools. Other active engagements remain available. When no active engagements remain for a user, they return to Member access and keep their Legal Launch Kit progress. Retained records remain available to the attorney.');
 const loading=make('div');loading.hidden=true;
 const error=make('p');error.setAttribute('role','alert');
 const actions=make('div');actions.className='editor-actions';
 const cancel=make('button','Cancel'),confirm=make('button','Close engagement');cancel.type=confirm.type='button';cancel.className='outline-button';confirm.className='coral-button';actions.append(cancel,confirm);
 dialog.append(heading,description,explanation,loading,error,actions);document.body.append(dialog);
 let current=null,busy=false,generation=0;
 cancel.onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 confirm.onclick=async()=>{
  if(busy||!current)return;const request=++generation,snapshot=current;busy=true;cancel.disabled=confirm.disabled=true;error.textContent='';
  const finish=showFlowLoading(loading,'Closing engagement…');
  try{await repository.close(snapshot.id,snapshot.status);if(request!==generation)return;await onClosed();if(request===generation)dialog.close();}
  catch(problem){if(request===generation)error.textContent=problem.message;}
  finally{finish();if(request===generation){busy=false;cancel.disabled=confirm.disabled=false;}}
 };
 return {open(engagement,clientName){if(busy)return;current={id:engagement.id,status:engagement.status};description.textContent=clientName+' — '+engagement.title;error.textContent='';dialog.showModal();cancel.focus();},clear(){generation++;current=null;busy=false;dialog.close();description.textContent='';error.textContent='';cancel.disabled=confirm.disabled=false;}};
}
