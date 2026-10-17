import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWatchHandler} from '../supabase/functions/watch-ingest/handler.mjs';
const key='x'.repeat(40),file='11111111-1111-4111-8111-111111111111';
const record={serial:'01234567',name:'EXAMPLE',filing_date:'2026-10-11',status_code:'630',goods:[{class:'041',text:'Education'}],classes:['41'],owners:['Example LLC']};
function setup(overrides={}){const calls=[];return {calls,run:createWatchHandler({env:k=>({WATCH_RELEASE_ENABLED:'true',WATCH_INGEST_KEY:key,SUPABASE_URL:'https://imvkhicfmidzbzsbhkzs.supabase.co',...overrides}[k]||'mock'),createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{complete:true}};}})})};}
const batch=records=>({action:'batch',file_id:file,number:0,records});
const req=(body,secret=key)=>new Request('https://example.test',{method:'POST',headers:{'x-watch-ingest-key':secret},body:JSON.stringify(body)});
test('long descriptions through the new boundary are preserved exactly',async()=>{for(const size of [65537,333315,524288]){const h=setup(),r={...record,goods:[{class:'041',text:'x'.repeat(size)}]};assert.equal((await h.run(req(batch([r])))).status,200);assert.deepEqual(h.calls[0].args.details.records,[r]);}});
test('description over new boundary is rejected without database calls',async()=>{const h=setup();assert.equal((await h.run(req(batch([{...record,goods:[{class:'041',text:'x'.repeat(524289)}]}])))).status,400);assert.equal(h.calls.length,0);});
test('real September 11 evidence fits and is retained without truncation',async()=>{const r=JSON.parse(await readFile(new URL('./watch/fixtures/september-11-record.json',import.meta.url),'utf8')),h=setup();assert.equal(r.serial,'50103388');assert.deepEqual(r.goods.map(g=>g.text.length),[191004,333315]);assert.equal((await h.run(req(batch([r])))).status,200);assert.deepEqual(h.calls[0].args.details.records,[r]);});
test('one MiB request ceiling remains enforced with individually valid statements',async()=>{const h=setup(),r={...record,goods:[{class:'041',text:'x'.repeat(524288)},{class:'042',text:'y'.repeat(524288)}]};assert.equal((await h.run(req(batch([r])))).status,413);assert.equal(h.calls.length,0);});
test('request ceiling measures UTF-8 bytes, including multibyte text',async()=>{const h=setup(),r={...record,goods:[{class:'041',text:'中'.repeat(400000)}]};assert.equal((await h.run(req(batch([r])))).status,413);assert.equal(h.calls.length,0);});
test('release, project and secret gates still deny database access',async()=>{for(const [overrides,secret,status] of [[{WATCH_RELEASE_ENABLED:'false'},key,503],[{SUPABASE_URL:'https://other.supabase.co'},key,503],[{},'incorrect',401]]){const h=setup(overrides);assert.equal((await h.run(req(batch([record]),secret))).status,status);assert.equal(h.calls.length,0);}});
test('batch and evidence shape limits remain enforced',async()=>{for(const body of [batch(Array(101).fill(record)),batch([{...record,extra:'unexpected'}]),batch([{...record,classes:['99']}])]){const h=setup();assert.equal((await h.run(req(body))).status,400);assert.equal(h.calls.length,0);}});
