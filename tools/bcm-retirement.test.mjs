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
