import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecord,serialNumber,fetchRecord,fingerprint} from '../supabase/functions/uspto-lookup/record.mjs';
import {createHandler} from '../supabase/functions/uspto-lookup/handler.mjs';
// Synthetic records only. Never presented in or saved by the live portal.
const xml=(code='602',owner='Example LLC')=>`<trademark-applications-daily><case-file><serial-number>01234567</serial-number><registration-number>0000000</registration-number><case-file-header><mark-identification>EXAMPLE &amp; CO</mark-identification><mark-drawing-code>4</mark-drawing-code><status-code>${code}</status-code><filing-date>20200101</filing-date><registration-date>00000000</registration-date><status-date>20210304</status-date></case-file-header><case-file-owners><case-file-owner><party-name>${owner}</party-name></case-file-owner></case-file-owners></case-file></trademark-applications-daily>`;
test('abandoned record is inactive, identifiers retain zeros, missing registration stays null',()=>{
 const r=parseRecord(xml(),'01234567');assert.equal(r.status,'inactive');assert.match(r.uspto_status_text,/Abandoned/);assert.equal(r.application_number,'01234567');assert.equal(r.registration_number,null);assert.equal(r.registration_date,null);assert.equal(r.name,'EXAMPLE & CO');assert.equal(r.mark_type,'word');assert.equal(r.filing_date,'2020-01-01');
});
test('unknown status never implies registered, despite a registration number',()=>{const r=parseRecord(xml('999').replace('0000000','1234567'),'01234567');assert.equal(r.status,'other');assert.match(r.uspto_status_text,/999/);});
test('rejects malformed, mismatched, missing owner, DTD and oversized responses',()=>{
 for(const source of ['<html>not a case</html>',xml().replace('01234567','99999999'),xml('602',''),'<!DOCTYPE test>'+xml(),'<case-file>','x'.repeat(2000001)])assert.throws(()=>parseRecord(source,'01234567'));
});
test('multiple owners and invalid dates require review instead of a guess',()=>{
 assert.throws(()=>parseRecord(xml().replace('</case-file-owners>','<case-file-owner><party-name>Other LLC</party-name></case-file-owner></case-file-owners>'),'01234567'));
 assert.throws(()=>parseRecord(xml().replace('20200101','20200231'),'01234567'));
});
test('serial validation rejects URLs, prefixes and registration numbers',()=>{for(const v of ['https://example.com','sn12345678','1234567',null])assert.throws(()=>serialNumber(v));});
test('fetch uses fixed official URL and secret header; upstream errors do not expose key',async()=>{
 let options;const r=await fetchRecord('01234567','test-secret',async(url,opts)=>{assert.equal(url,'https://tsdrapi.uspto.gov/ts/cd/casestatus/sn01234567/info.xml');options=opts;return new Response(xml());});assert.equal(r.name,'EXAMPLE & CO');assert.equal(options.headers['USPTO-API-KEY'],'test-secret');assert.equal(options.redirect,'error');
 await assert.rejects(fetchRecord('01234567','test-secret',async()=>new Response('secret error',{status:429})),/busy/);
});
function harness(role='staff',record=parseRecord(xml(),'01234567')){
 let fetches=0,saves=0;const db={auth:{getUser:async()=>({data:{user:{id:'test-user'}}})},rpc:async name=>name==='vb_session_role'?{data:role}:(saves++,{data:'saved-id'}),from:()=>({select(){return this;},eq(){return this;},is(){return this;},async single(){return {data:{id:'client',updated_at:'2026-10-04T00:00:00Z'}};}})};
 const handler=createHandler({createClient:()=>db,env:key=>key==='USPTO_API_KEY'?'test-key':'test',fetchRecord:async()=>{fetches++;return record;}});
 return {handler,counts:()=>({fetches,saves})};
}
const input={action:'preview',serial:'01234567',clientId:'10000000-0000-0000-0000-000000000001',markId:'20000000-0000-0000-0000-000000000001',expectedUpdatedAt:'2026-10-04T00:00:00Z'};
const request=(body,auth=true)=>new Request('https://local.test',{method:'POST',headers:auth?{Authorization:'Bearer test'}:{},body:JSON.stringify(body)});
test('unauthenticated and client-role callers never reach USPTO or save',async()=>{for(const role of ['client','denied']){const h=harness(role);assert.equal((await h.handler(request(input))).status,403);assert.deepEqual(h.counts(),{fetches:0,saves:0});}const h=harness();assert.equal((await h.handler(request(input,false))).status,401);});
test('preview is read-only, save refetches and rejects changed or unconfirmed data',async()=>{
 const h=harness();const preview=await (await h.handler(request(input))).json();assert.deepEqual(h.counts(),{fetches:1,saves:0});
 assert.equal((await h.handler(request({...input,action:'save',confirmOwner:true,fingerprint:'tampered'}))).status,409);
 assert.equal((await h.handler(request({...input,action:'save',confirmOwner:false,fingerprint:preview.fingerprint}))).status,409);
 const response=await h.handler(request({...input,action:'save',confirmOwner:true,fingerprint:preview.fingerprint,record:{name:'FORGED'}}));assert.equal(response.status,200);assert.equal(h.counts().saves,1);
});
test('stale mark never fetches or saves',async()=>{const h=harness();assert.equal((await h.handler(request({...input,expectedUpdatedAt:'old'}))).status,409);assert.deepEqual(h.counts(),{fetches:0,saves:0});});
test('fingerprint changes when official data changes',async()=>{assert.notEqual(await fingerprint(parseRecord(xml(),'01234567')),await fingerprint(parseRecord(xml('700'),'01234567')));});
const st96=(secondOwner='Example LLC')=>`<tmk:TrademarkTransaction xmlns:tmk="urn:example"><TrademarkTransactionBody><TransactionContentBag><TransactionData><TrademarkBag><Trademark><ApplicationNumber><IPOfficeCode>US</IPOfficeCode><ApplicationNumberText>01234567</ApplicationNumberText></ApplicationNumber><ApplicationDate>2020-05-01-04:00</ApplicationDate><MarkCurrentStatusCode>606</MarkCurrentStatusCode><MarkCurrentStatusDate>2023-11-27</MarkCurrentStatusDate><MarkRepresentation><MarkReproduction><WordMarkSpecification><MarkVerbalElementText>EXAMPLE</MarkVerbalElementText></WordMarkSpecification></MarkReproduction><MarkDescriptionBag><NationalMarkDescription><MarkFeatureCode>4</MarkFeatureCode></NationalMarkDescription></MarkDescriptionBag></MarkRepresentation><ApplicantBag><Applicant><Version><CommentText>OWNER AT PUBLICATION</CommentText></Version><Contact><Name><EntityName>Example LLC</EntityName></Name></Contact></Applicant><Applicant><CommentText>ORIGINAL APPLICANT</CommentText><Contact><Name><EntityName>${secondOwner}</EntityName></Name></Contact></Applicant></ApplicantBag></Trademark></TrademarkBag></TransactionData></TransactionContentBag></TrademarkTransactionBody></tmk:TrademarkTransaction>`;
test('ST96 response retains calendar date, deduplicates owners and maps abandoned word mark',()=>{
 const r=parseRecord(st96(),'01234567');assert.equal(r.name,'EXAMPLE');assert.equal(r.record_owner,'Example LLC');assert.equal(r.filing_date,'2020-05-01');assert.equal(r.uspto_status_date,'2023-11-27');assert.equal(r.mark_type,'word');assert.equal(r.status,'inactive');assert.equal(r.registration_number,null);
});
test('ST96 rejects changed owners, mismatched identifiers and invalid dates',()=>{
 for(const source of [st96('Other LLC'),st96().replace('01234567','99999999'),st96().replace('2020-05-01-04:00','2020-02-31Z')])assert.throws(()=>parseRecord(source,'01234567'));
});
