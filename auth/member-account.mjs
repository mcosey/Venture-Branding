import {createConnection} from './connection.mjs?v=20261018-record-pages';
import {createDiagnostics,isDiagnosticError,databaseCategory} from '../shared/diagnostics.mjs';
export const SIGNUP_NOTICE = 'member-signup-test-2026-10-16';
export const PENDING_SIGNUP = 'vb-member-test-pending-signup-v1';
export function memberAccountsEnabled(config,hostname) {
 return config?.memberAccountsEnabled===true && config.environment==='bcm-test'
  && config.url==='https://imvkhicfmidzbzsbhkzs.supabase.co'
  && ['127.0.0.1','localhost'].includes(hostname);
}
export function workspaceFor(entry) {
 const routes={client:'portal.html',member:'member.html',onboarding:'signup.html',staff:'attorney-login.html'};
 return Object.hasOwn(routes,entry)?routes[entry]:null;
}
export function matchingDraft(raw,email) {
 try {const value=JSON.parse(raw);return value?.notice===SIGNUP_NOTICE&&typeof email==='string'&&value.email?.toLowerCase()===email.toLowerCase()?value:null;}catch{return null;}
}
export function signupProfile(values) {
 const profile={full_name:String(values.fullName||'').trim(),name:String(values.companyName||'').trim(),industry:String(values.industry||'').trim(),launch_date:String(values.launchDate||'')};
 if(!profile.full_name||profile.full_name.length>120||!profile.name||profile.name.length>120||profile.industry.length>100)throw Error('Enter your name and company name within the displayed limits.');
 if(profile.launch_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(profile.launch_date)||!Number.isFinite(Date.parse(profile.launch_date))||new Date(profile.launch_date).toISOString().slice(0,10)!==profile.launch_date))throw Error('Enter a valid planned launch date.');
 return profile;
}
export function memberClient(){return createConnection('client');}
export async function verifiedEntry(db) {
 const identity=await db.auth.getUser();if(identity.error||!identity.data.user)throw Error('Please sign in to continue.');
 const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 if(assurance.error||(assurance.data.nextLevel==='aal2'&&assurance.data.currentLevel!=='aal2'))throw Error('Please verify your sign-in.');
 const entry=await db.rpc('vb_portal_entry');if(entry.error||!workspaceFor(entry.data))throw Error('This account does not currently have portal access.');
 return {user:identity.data.user,entry:entry.data};
}

export async function completePendingSignup(db,user,raw,{diagnostics}={}) {
 const pending=matchingDraft(raw,user?.email);
 if(!pending?.profile)return false;
 const profile=signupProfile({fullName:pending.profile.full_name,companyName:pending.profile.name,industry:pending.profile.industry});
 const diagnostic=createDiagnostics('member',diagnostics);
 try{
 const result=await db.rpc('vb_onboard_test_member',{profile,notice:SIGNUP_NOTICE,confirmed:true});
 if(result.error)throw diagnostic.error('onboarding','Account setup could not complete. Please try again.',databaseCategory(result.error.code));
 return true;
 }catch(error){if(isDiagnosticError(error))throw error;throw diagnostic.error('onboarding','Account setup could not complete. Please try again.');}
}
