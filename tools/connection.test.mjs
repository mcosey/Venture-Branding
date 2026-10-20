import test from 'node:test';
import assert from 'node:assert/strict';
import {requireAccess,loadRecords,statusLabel} from '../auth/connection.mjs';
function fake({role='client',level='aal1',user=true,error=null}={}){let queries=[];return {queries,auth:{getUser:async()=>({data:{user:user?{id:'one',user_metadata:{role:'staff'}}:null},error}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level,nextLevel:level}})}},rpc:async()=>({data:role}),from(table){queries.push(table);const r={data:[],select(){return this;},order(){return this;},is(){return this;},range(from,to){return {data:this.data.slice(from,to+1),count:this.data.length};}};return r;}};}
test('no user cannot issue any data queries',async()=>{const db=fake({user:false});await assert.rejects(loadRecords(db,'client'));assert.deepEqual(db.queries,[]);});
test('client cannot enter staff route via metadata or URL',async()=>{const db=fake({role:'client',level:'aal2'});await assert.rejects(loadRecords(db,'staff'));assert.deepEqual(db.queries,[]);});
test('staff must use staff entrance',async()=>{const db=fake({role:'staff',level:'aal2'});await assert.rejects(requireAccess(db,'client'));});
test('staff without MFA cannot query records',async()=>{const db=fake({role:'staff'});await assert.rejects(loadRecords(db,'staff'));assert.deepEqual(db.queries,[]);});
test('client loading never requests internal references',async()=>{const db=fake();await loadRecords(db,'client');assert.deepEqual(db.queries,['vb_clients','vb_marks','vb_service_preferences']);});
test('staff loading includes references only after access check',async()=>{const db=fake({role:'staff',level:'aal2'});await loadRecords(db,'staff');assert.ok(db.queries.includes('vb_client_references'));});
test('unknown mark status is never presented as registered',()=>assert.equal(statusLabel(null),'Not provided'));

function paged({cap=71,alter,fail,revoke=false}={}){
 const db=fake(),requests=[];let access=0;
 const data={vb_clients:[{id:'c',name:'Company'}],vb_marks:Array.from({length:1205},(_,n)=>({id:String(n).padStart(5,'0'),name:'Same name',client_id:'c'})),vb_service_preferences:Array.from({length:505},(_,n)=>({client_id:String(Math.floor(n/5)).padStart(4,'0'),service:'service'+n%5})),vb_client_references:[]};
 db.rpc=async()=>({data:revoke&&++access>1?'denied':'client'});
 db.from=table=>{let orders=[];return {select(_fields,options){assert.equal(options.count,'exact');return this},is(key,value){assert.equal(key,'archived_at');assert.equal(value,null);return this},order(key){orders.push(key);return this},range(from,to){const call={table,from,to,orders};requests.push(call);const rows=[...data[table]].sort((a,b)=>{for(const key of orders){const order=a[key].localeCompare(b[key]);if(order)return order;}return 0});if(fail?.(call))return {error:{message:'SYNTHETIC PRIVATE ERROR'}};const result={data:rows.slice(from,Math.min(to+1,from+cap)),count:rows.length};return alter?.(result,call)||result}}};
 return {db,data,requests};
}
test('loads over 1000 marks and composite preferences even under a smaller server cap',async()=>{
 const f=paged();const records=await loadRecords(f.db,'client');assert.equal(records.marks.length,1205);assert.equal(records.preferences.length,505);assert.equal(new Set(records.marks.map(r=>r.id)).size,1205);assert(f.requests.filter(r=>r.table==='vb_marks').length>10);assert(f.requests.filter(r=>r.table==='vb_service_preferences').every(r=>r.orders.join(',')==='client_id,service'));
});
test('a later-page failure never resolves to a partial portfolio or exposes upstream details',async()=>{
 const f=paged({fail:r=>r.table==='vb_marks'&&r.from>0});await assert.rejects(loadRecords(f.db,'client'),error=>/load all/.test(error.message)&&!error.message.includes('PRIVATE'));
});
test('concurrent row-count changes and duplicate rows demand a fresh load',async()=>{
 for(const mode of ['count','duplicate']){const f=paged({alter:(result,r)=>{if(r.table==='vb_marks'&&r.from>0){if(mode==='count')result.count++;else result.data[0]={id:'00000',name:'Same name'};}return result;}});await assert.rejects(loadRecords(f.db,'client'),/reload/);}
});
test('missing counts, early empty pages and excessive loads fail explicitly',async()=>{
 for(const mode of ['count','empty','oversize']){const f=paged({alter:(result,r)=>{if(r.table==='vb_marks'){if(mode==='count')result.count=null;if(mode==='empty'&&r.from>0)result.data=[];if(mode==='oversize')result.count=50001;}return result}});await assert.rejects(loadRecords(f.db,'client'),/load all/);}
});
test('access ending during a paged load prevents returning any workspace',async()=>{
 const f=paged({revoke:true});await assert.rejects(loadRecords(f.db,'client'),/does not have access/);
});
