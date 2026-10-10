// History remains immutable; only the current check and approval authorize manual review.
export function currentReview(events,revision) {
 const rows=events.filter(e=>e.revision===revision);
 let check=null,decisions={},approval=null,ready=null;
 for(const e of rows){
  if(e.action==='check'){check=e;decisions={};approval=ready=null;continue;}
  if(!check||e.details.check_id!==check.id)continue;
  if(e.action==='resolution'){decisions[e.details.issue_id]=e.details;approval=ready=null;}
  if(e.action==='transfer_approval'){approval=e;ready=null;}
  if(e.action==='readiness'&&approval&&e.details.approval_id===approval.id&&e.details.manual_review_confirmed===true)ready=e;
 }
 return {check,decisions,approval,ready};
}
export function canApprove(review) {
 return Boolean(review.check?.details.rows?.length&&review.check.details.rows.every(r=>
  r.status==='PASS'||(r.status==='REVIEW'&&review.decisions[r.id]?.reason?.trim())
  ||(r.status==='MISSING INFORMATION'&&review.decisions[r.id]?.reason?.trim())
 ));
}
export function canRecordReadiness(review,manual) {
 return Boolean(canApprove(review)&&review.approval&&manual);
}
