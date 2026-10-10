import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currentReview,canApprove,canRecordReadiness} from '../attorney/preflight/review-state.mjs';
const check=(id='check',revision=1,rows=[{id:'legal',status:'REVIEW'}])=>({id,revision,action:'check',details:{rows}});
const event=(id,action,details={},revision=1)=>({id,revision,action,details:{check_id:'check',...details}});
const approved=[check(),event('resolution','resolution',{issue_id:'legal',kind:'Reviewed',reason:'Confirmed'}),event('approval','transfer_approval')];
const manual=event('ready','readiness',{approval_id:'approval',manual_review_confirmed:true});
test('manual review needs resolved checklist, transfer approval and explicit confirmation',()=>{
 assert.equal(canApprove(currentReview([check()],1)),false);
 assert.equal(canRecordReadiness(currentReview(approved.slice(0,2),1),true),false);
 const r=currentReview(approved,1);assert.equal(canApprove(r),true);assert.equal(canRecordReadiness(r,false),false);assert.equal(canRecordReadiness(r,true),true);
});
test('manual review records without any PDF or comparison event',()=>{assert.equal(currentReview([...approved,manual],1).ready.id,'ready');});
test('new revision cannot reuse earlier approval or manual review',()=>{const r=currentReview([...approved,manual],2);assert.equal(r.approval,null);assert.equal(r.ready,null);assert.equal(canRecordReadiness(r,true),false);});
test('new check invalidates decisions, approval and manual review',()=>{const r=currentReview([...approved,manual,check('new'),event('replayed','transfer_approval')],1);assert.equal(r.approval,null);assert.equal(r.ready,null);assert.equal(canApprove(r),false);});
test('new attorney resolution invalidates old approval and manual review',()=>{const r=currentReview([...approved,manual,event('newreason','resolution',{issue_id:'legal',kind:'Override',reason:'Updated reason'})],1);assert.equal(r.approval,null);assert.equal(r.ready,null);});
test('manual review must link current transfer approval',()=>{
 const r=currentReview([...approved,event('approval2','transfer_approval'),manual],1);assert.equal(r.ready,null);
 const r2=currentReview([...approved,event('approval2','transfer_approval'),event('newready','readiness',{approval_id:'approval2',manual_review_confirmed:true})],1);assert.equal(r2.ready.id,'newready');
});
test('missing, false and string confirmation cannot produce manual review',()=>{for(const value of [undefined,false,'true']){assert.equal(currentReview([...approved,event('ready','readiness',{approval_id:'approval',manual_review_confirmed:value})],1).ready,null);}});
test('historical comparison events remain inert and cannot authorize manual review',()=>{const legacy=event('legacy','comparison',{approval_id:'approval',rows:[{status:'MATCH'}]});const r=currentReview([...approved,legacy,event('oldready','readiness',{comparison_id:'legacy',manual_review_confirmed:true})],1);assert.equal(r.ready,null);});
test('blocking checklist item cannot be overridden',()=>{const r=currentReview([check('check',1,[{id:'scope',status:'BLOCKING ISSUE'}]),event('resolution','resolution',{issue_id:'scope',reason:'Override'})],1);assert.equal(canApprove(r),false);assert.equal(canRecordReadiness(r,true),false);});
