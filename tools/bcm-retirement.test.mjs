import test from 'node:test';
import assert from 'node:assert/strict';
import {createBcmHandler} from '../supabase/functions/bcm-scan/handler.mjs';
import {createBcmScheduleHandler} from '../supabase/functions/bcm-schedule/handler.mjs';
for (const [name,factory] of [['manual',createBcmHandler],['scheduled',createBcmScheduleHandler]]) {
 test(`retired ${name} scanner cannot access a database or website`,async()=>{
  const forbidden=()=>{throw new Error('Retired scan attempted work');};
  const handler=factory({createClient:forbidden,env:()=>undefined,scan:forbidden});
  const response=await handler(new Request('https://example.test',{method:'POST'}));
  assert.equal(response.status,410);assert.match(await response.text(),/retired/);
 });
}

for(const origins of [undefined,'https://portal.example,https://other.example']){
 test(`retired manual endpoint preserves origins, methods and headers (${origins?'configured':'default'})`,async()=>{
  const allowed=origins?'https://portal.example':'http://127.0.0.1:8000';
  const handler=createBcmHandler({env:key=>{assert.equal(key,'VB_ALLOWED_ORIGINS');return origins;}});
  for(const [method,origin,status] of [['POST','',410],['POST',allowed,410],['POST','https://foreign.example',403],['GET','',405],['OPTIONS',allowed,204],['OPTIONS','https://foreign.example',403]]){
   const req=new Request('https://fixture.invalid',{method,headers:origin?{Origin:origin}:{}});
   req.text=()=>{throw Error('Retired endpoint must not read the body');};
   const response=await handler(req);
   assert.equal(response.status,status);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Vary'),'Origin');
   assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin===allowed?allowed:null);
   if(status===410)assert.deepEqual(await response.json(),{error:'Brand Change Monitor has been retired.'});
   if(status===405)assert.deepEqual(await response.json(),{error:'POST required.'});
   if(status===403)assert.deepEqual(await response.json(),{error:'Origin not allowed.'});
   if(status===204){assert.equal(await response.text(),'');assert.equal(response.headers.get('Access-Control-Allow-Methods'),'POST, OPTIONS');assert.equal(response.headers.get('Access-Control-Allow-Headers'),'authorization, apikey, content-type, x-client-info');}
  }
 });
}
