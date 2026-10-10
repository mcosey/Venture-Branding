import {requireAccess} from './connection.mjs';
export const bcmCategories={product_names:'Product names',feature_names:'Feature names',slogans:'Slogans and taglines',logos:'Logos',sub_brands:'Sub-brands',renames:'Renamed products or features',presentation:'Changes to existing branding'};
export function bcmValues(draft,authorized){
 if(authorized!==true)throw new Error('Confirm that you have permission to monitor these pages.');
 const lines=value=>String(value||'').split('\n').map(s=>s.trim()).filter(Boolean);
 const urls=lines(draft.urls),exclusions=lines(draft.exclude);
 if(urls.length<1||urls.length>20)throw new Error('Enter between 1 and 20 page URLs.');
 for(const value of urls){
  if(value.length>2048||!/^https:\/\/[A-Za-z0-9.-]+(:443)?(\/[^\s?#@]*)?$/.test(value))throw new Error('Use complete public HTTPS page URLs without credentials, query strings, fragments, or custom ports.');
  try{const parsed=new URL(value);if(!parsed.hostname.includes('.')||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname)||/(^|\.)(localhost|local|internal|test|invalid|example|lan|home\.arpa)$/i.test(parsed.hostname))throw new Error();}catch{throw new Error('Enter a valid public HTTPS website URL.');}
 }
 if(new Set(urls.map(value=>new URL(value).href)).size!==urls.length)throw new Error('Remove duplicate page URLs.');
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
export function findBcmCandidates(baseline,current){
 const changes=compareBcmSnapshots(baseline,current),candidates=[],seen=new Set();
 const normalize=value=>String(value||'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const noise=/\b(cookie|privacy policy|terms of (?:use|service)|all rights reserved|copyright|subscribe|contact us|sign in|log in|log out|checkout)\b/i;
 const stripQuotes=value=>String(value||'').replace(/^[“"']|[”"']$/g,'').trim();
 const termFrom=(line,pattern,requireCapitalized=true)=>{const match=line.match(pattern);const quoted=match?.[1],plain=match?.[2];const term=stripQuotes(quoted||plain);if(!term||(requireCapitalized&&!quoted&&!/^\p{Lu}/u.test(term))||new Set(['product','feature','tool','platform','service','sub brand','new','our','the']).has(normalize(term)))return null;return term;};
 function add(type,title,line,term,reason){const key=type+'|'+normalize(term);if(seen.has(key))return;seen.add(key);candidates.push({type,title,term,excerpt:line,reason});}
 const termPatterns={
  rename:/\b(?:renamed\s+(?:to|as)|now\s+(?:called|known\s+as)|rebranded\s+as|formerly\s+(?:called|known\s+as))\s+(?:our\s+)?(?:[“"']([^”"']{2,70})[”"']|([\p{L}\p{N}'’&-]+(?:\s+[\p{L}\p{N}'’&-]+){0,2})\b)/iu,
  product:/\b(?:(?:introducing|meet|launching|launched|launch of)\s+(?:(?:our|the)\s+)?(?:new\s+)?|(?:new\s+)?(?:product|feature|tool|platform|service|sub[- ]brand)\s+(?:(?:called|named|is)\s+|[:—-]\s*)?)(?:[“"']([^”"']{2,70})[”"']|([\p{L}\p{N}'’&-]+(?:\s+[\p{L}\p{N}'’&-]+){0,2})\b)/iu,
  slogan:/\b(?:new\s+)?(?:tagline|tag\s+line|slogan)(?:(?:\s+(?:is|reads|says))?\s*[:=—-]\s*|\s+(?:is|reads|says)\s+)[“"']?([^”"'“\n.!?;]{3,80})/i,
  presentation:/\b(?:new logo|updated logo|redesigned logo|new brand identity|brand refresh|rebrand(?:ed|ing)?)\b/i
 };
 for(const line of changes.added){
  if(noise.test(line))continue;
  const rename=termFrom(line,termPatterns.rename),product=termFrom(line,termPatterns.product),slogan=termFrom(line,termPatterns.slogan,false);
  if(rename)add('rename','Possible name change',line,rename,'The new text explicitly says a name changed.');
  else if(slogan)add('slogan','Possible new slogan or tagline',line,slogan,'The new text labels this wording as a slogan or tagline.');
  else if(product)add('product','Possible new product or feature name',line,product,'The new text explicitly introduces or names a product or feature.');
  else if(termPatterns.presentation.test(line))add('presentation','Possible brand identity change',line,'Brand identity change','The new text explicitly mentions a rebrand, brand refresh, or logo change.');
 }
 return candidates;
}
export async function createBcmBaseline(db,clientId,version,action='baseline'){
 await requireAccess(db,'client');
 const {data,error}=await db.functions.invoke('bcm-scan',{body:{clientId,version,action}});
 if(error||data?.status!=='completed')throw new Error(data?.error||(action==='comparison'?'Comparison scan could not complete. Refresh scan history before retrying.':'Baseline could not complete. Refresh scan history before retrying.'));return data;
}
