import test from 'node:test';
import assert from 'node:assert/strict';
import {requireAccess,loadRecords,statusLabel} from '../auth/connection.mjs';
function fake({role='client',level='aal1',user=true,error=null}={}){let queries=[];return {queries,auth:{getUser:async()=>({data:{user:user?{id:'one',user_metadata:{role:'staff'}}:null},error}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level,nextLevel:level}})}},rpc:async()=>({data:role}),from(table){queries.push(table);const r={data:[],select(){return this;},order(){return this;},is(){return this;}};return r;}};}
test('no user cannot issue any data queries',async()=>{const db=fake({user:false});await assert.rejects(loadRecords(db,'client'));assert.deepEqual(db.queries,[]);});
test('client cannot enter staff route via metadata or URL',async()=>{const db=fake({role:'client',level:'aal2'});await assert.rejects(loadRecords(db,'staff'));assert.deepEqual(db.queries,[]);});
test('staff must use staff entrance',async()=>{const db=fake({role:'staff',level:'aal2'});await assert.rejects(requireAccess(db,'client'));});
test('staff without MFA cannot query records',async()=>{const db=fake({role:'staff'});await assert.rejects(loadRecords(db,'staff'));assert.deepEqual(db.queries,[]);});
test('client loading never requests internal references',async()=>{const db=fake();await loadRecords(db,'client');assert.deepEqual(db.queries,['vb_clients','vb_marks','vb_service_preferences']);});
test('staff loading includes references only after access check',async()=>{const db=fake({role:'staff',level:'aal2'});await loadRecords(db,'staff');assert.ok(db.queries.includes('vb_client_references'));});
test('unknown mark status is never presented as registered',()=>assert.equal(statusLabel(null),'Not provided'));
