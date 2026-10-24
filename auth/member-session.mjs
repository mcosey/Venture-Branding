import {memberAccountsEnabled,memberClient,verifiedEntry,workspaceFor} from './member-account.mjs?v=client-onboarding-1';
async function connect(){
 if(typeof window==='undefined'||!memberAccountsEnabled(window.VB_AUTH_CONFIG,window.location.hostname))return null;
 const db=memberClient();
 let access;
 try{access=await verifiedEntry(db,{requireProfile:true});}
 catch(error){location.replace(new URL('login.html',location.origin).href);throw error;}
 if(!['member','client'].includes(access.entry)){
  location.replace(new URL(workspaceFor(access.entry)||'login.html',location.origin).href);
  throw Error('Account setup required.');
 }
 return {...access,db,company:access.companies[0]};
}
export const memberContext=await connect();
