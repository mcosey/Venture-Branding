import {requireAccess} from './connection.mjs?v=20261018-record-pages';
import {createDiagnostics,databaseCategory} from '../shared/diagnostics.mjs';
export const digestCategories={bcm:'BCM comparisons ready to review',use_history:'New Use History uploads',maintenance:'Published maintenance dates due in the next 30 days'};
export function digestValues(input){
 const categories=input.categories;
 if(!Array.isArray(categories)||!categories.length||categories.length>3||new Set(categories).size!==categories.length||categories.some(k=>!Object.hasOwn(digestCategories,k)))throw new Error('Choose at least one available result type.');
 if(!['daily','weekly','monthly'].includes(input.frequency)||input.delivery!=='account')throw new Error('Choose a frequency and VB account delivery. Email is not connected yet.');
 return {categories:[...categories],frequency:input.frequency,delivery:'account'};
}
export function createDigestRepository(db,{enabled=globalThis.VB_DIGEST_ENABLED===true,diagnostics}={}){
 if(!enabled)return null;let generation=0;
 async function access(){const ticket=generation;await requireAccess(db,'client');check(ticket);return ticket;}
 function check(ticket){if(ticket!==generation)throw new Error('This inbox session has ended.');}
 function fail(error,diagnostic,stage){const message=error?.code==='40001'?'Preferences changed. Reload this page and try again.':'Unable to load or save the digest. Please try again.';return error?.code==='22023'?new Error(message):diagnostic.error(stage,message,databaseCategory(error?.code));}
 async function request(stage,action){
  const ticket=await access(),diagnostic=createDiagnostics('digest',diagnostics);let result;
  try{result=await action();}catch{check(ticket);throw fail(null,diagnostic,stage);}
  check(ticket);if(result.error)throw fail(result.error,diagnostic,stage);return {data:result.data,diagnostic};
 }
 async function rpc(stage,name,args){return (await request(stage,()=>db.rpc(name,args))).data;}
 return {
 async preferences(client){const {data,diagnostic}=await request('preferences_load',()=>db.from('vb_digest_preferences').select('client_id,categories,frequency,delivery,version,next_due_at').eq('client_id',client).maybeSingle());if(data&&data.client_id!==client)throw diagnostic.error('preferences_load','Preferences unavailable.','invalid_response');return data;},
 save(client,version,input){const details=digestValues(input);return rpc('preferences_save','vb_save_digest_preferences',{target_client:client,expected_version:version,details});},
 sample(client,version){return rpc('sample','vb_generate_digest_sample',{target_client:client,expected_version:version});},
 async inbox(client){const {data,diagnostic}=await request('inbox_load',()=>db.from('vb_inbox').select('id,client_id,created_at,read_at,frequency,kind').eq('client_id',client).order('created_at',{ascending:false}).limit(50));if(!Array.isArray(data))throw diagnostic.error('inbox_load','Unable to load the inbox. Please try again.','invalid_response');return data.filter(row=>row.client_id===client);},
 async open(client,id){const {data,diagnostic}=await request('message_open',()=>db.rpc('vb_open_inbox',{target_client:client,target_message:id}));if(data?.client_id!==client||data?.id!==id)throw diagnostic.error('message_open','Message unavailable.','invalid_response');return data;},
 clear(){generation++;}
 };
}
