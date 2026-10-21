import {diagnosticRequest} from '../shared/diagnostics.mjs';
import {requireAccess} from './connection.mjs?v=20261018-record-pages';
import {memberAccountsEnabled} from './member-account.mjs';
export function draftDetails(values){
 const text=(key)=>String(values[key]||'').trim();
 const details={client_id:values.client_id||null,engagement_title:text('engagement_title'),matter_title:text('matter_title'),recipient_email:text('recipient_email').toLowerCase()};
 if(!details.engagement_title||details.engagement_title.length>200||!details.matter_title||details.matter_title.length>200||details.recipient_email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(details.recipient_email))throw Error('Enter the engagement, initial matter, and invitation email.');
 if(details.client_id&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(details.client_id))throw Error('Choose a legal client.');
 if(!details.client_id){
  Object.assign(details,{new_client_name:text('new_client_name'),client_type:text('client_type'),contact_name:text('contact_name')});
  if(!details.new_client_name||details.new_client_name.length>200||!details.contact_name||details.contact_name.length>200||!['business','individual'].includes(details.client_type))throw Error('Enter the new legal client and contact details.');
 }
 return details;
}
export function createEngagementAdmin(db,config,hostname,{diagnostics}={}){
 function enabled(){if(!memberAccountsEnabled(config,hostname))throw Error('Engagement setup is not available in this workspace.');}
 async function request(stage,work,message,options={}){await requireAccess(db,'staff');return diagnosticRequest('engagement',stage,work,{diagnostics,message,...options});}
 return {
  async close(id,status){enabled();if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)||status!=='active')throw Error('Choose a current active engagement.');await request('close',()=>db.rpc('vb_close_test_engagement',{target_engagement:id,expected_status:status}),code=>code==='40001'?'This engagement changed. Reload before closing it.':'The engagement could not be closed. Refresh its status before trying again.');},
  async read(){enabled();return (await request('drafts_load',()=>db.rpc('vb_test_engagement_admin'),'Engagement setup is unavailable. Refresh to try again.')).data;},
  async send(id,revision,client){enabled();return (await request('send',()=>db.functions.invoke('engagement-invite',{body:{draftId:id,revision,expectedEmail:client.contact_email,contactUpdatedAt:client.updated_at,confirmSend:true}}),'Invitation could not be sent. Refresh its status before retrying.',{serverReference:true,valid:r=>r?.data?.sent===true})).data;},
  async revoke(invitationId){enabled();await request('revoke',()=>db.rpc('vb_revoke_test_engagement_invite',{invitation_id:invitationId}),'Invitation could not be revoked. Refresh its status.');},
  async save(id,revision,values){enabled();const details=draftDetails(values);return (await request('draft_save',()=>db.rpc('vb_save_test_engagement_draft',{draft_id:id,expected_revision:revision,details}),code=>code==='40001'?'This draft changed. Reload it before saving again.':'The draft was not saved. Check the details and try again.')).data;}
 };
}
