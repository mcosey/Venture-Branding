import {XMLParser, XMLValidator} from 'fast-xml-parser';
export function serialNumber(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value.trim())) throw new Error('Enter the eight-digit USPTO application serial number.');
  return value.trim();
}
const labels = {'600':'Abandoned — incomplete response','601':'Abandoned — express','602':'Abandoned — failure to respond or late response','603':'Abandoned — after ex parte appeal','604':'Abandoned — after inter-partes decision','605':'Abandoned — after publication','606':'Abandoned — no statement of use filed','607':'Abandoned — defective statement of use','608':'Abandoned — after petition decision','609':'Abandoned — defective divided application','614':'Abandoned — petition to revive denied','618':'Abandoned file — backfile','700':'Registered','710':'Cancelled — Section 8','711':'Cancelled — Section 7'};
export function status(code) {
  if (['600','601','602','603','604','605','606','607','608','609','614','618','710','711'].includes(code)) return 'inactive';
  if (code === '700') return 'registered';
  if (['630','631','638','641','645','680','686','688'].includes(code)) return 'pending';
  return 'other'; // No assumptions from a registration number or an unfamiliar code.
}
function scalar(v){return typeof v === 'string' ? v.trim() : '';}
function date(v){
  const s=scalar(v);if(!s||/^0+$/.test(s))return null;
  // XML Schema dates may carry a timezone; retain the recorded calendar date.
  const iso=/^\d{8}$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}`:/^\d{4}-\d{2}-\d{2}(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$/.test(s)?s.slice(0,10):'';
  if(!iso||!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString().slice(0,10)!==iso)throw new Error('Invalid USPTO date.');return iso;
}
function st96Case(parsed){
  const m=parsed.TrademarkTransaction?.TrademarkTransactionBody?.TransactionContentBag?.TransactionData?.TrademarkBag?.Trademark;
  if(!m||Array.isArray(m))throw new Error('USPTO returned an unsupported record. Nothing was saved.');
  const word=m.MarkRepresentation?.MarkReproduction?.WordMarkSpecification;
  const applicants=m.ApplicantBag?.Applicant;
  const owners=(Array.isArray(applicants)?applicants:applicants?[applicants]:[]).map(a=>{
    const n=a.Contact?.Name;
    return {'party-name':scalar(n?.EntityName)||scalar(n?.OrganizationName?.OrganizationStandardName)};
  });
  // Historical and current names must agree. Differing owners require manual review.
  if(owners.some(o=>!o['party-name']))throw new Error('This record needs ownership review in TSDR before importing.');
  const reg=m.RegistrationNumber;
  return {'serial-number':m.ApplicationNumber?.ApplicationNumberText,'registration-number':typeof reg==='object'?reg?.RegistrationNumberText:reg,
    'case-file-header':{'mark-identification':word?.MarkVerbalElementText,'mark-drawing-code':m.MarkRepresentation?.MarkDescriptionBag?.NationalMarkDescription?.MarkFeatureCode,
      'status-code':m.MarkCurrentStatusCode,'filing-date':m.ApplicationDate,'registration-date':m.RegistrationDate,'status-date':m.MarkCurrentStatusDate},
    'case-file-owners':{'case-file-owner':owners}};
}
function findCases(value, results=[], depth=0){
  if(depth>40)throw new Error('Unsupported USPTO response.');
  if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
    if(key==='case-file')results.push(...(Array.isArray(child)?child:[child]));
    else findCases(child,results,depth+1);
  }return results;
}
export function parseRecord(xml, serial) {
  serialNumber(serial);
  if(typeof xml!=='string'||xml.length>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new Error('USPTO returned an unsupported record. Nothing was saved.');
  const parsed=new XMLParser({parseTagValue:false,ignoreAttributes:true,removeNSPrefix:true}).parse(xml);
  const cases=findCases(parsed);
  if(cases.length>1)throw new Error('USPTO returned multiple records. Nothing was saved.');
  const c=cases.length===1?cases[0]:st96Case(parsed), h=c['case-file-header'];
  if(!h||scalar(c['serial-number'])!==serial)throw new Error('USPTO record does not match the requested serial number.');
  const name=scalar(h['mark-identification']), code=scalar(h['status-code']);
  if(!name||name.length>200||!/^\d{3}$/.test(code))throw new Error('This record needs manual review in TSDR before importing.');
  const rawOwners=c['case-file-owners']?.['case-file-owner'];
  const owners=[...new Set((Array.isArray(rawOwners)?rawOwners:rawOwners?[rawOwners]:[]).map(o=>scalar(o['party-name'])).filter(Boolean))];
  if(owners.length!==1)throw new Error('This record has missing or multiple owner names. Review ownership in TSDR before importing.');
  const drawing=scalar(h['mark-drawing-code']);
  const reg=scalar(c['registration-number']);
  if(reg&&!/^\d{1,8}$/.test(reg))throw new Error('Unrecognized registration number.');
  return {name,mark_type:['1','4'].includes(drawing)?'word':['2','3','5'].includes(drawing)?'logo':null,
    status:status(code),uspto_status_text:scalar(h['status-description'])||scalar(h['status-text'])||`${code} — ${labels[code]||'See USPTO status details'}`,
    application_number:serial,registration_number:reg&&!/^0+$/.test(reg)?reg:null,record_owner:owners[0],
    filing_date:date(h['filing-date']),registration_date:date(h['registration-date']),uspto_status_date:date(h['status-date'])};
}
export async function fingerprint(record){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(record)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function fetchRecord(serial,key,fetcher=fetch){
  serialNumber(serial);
  const response=await fetcher(`https://tsdrapi.uspto.gov/ts/cd/casestatus/sn${serial}/info.xml`,{headers:{'USPTO-API-KEY':key,Accept:'application/xml'},signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!response.ok){await response.body?.cancel();throw new Error(response.status===429?'USPTO is busy. Please try again later.':response.status===404?'No USPTO record was found for this number.':'USPTO lookup is unavailable. Check the connection setup and try again.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty USPTO response.');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw new Error('USPTO record is too large to import.');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return parseRecord(new TextDecoder().decode(bytes),serial);
}
