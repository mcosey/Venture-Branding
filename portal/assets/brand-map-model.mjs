import {statusLabel,typeLabel} from '../../auth/connection.mjs';

// The existing loader checks the session and RLS restricts its response to
// authorized workspaces. This projection also limits the map to one workspace
// and explicitly lists client-visible fields; internal notes never enter it.
export function brandMapModel(client,records){
 if(!client?.id)throw new Error('A client workspace is required.');
 const marks=(records||[]).filter(mark=>mark.client_id===client.id&&!mark.archived_at).map(mark=>({
  id:mark.id,name:mark.name,type:typeLabel(mark.mark_type),status:statusLabel(mark.status),
  applicationNumber:mark.application_number||'Not provided',registrationNumber:mark.registration_number||'Not provided',
  owner:mark.record_owner||'Not provided',usptoStatus:mark.uspto_status_text||'Not retrieved',
  source:mark.source==='uspto'?'USPTO':'Entered by Venture Branding',sourceCheckedAt:mark.source_checked_at||null
 }));
 return {clientId:client.id,company:client.name,marks,counts:{total:marks.length,
  registered:marks.filter(mark=>mark.status==='Registered').length,
  pending:marks.filter(mark=>mark.status==='Pending').length,
  inactive:marks.filter(mark=>mark.status==='Inactive').length}};
}

export function recordLink(clientId,markId){
 return `trademark.html?mark=${encodeURIComponent(markId)}&client=${encodeURIComponent(clientId)}`;
}

// Six records per view keep cards readable without hiding portfolio totals.
export function mapPage(marks,page=0){
 const pages=Math.max(1,Math.ceil(marks.length/6));
 const current=Math.max(0,Math.min(pages-1,Math.floor(page)||0));
 const items=marks.slice(current*6,current*6+6).map((mark,index,list)=>{
  const angle=(-90+index*360/list.length)*Math.PI/180;
  return {mark,x:50+34*Math.cos(angle),y:50+37*Math.sin(angle)};
 });
 return {current,pages,items};
}
