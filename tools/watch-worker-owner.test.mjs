import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWatchHandler} from '../supabase/functions/watch-ingest/handler.mjs';
const key='x'.repeat(40);
const record={serial:'01234567',name:'EXAMPLE',filing_date:'2026-10-11',status_code:'630',goods:[],classes:[],owners:[]};
function setup(){const calls=[];return {calls,run:createWatchHandler({env:k=>({WATCH_RELEASE_ENABLED:'true',WATCH_INGEST_KEY:key,SUPABASE_URL:'https://imvkhicfmidzbzsbhkzs.supabase.co'}[k]||'mock'),createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{complete:true}};}})})};}
const req=records=>new Request('https://example.test',{method:'POST',headers:{'x-watch-ingest-key':key},body:JSON.stringify({action:'batch',file_id:'11111111-1111-4111-8111-111111111111',number:0,records})});
test('owner names through the boundary are retained without truncation',async()=>{for(const owner of ['O'.repeat(501),'O'.repeat(590),'O'.repeat(4096),'😀'.repeat(2048)]){const h=setup(),r={...record,owners:[owner]};assert.equal((await h.run(req([r]))).status,200);assert.deepEqual(h.calls[0].args.details.records,[r]);}});
test('owner names above the UTF-16 boundary reject the whole batch',async()=>{for(const owner of ['O'.repeat(4097),'😀'.repeat(2049)]){const h=setup();assert.equal((await h.run(req([record,{...record,owners:[owner]}]))).status,400);assert.equal(h.calls.length,0);}});
test('both observed official owner names survive unchanged',async()=>{for(const serial of ['50137208','50137295']){const r=JSON.parse(await readFile(new URL('./watch/fixtures/september-30-owner-'+serial+'.json',import.meta.url),'utf8')),h=setup();assert.equal(r.owners[0].length,590);assert.equal((await h.run(req([r]))).status,200);assert.deepEqual(h.calls[0].args.details.records,[r]);}});
