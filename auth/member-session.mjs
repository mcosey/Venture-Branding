import {memberAccountsEnabled,memberClient,verifiedEntry,workspaceFor,loadMemberCompanies} from './member-account.mjs?v=1';
async function connect(){
 if(typeof window==='undefined'||!memberAccountsEnabled(window.VB_AUTH_CONFIG,window.location.hostname))return null;
 const db=memberClient();
 try{
  const access=await verifiedEntry(db);
  if(!['member','client'].includes(access.entry)){location.replace(workspaceFor(access.entry)||'login.html');throw Error('Account setup required.');}
  const companies=await loadMemberCompanies(db);
  return {...access,db,company:companies[0]||null};
 }catch(error){location.replace(new URL('login.html',location.origin).href);throw error;}
}
export const memberContext=await connect();
