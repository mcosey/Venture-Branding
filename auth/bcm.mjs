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
export function findBcmCandidates(baseline,current){
 const changes=compareBcmSnapshots(baseline,current),candidates=[],seen=new Set();
 const normalize=value=>String(value||'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const noise=/\b(cookie|privacy policy|terms of (?:use|service)|all rights reserved|copyright|subscribe|contact us|sign in|log in|log out|checkout)\b/i;
 const genericHeadings=new Set(['home','about us','our services','our products','products and services','features','pricing','contact','contact us','learn more','get started','frequently asked questions','faq']);
 const phrase=(line,pattern)=>{const match=line.match(pattern);return match?.[1]?.replace(/^[“"']|[”"']$/g,'').trim()||line.slice(0,120);};
 function add(type,title,line,reason){const key=type+'|'+normalize(line);if(seen.has(key))return;seen.add(key);candidates.push({type,title,term:title==='Possible new brand wording'?line.slice(0,120):phrase(line,termPatterns[type]||/$^/),excerpt:line,reason});}
 const termPatterns={
  rename:/\b(?:renamed\s+(?:to|as)|now called|now known as|rebranded as|formerly\s+)(?:our\s+)?([“"']?[^,.;:!?]{2,70})/i,
  product:/\b(?:(?:introducing|meet|launching|launched|launch of)\s+(?:(?:our|the)\s+)?(?:new\s+)?|(?:new\s+)?(?:product|feature|tool|platform|service|sub[- ]brand)\s+(?:called|named|is)\s+|(?:product|feature|tool|platform|service)\s+(?:called|named)\s+)([A-Z][\p{L}\p{N}'’&-]*(?:\s+[A-Z][\p{L}\p{N}'’&-]*){0,2})/iu,
  slogan:/\b(?:new\s+)?(?:tagline|tag line|slogan)(?:\s+is)?\s*[:=]?\s*[“"']?([^”"'.,;!?]{3,80})/i,
  presentation:/\b(?:new logo|updated logo|redesigned logo|new brand identity|brand refresh|rebrand(?:ed|ing)?)\b/i
 };
 for(const line of changes.added){
  if(noise.test(line))continue;
  if(/\b(?:renamed\s+(?:to|as)|now called|now known as|rebranded as|formerly\s+)\b/i.test(line))add('rename','Possible name change',line,'The new text includes wording that may indicate a name change.');
  else if(/\b(?:tagline|tag line|slogan)\b/i.test(line))add('slogan','Possible new slogan or tagline',line,'The new text describes wording as a slogan or tagline.');
  else if(/\b(?:introducing|meet|launching|launch of|new\s+(?:product|feature|tool|platform|service|sub[- ]brand)|(?:product|feature|tool|platform|service)\s+(?:called|named))\b/i.test(line))add('product','Possible new product or feature name',line,'The new text uses product, feature, or launch language.');
  else if(/\b(?:new logo|updated logo|redesigned logo|new brand identity|brand refresh|rebrand(?:ed|ing)?)\b/i.test(line))add('presentation','Possible branding presentation change',line,'The new text refers to a branding or logo change.');
 }
 const oldHeadings=new Set((baseline?.headings||[]).map(normalize));
 for(const heading of current?.headings||[]){
  const words=heading.trim().split(/\s+/).length,norm=normalize(heading);
  if(oldHeadings.has(norm)||genericHeadings.has(norm)||words<2||words>9||noise.test(heading))continue;
  if(!changes.added.some(line=>normalize(line).includes(norm)))continue;
  if(candidates.some(candidate=>normalize(candidate.excerpt).includes(norm)))continue;
  add('heading','Possible new prominent brand wording',heading,'A new short page heading appeared; it could be a product name or slogan.');
 }
 return candidates;
}
export async function createBcmBaseline(db,clientId,version,action='baseline'){
 await requireAccess(db,'client');
 const {data,error}=await db.functions.invoke('bcm-scan',{body:{clientId,version,action}});
 if(error||data?.status!=='completed')throw new Error(data?.error||(action==='comparison'?'Comparison scan could not complete. Refresh scan history before retrying.':'Baseline could not complete. Refresh scan history before retrying.'));return data;
}
