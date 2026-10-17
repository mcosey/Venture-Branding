// Temporary workflow model only. No database, storage, or network operations.
const fields=['description','windowStart','windowEnd','deadline','nextStep','status','source'];
const statuses=['Upcoming','Needs attention','Completed'];
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function validateMaintenanceDraft(input){
 const data=Object.fromEntries(fields.map(key=>[key,String(input[key]||'').trim()]));
 if(!data.description||!data.nextStep||!data.source)throw new Error('Enter a filing description, client next step, and verification source.');
 if(data.description.length>200||data.nextStep.length>2000||data.source.length>2000)throw new Error('Please shorten the description or notes.');
 if(![data.windowStart,data.windowEnd,data.deadline].every(validDate))throw new Error('Enter three valid dates.');
 if(data.windowStart>data.windowEnd)throw new Error('The filing window must open before it closes.');
 if(!statuses.includes(data.status))throw new Error('Choose one of the listed statuses.');
 return data;
}
export function createMaintenancePreviewStore(){
 const records=new Map();let sequence=0;
 const key=context=>{if(!context?.clientId||!context?.markId)throw new Error('Select a client and trademark first.');return JSON.stringify([context.clientId,context.markId]);};
 const bucket=context=>{const id=key(context);if(!records.has(id))records.set(id,[]);return records.get(id);};
 const clone=value=>value?JSON.parse(JSON.stringify(value)):null;
 return {
  list(context){return clone(bucket(context));},
  save(context,id,input){const data=validateMaintenanceDraft(input),items=bucket(context);let record=id?items.find(item=>item.id===id):null;if(id&&!record)throw new Error('This draft is not available for the selected mark.');if(!record){record={id:'preview-'+(++sequence),revision:0,published:null};items.push(record);}record.draft=data;record.revision++;return clone(record);},
  publish(context,id,verified,now=new Date().toISOString()){const record=bucket(context).find(item=>item.id===id);if(!record)throw new Error('Save the draft before previewing publication.');if(!verified)throw new Error('Confirm that you verified these example dates.');record.published={...record.draft,revision:record.revision,verifiedAt:now};return clone(record);},
  clientView(context,id){const record=bucket(context).find(item=>item.id===id);if(!record?.published)return null;const {description,windowStart,windowEnd,deadline,nextStep,status,verifiedAt}=record.published;return {description,windowStart,windowEnd,deadline,nextStep,status,verifiedAt};},
  clear(){records.clear();sequence=0;}
 };
}
