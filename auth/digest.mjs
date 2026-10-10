import {requireAccess} from './connection.mjs';
export const digestCategories={bcm:'BCM comparisons ready to review',use_history:'New Use History uploads',maintenance:'Published maintenance dates due in the next 30 days'};
export function digestValues(input){
 const categories=input.categories;
 if(!Array.isArray(categories)||!categories.length||categories.length>3||new Set(categories).size!==categories.length||categories.some(k=>!Object.hasOwn(digestCategories,k)))throw new Error('Choose at least one available result type.');
 if(!['daily','weekly','monthly'].includes(input.frequency)||input.delivery!=='account')throw new Error('Choose a frequency and VB account delivery. Email is not connected yet.');
 return {categories:[...categories],frequency:input.frequency,delivery:'account'};
}
export function createDigestRepository(db,{enabled=globalThis.VB_DIGEST_ENABLED===true}={}){
 if(!enabled)return null;let generation=0;
 async function access(){const ticket=generation;await requireAccess(db,'client');check(ticket);return ticket;}
 function check(ticket){if(ticket!==generation)throw new Error('This inbox session has ended.');}
 function fail(error){return new Error(error?.code==='40001'?'Preferences changed. Reload this page and try again.':'Unable to load or save the digest. Please try again.');}
 async function rpc(name,args){const ticket=await access();const result=await db.rpc(name,args);check(ticket);if(result.error)throw fail(result.error);return result.data;}
 return {
 async preferences(client){const ticket=await access();const result=await db.from('vb_digest_preferences').select('client_id,categories,frequency,delivery,version,next_due_at').eq('client_id',client).maybeSingle();check(ticket);if(result.error)throw fail(result.error);if(result.data&&result.data.client_id!==client)throw new Error('Preferences unavailable.');return result.data;},
 save(client,version,input){const details=digestValues(input);return rpc('vb_save_digest_preferences',{target_client:client,expected_version:version,details});},
 sample(client,version){return rpc('vb_generate_digest_sample',{target_client:client,expected_version:version});},
 async inbox(client){const ticket=await access();const result=await db.from('vb_inbox').select('id,client_id,created_at,read_at,frequency,kind').eq('client_id',client).order('created_at',{ascending:false}).limit(50);check(ticket);if(result.error)throw fail(result.error);return result.data.filter(row=>row.client_id===client);},
 async open(client,id){const data=await rpc('vb_open_inbox',{target_client:client,target_message:id});if(data.client_id!==client||data.id!==id)throw new Error('Message unavailable.');return data;},
 clear(){generation++;}
 };
}
