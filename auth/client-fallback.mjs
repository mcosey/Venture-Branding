import {memberAccountsEnabled,workspaceFor} from './member-account.mjs?v=1';

// A server decision alone can move a Test client back to free onboarding/Member home.
// A network error or browser state must never manufacture another workspace role.
export async function clientFallback(db,config,hostname){
 if(!memberAccountsEnabled(config,hostname))return null;
 try{
  const result=await db.rpc('vb_portal_entry');
  if(result.error||!['member','onboarding'].includes(result.data))return null;
  return workspaceFor(result.data);
 }catch{return null;}
}
