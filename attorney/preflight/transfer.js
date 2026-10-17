(function(root){
'use strict';
const fields=[['owner','Owner information','Legal name','Paste'],['address','Owner information','Address','Paste'],['entity','Owner information','Entity type','Select'],['jurisdiction','Owner information','Citizenship / formation jurisdiction','Paste'],['mark','Trademark details','Exact wording','Paste'],['format','Trademark details','Mark format','Select'],['design','Trademark details','Drawing reference','Upload'],['description','Trademark details','Mark description','Paste'],['color','Trademark details','Color claim','Review'],['goods','Goods and services','Identification','Paste'],['class','Goods and services','Class','Select'],['basis','Goods and services','Filing basis','Select'],['firstUse','Use information','First use anywhere','Enter'],['commerceUse','Use information','First use in commerce','Enter'],['specimen','Use information','Specimen reference','Upload'],['translation','Additional information','Translation','Review'],['consent','Additional information','Name / consent','Review'],['disclaimer','Additional information','Disclaimer','Review']];
function guide(d){
 const expanded=Boolean(d.register);
 let rows=fields.filter(([k])=>!(['firstUse','commerceUse','specimen'].includes(k)&&d.basis!=='Use in commerce')&&!(['design','description'].includes(k)&&d.format!=='Logo')).map(([key,section,label,action])=>({key,section,label,action,value:d[key]||'Not provided'}));
 if(!expanded)return rows;
 rows=rows.filter(r=>!['translation','consent','disclaimer'].includes(r.key));
 const row=(key,section,label,action='Paste',instruction='Confirm the value in the intended field. If the screen differs, pause and ask the attorney.')=>({key,section,label,action,value:d[key]||'Not provided',instruction});
 rows.unshift(...[['register','Register'],['category','Mark category']].map(([k,l])=>row(k,'Application choices',l,'Select')));
 rows.splice(6,0,...[['domicile','Domicile address'],['ownerEmail','Owner email']].map(([k,l])=>row(k,'Owner information',l,'Paste',k==='domicile'?'Use the dedicated domicile field. Do not substitute the public mailing-address field.':'Confirm the owner email.')));
 rows.push(...[['attorney','Attorney name'],['firm','Firm'],['attorneyAddress','Attorney address'],['attorneyEmail','Attorney email'],['barJurisdiction','Bar jurisdiction'],['barNumber','Bar number, if assigned'],['barYear','Year admitted'],['correspondenceEmail','Correspondence email']].map(([k,l])=>row(k,'Attorney and correspondence',l)));
 for(let i=1;i<=Number(d.classCount||1);i++){
  const suffix=i===1?'':String(i),section='Goods/services — Class '+i;
  if(i>1)for(const k of ['goods','class','basis','firstUse','commerceUse','specimen']){if(['firstUse','commerceUse','specimen'].includes(k)&&d['basis'+suffix]!=='Use in commerce')continue;rows.push(row(k+suffix,section,({goods:'Identification',class:'Class',basis:'Filing basis',firstUse:'First use anywhere',commerceUse:'First use in commerce',specimen:'Specimen reference'})[k],k==='specimen'?'Upload':['class','basis'].includes(k)?'Select':'Paste'));}
  const goods=rows.find(r=>r.key==='goods'+suffix);goods.section=section;goods.action=d['entryMethod'+suffix]==='ID Manual'?'Find':'Paste';goods.instruction=goods.action==='Find'?'Search the ID Manual using the approved reference: '+d['idEntry'+suffix]+'. Select the approved entry and fill only approved blanks. Do not paste it into the free-form box.':'Paste into the free-form identification field. Confirm additional fee categories before submission.';
  if(d['basis'+suffix]==='Use in commerce'){
   rows.push(row('specimenDescription'+suffix,section,'Specimen description'));
   if(d['webSpecimen'+suffix]==='Yes')rows.push(row('specimenUrl'+suffix,section,'Webpage URL'),row('specimenDate'+suffix,section,'Webpage access / print date','Enter'));
  }
 }
 for(const [key,label]of [['translation','Translation'],['transliteration','Transliteration'],['consent','Name / consent'],['disclaimer','Disclaimer'],['prior','Prior registrations']]){
  if(d[key+'Mode']==='Required')rows.push(row(key,'Additional statements',label,'Paste','Paste only the approved statement into its applicable field. Pause if the requested statement differs.'));
  else rows.push(row(key+'Mode','Additional statements',label,'Review','No statement approved for this item. Follow the attorney’s not-applicable determination; do not paste “Not applicable” into a statement field.'));
 }
 if(d.consentMode==='Required')rows.push(row('consentFile','Additional statements','Consent document','Upload'));
 rows.push(...[['signer','Intended signer'],['signerCapacity','Signer capacity'],['signatureMethod','Signing method'],['feeReview','Fee review']].map(([k,l])=>row(k,'Review, declaration, and fees',l,'Review','Attorney checkpoint. Review the actual declaration and fees. Do not enter another person’s signature or submit payment through this guide.')));
 const order=['Application choices','Owner information','Attorney and correspondence','Trademark details','Goods and services','Use information'];
 rows.sort((a,b)=>{const rank=r=>r.section.startsWith('Goods/services')?4:r.section==='Additional statements'?6:r.section==='Review, declaration, and fees'?7:order.indexOf(r.section);return rank(a)-rank(b);});
 for(const r of rows){
 const key=r.key.replace(/2$/, '');
 if(['class','basis','firstUse','commerceUse','specimen'].includes(key))r.section='Goods/services — Class '+(r.key.endsWith('2')?'2':'1');
 if(key==='firstUse'||key==='commerceUse')r.action='Enter';
 if(r.key==='address')r.label='Mailing address';
 if(r.key==='format'){r.value=d.format==='Word'?'Standard character':d.format==='Logo'?'Special form (stylized/design)':d.format;r.instruction='Choose the standard-character or stylized/design path approved by the attorney. Current exact option labels need confirmation.';}
 if(r.key==='basis'||r.key==='basis2')r.instruction=(r.value==='Use in commerce'?'Section 1(a): use in commerce.':'Section 1(b): intent to use.')+' Assign only to the approved goods/services in this class. Stop if the screen proposes a different scope.';
 if(r.key==='design')r.instruction='Use the attorney-approved drawing, separate from the specimen. Published guidance lists JPG, 5 MB or smaller, filename under 256 characters, and RGB for color drawings. Verify the actual upload control before use.';
 if(key==='specimen')r.instruction='Attach the approved use evidence for this class. Do not use the drawing as a substitute. Confirm file acceptance and review the uploaded preview; current control limits remain unverified.';
 if(r.key==='color')r.instruction=d.format==='Word'?'Standard-character sample: no special-form color claim. Confirm this follows the attorney-approved mark format.':'Confirm the approved color claim and that the description identifies color locations. Do not paste internal notes.';
 r.destinationStatus='Public guidance mapped; current field label unverified';
 r.previewStatus=['Upload','Review'].includes(r.action)?'Manual inspection required':'Preview coverage needs representative-draft testing';
 }
 rows.sort((a,b)=>{const rank=r=>r.section.startsWith('Goods/services')?4:r.section==='Additional statements'?6:r.section==='Review, declaration, and fees'?7:order.indexOf(r.section);const diff=rank(a)-rank(b);if(diff)return diff;if(a.section.startsWith('Goods/services')&&b.section.startsWith('Goods/services'))return Number(a.key.endsWith('2'))-Number(b.key.endsWith('2'));return 0;});return rows;
}
root.Transfer={guide};
})(typeof window==='undefined'?globalThis:window);
