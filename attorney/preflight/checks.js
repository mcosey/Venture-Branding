(function(root){
'use strict';
const version='prototype-2';
function check(d){
 const rows=[];
 const add=(id,title,status,detail,request='')=>rows.push({id,title,status,detail,request});
 const missing=(keys)=>keys.filter(k=>!String(d[k]||'').trim());
 if(d.register){
 const unsupported=[d.register!=='Principal Register',d.category!=='Trademark / service mark',d.ownerCount!=='One owner',!['Individual','Corporation','Limited liability company'].includes(d.entity),!['Word','Logo'].includes(d.format),!['Use in commerce','Intent to use'].includes(d.basis),d.classCount==='2'&&!['Use in commerce','Intent to use'].includes(d.basis2)].some(Boolean);
 add('supported','Supported application situation',unsupported?'BLOCKING ISSUE':'PASS',unsupported?'This situation is outside the supported sample workflow. Do not use its transfer guide.':'Supported sample: one individual, corporation, or LLC; conventional mark; Sections 1(a) / 1(b).');
 const required=['domicile','ownerEmail','attorney','attorneyAddress','attorneyEmail','barJurisdiction','barYear','correspondenceEmail','signer','signerCapacity','feeReview'];
 add('contacts','Contacts, declaration, and fee review',missing(required).length?'BLOCKING ISSUE':'PASS',missing(required).length?'Complete: '+missing(required).join(', '):'Fields present; attorney must confirm bar details, signer authority, and actual fees.');
 for(const k of ['translation','transliteration','consent','disclaimer','prior'])if(d[k+'Mode']==='Required'&&!String(d[k]||'').trim())add('statement-'+k,'Approved '+k+' statement','BLOCKING ISSUE','Provide the approved statement before transfer.');
 if(d.consentMode==='Required'&&!d.consentFile)add('consent-file','Consent document','BLOCKING ISSUE','Identify the approved consent document.');
 for(let i=1;i<=Number(d.classCount||1);i++){const suffix=i===1?'':String(i);
 if(d['entryMethod'+suffix]==='ID Manual'&&!d['idEntry'+suffix])add('id-'+i,'Class '+i+' ID Manual reference','BLOCKING ISSUE','Provide the approved entry or search reference.');
 if(d['basis'+suffix]==='Use in commerce'&&d['webSpecimen'+suffix]==='Yes'&&(!d['specimenUrl'+suffix]||!d['specimenDate'+suffix]))add('web-'+i,'Class '+i+' webpage evidence','BLOCKING ISSUE','Provide the webpage URL and access / print date.');
 }
 if(d.classCount==='2'){const second={};for(const k of ['goods','class','basis','firstUse','commerceUse','specimen'])second[k]=d[k+'2'];second.owner=d.owner;second.address=d.address;second.entity=d.entity;second.jurisdiction=d.jurisdiction;second.mark=d.mark;second.format='Word';for(const r of check(second).filter(r=>['scope','basis','evidence','dates'].includes(r.id)))rows.push({...r,id:r.id+'2',title:'Class 2: '+r.title});}
 }
 const owner=missing(['owner','address','entity','jurisdiction']);
 add('owner','Owner details',owner.length?'MISSING INFORMATION':'PASS',owner.length?'Complete the legal owner, address, entity type, and jurisdiction.':'Owner fields are present. This does not verify ownership.', 'Please confirm the legal owner name, address, entity type, and jurisdiction.');
 const mark=missing(['mark','format']);
 if(d.format==='Logo'&&!d.design)mark.push('design');
 if(d.format==='Logo'&&!d.description)mark.push('description');
 add('mark','Mark representation',mark.length?'MISSING INFORMATION':'PASS',mark.length?'Complete the wording or design reference and applicable description.':'Representation fields are present.');
 add('scope','Goods, services, and class',!d.goods||!/^\d{1,2}$/.test(d.class)||+d.class<1||+d.class>45?'BLOCKING ISSUE':'PASS','Provide goods/services and one class between 1 and 45. The attorney must review classification.');
 add('basis','Filing basis',d.basis?'PASS':'BLOCKING ISSUE',d.basis?'A basis is selected for this illustrative class.':'Select a filing basis.');
 if(d.basis==='Use in commerce'){
  add('evidence','Use dates and specimen',missing(['firstUse','commerceUse','specimen']).length?'MISSING INFORMATION':'PASS','For this sample use-based draft, provide both dates and a specimen reference.','Please confirm the first-use dates and identify the specimen you want the attorney to review.');
  const bad=Boolean(d.firstUse&&d.commerceUse&&d.firstUse>d.commerceUse);
  add('dates','Date consistency',bad?'BLOCKING ISSUE':'PASS',bad?'First use anywhere is later than first use in commerce. Correct the dates.':'No reversed date order detected.');
 }
 add('legal','Attorney review','REVIEW','Review the basis, goods/services, representation, translation, name/consent, disclaimer, and color claim. This prototype makes no legal determination.');
 add('support','Supporting information','REVIEW','Compare the draft with intake and supporting material, and confirm the scope and client instructions.');
 return rows;
}
function canReady(s){return Boolean(s.run&&s.run.revision===s.revision&&s.run.rows.every(r=>r.status==='PASS'||(r.status!=='BLOCKING ISSUE'&&s.decisions[r.id]&&s.decisions[r.id].reason.trim())));}
function edit(s){s.revision++;s.ready=false;s.decisions={};}
function run(s,d){s.ready=false;s.decisions={};s.run={revision:s.revision,version,input:JSON.parse(JSON.stringify(d)),rows:check(d)};s.history.push({type:'Check',revision:s.revision,version,input:JSON.parse(JSON.stringify(d)),rows:JSON.parse(JSON.stringify(s.run.rows)),time:new Date().toISOString()});}
root.Preflight={version,check,canReady,edit,run};
})(typeof window==='undefined'?globalThis:window);
