import {requireAccess} from './connection.mjs';
export const bcmCategories={product_names:'Product names',feature_names:'Feature names',slogans:'Slogans and taglines',logos:'Logos',sub_brands:'Sub-brands',renames:'Renamed products or features',presentation:'Changes to existing branding'};
export function bcmValues(draft,authorized){
 if(authorized!==true)throw new Error('Confirm that you have permission to monitor these pages.');
 const lines=value=>String(value||'').split('\n').map(s=>s.trim()).filter(Boolean);
 const urls=lines(draft.urls),exclusions=lines(draft.exclude);
 if(urls.length<1||urls.length>20)throw new Error('Enter between 1 and 20 page URLs.');
 for(const value of urls){
  if(value.length>2048||!/^https?:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?(\/[^\s?#@]*)?$/.test(value))throw new Error('Use complete public page URLs without credentials, query strings, or fragments.');
  try{new URL(value);}catch{throw new Error('Enter a valid website URL.');}
 }
 if(new Set(urls).size!==urls.length)throw new Error('Remove duplicate page URLs.');
 if(exclusions.length>50||exclusions.some(s=>s.length>512||!/^\/[^\s?#]*$/.test(s)))throw new Error('Use up to 50 excluded paths beginning with /, without query strings or fragments.');
 if(!['public','account'].includes(draft.access)||!['Weekly','Monthly'].includes(draft.frequency))throw new Error('Choose valid access and frequency options.');
 const selected=draft.categories;
 if(!Array.isArray(selected)||!selected.length||selected.length>7||new Set(selected).size!==selected.length||selected.some(k=>!Object.hasOwn(bcmCategories,k)))throw new Error('Choose at least one valid change type.');
 return {urls,exclusions,access_mode:draft.access,frequency:draft.frequency.toLowerCase(),categories:[...selected]};
}
function failure(error){return new Error(error?.code==='40001'?'Settings changed elsewhere. Reload saved settings before trying again.':error?.code==='42501'?'Your access to this client is unavailable.':['42P01','42883','PGRST202','PGRST205'].includes(error?.code)?'Saved settings are not available yet. Database setup is pending.':'Settings could not be loaded or saved. Please try again.');}
export async function loadBcmSettings(db,clientId){
 await requireAccess(db,'client');
 const {data,error}=await db.from('vb_bcm_settings').select('*').eq('client_id',clientId).maybeSingle();
 if(error)throw failure(error);return data;
}
export async function saveBcmSettings(db,clientId,version,draft,authorized){
 const details=bcmValues(draft,authorized);
 if(!Number.isInteger(version)||version<0)throw new Error('Reload saved settings before saving.');
 await requireAccess(db,'client');
 const {data,error}=await db.rpc('vb_save_bcm_settings',{target_client:clientId,expected_version:version,details,authorized:true});
 if(error)throw failure(error);return data;
}
export async function loadBcmScans(db,clientId){
 await requireAccess(db,'client');
 const {data,error}=await db.from('vb_bcm_scans').select('*').eq('client_id',clientId).order('started_at',{ascending:false}).limit(10);
 if(error)throw new Error('Baseline scanning is not connected yet.');return data;
}
export function compareBcmSnapshots(baseline,current){
 const split=value=>String(value||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9“\"'])|(?<=\s)(?=Relaunching|There is|Email address|We'll|Today's|Build a calmer)/).map(x=>x.trim()).filter(x=>x.length>=8);
 const normalize=value=>value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const before=split(baseline?.text),after=split(current?.text),old=new Set(before.map(normalize)),fresh=new Set(after.map(normalize));
 return {added:after.filter(line=>!old.has(normalize(line))),removed:before.filter(line=>!fresh.has(normalize(line)))};
}
export async function createBcmBaseline(db,clientId,version,action='baseline'){
 await requireAccess(db,'client');
 const {data,error}=await db.functions.invoke('bcm-scan',{body:{clientId,version,action}});
 if(error||data?.status!=='completed')throw new Error(data?.error||(action==='comparison'?'Comparison scan could not complete. Refresh scan history before retrying.':'Baseline could not complete. Refresh scan history before retrying.'));return data;
}
