import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWatchHandler} from '../supabase/functions/watch-ingest/handler.mjs';
const key='x'.repeat(40);
const record={serial:'01234567',name:'EXAMPLE',filing_date:'2026-10-11',status_code:'630',goods:[],classes:[],owners:[]};
function setup(){const calls=[];return {calls,run:createWatchHandler({env:k=>({WATCH_RELEASE_ENABLED:'true',WATCH_INGEST_KEY:key,SUPABASE_URL:'https://imvkhicfmidzbzsbhkzs.supabase.co'}[k]||'mock'),createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{complete:true}};}})})};}
const req=records=>new Request('https://example.test',{method:'POST',headers:{'x-watch-ingest-key':key},body:JSON.stringify({action:'batch',file_id:'11111111-1111-4111-8111-111111111111',number:0,records})});
test('names through the new boundary reach storage without truncation',async()=>{for(const size of [2001,2026,4096]){const h=setup(),r={...record,name:'N'.repeat(size)};assert.equal((await h.run(req([r]))).status,200);assert.deepEqual(h.calls[0].args.details.records,[r]);}});
test('oversized or blank names reject the batch without storage calls',async()=>{for(const name of ['N'.repeat(4097),'   ']){const h=setup();assert.equal((await h.run(req([record,{...record,name}]))).status,400);assert.equal(h.calls.length,0);}});
test('observed official record is accepted and retained exactly',async()=>{const r=JSON.parse(await readFile(new URL('./watch/fixtures/september-28-record.json',import.meta.url),'utf8')),h=setup();assert.equal(r.serial,'50133548');assert.equal(r.name.length,2026);assert.equal((await h.run(req([r]))).status,200);assert.deepEqual(h.calls[0].args.details.records,[r]);});
