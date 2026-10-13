// Serial checks only; stops on failure or changed scope. No timer or automatic retries.
export async function collectBaseline(state,{run,load}){
 if(state.ready!==true)throw Error('Research is paused.');
 const remaining=state.baseline?.remaining;
 if(!Number.isInteger(remaining)||remaining<0||remaining>3)throw Error('Reload baseline progress first.');
 const id=state.clientId,version=state.settings?.version,url=state.settings?.urls?.[0];
 if(!id||!version||!url)throw Error('Save website settings first.');
 for(let i=0;i<Math.max(remaining,1);i++){
  await run(id,version);state=await load(id);
  if(state.clientId!==id||state.settings?.version!==version||state.settings?.urls?.[0]!==url)throw Error('Settings changed. Reload before continuing.');
  if(state.ready!==true||state.baseline?.remaining===0)break;
 }
 return state;
}
