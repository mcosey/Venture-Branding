import {createConnection} from './connection.mjs?v=20261018-record-pages';
import {createDiagnostics,databaseCategory} from '../shared/diagnostics.mjs';
export const SIGNUP_NOTICE = 'member-signup-test-2026-10-16';
export const PENDING_SIGNUP = 'vb-member-test-pending-signup-v1';
export function memberAccountsEnabled(config,hostname,origin=globalThis.location?.origin) {
 if(config?.memberAccountsEnabled!==true)return false;
 if(config.environment==='bcm-test')return config.url==='https://imvkhicfmidzbzsbhkzs.supabase.co'
  && ['127.0.0.1','localhost'].includes(hostname);
 if(config.environment!=='bcm-production'||config.url!=='https://omvkwiosonatswocbdgx.supabase.co'
  ||!Array.isArray(config.memberOrigins)||!config.memberOrigins.includes(origin))return false;
 try{
  const url=new URL(origin);
  return url.origin===origin&&url.hostname===hostname&&!url.username&&!url.password
   &&(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(hostname)));
 }catch{return false;}
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
export async function verifiedEntry(db,{diagnostics}={}) {
 const identity=await db.auth.getUser();if(identity.error||!identity.data.user)throw Error('Please sign in to continue.');
 const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 if(assurance.error||(assurance.data.nextLevel==='aal2'&&assurance.data.currentLevel!=='aal2'))throw Error('Please verify your sign-in.');
 const diagnostic=createDiagnostics('member',diagnostics);let entry;
 try{entry=await db.rpc('vb_portal_entry');}catch{throw diagnostic.error('entry','This account does not currently have portal access.');}
 if(entry.error){if(entry.error.code==='42501')throw Error('This account does not currently have portal access.');throw diagnostic.error('entry','This account does not currently have portal access.',databaseCategory(entry.error.code));}
 if(!workspaceFor(entry.data))throw Error('This account does not currently have portal access.');
 return {user:identity.data.user,entry:entry.data};
}

export async function onboardMember(db,profile,{diagnostics}={}) {
 const diagnostic=createDiagnostics('member',diagnostics);let result;
 try{result=await db.rpc('vb_onboard_test_member',{profile,notice:SIGNUP_NOTICE,confirmed:true});}catch{throw diagnostic.error('onboarding','Account setup could not complete. Please try again.');}
 if(result.error){if(result.error.code==='22023')throw Error('Account setup could not complete. Please check your details and try again.');throw diagnostic.error('onboarding','Account setup could not complete. Please try again.',databaseCategory(result.error.code));}
 return true;
}

export async function completePendingSignup(db,user,raw,options={}) {
 const pending=matchingDraft(raw,user?.email);
 if(!pending?.profile)return false;
 const profile=signupProfile({fullName:pending.profile.full_name,companyName:pending.profile.name,industry:pending.profile.industry});
 return onboardMember(db,profile,options);
}

export async function loadMemberCompanies(db,{diagnostics}={}) {
 const diagnostic=createDiagnostics('member',diagnostics);let result;
 try{result=await db.from('vb_member_companies').select('id,name,launch_date,industry,stage,entity_type,country,region').order('id');}catch{throw diagnostic.error('profile_load','Company profile could not be loaded. Please try again.');}
 if(result.error)throw diagnostic.error('profile_load','Company profile could not be loaded. Please try again.',databaseCategory(result.error.code));
 if(!Array.isArray(result.data))throw diagnostic.error('profile_load','Company profile could not be loaded. Please try again.','invalid_response');
 return result.data;
}

export async function saveMemberCompany(db,companyId,values,{diagnostics}={}) {
 const diagnostic=createDiagnostics('member',diagnostics);let result;
 try{result=await db.from('vb_member_companies').update(values).eq('id',companyId).select('id').single();}catch{throw diagnostic.error('profile_save','Unable to save your changes. Please try again.');}
 if(result.error)throw diagnostic.error('profile_save','Unable to save your changes. Please try again.',databaseCategory(result.error.code));
 if(!result.data)throw diagnostic.error('profile_save','Unable to save your changes. Please try again.','invalid_response');
 return result.data;
}
