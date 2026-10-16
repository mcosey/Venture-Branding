export const BUSINESS_KEY='vb-llk-business-prototype-v1';
export const NOTICE_VERSION='llk-draft-2026-10-15-single';
export const acknowledgments=[
 {id:'policies',text:'For final release: “I have read, understood, and accepted the Privacy Policy and Terms of Service.” These documents and their hyperlinks are pending; this sentence remains draft wording in the local prototype.'},
 {id:'prototype',text:'I understand this is a local prototype. The final Terms of Service and Privacy Policy are pending, and confirming this prototype does not record acceptance of those documents.'},
 {id:'education',text:'I understand that LLK provides general educational and planning information, not legal advice tailored to my circumstances.'},
 {id:'engagement',text:'I understand that using LLK alone does not engage Venture Branding or establish an attorney-client relationship. Any existing engagement remains governed by its separate agreement.'},
 {id:'counsel',text:'I understand that Venture Branding recommends independent legal counsel for advice about my circumstances. LLK is intended to help me prepare for those meetings and consultations.'},
 {id:'information',text:'I understand that I should not assume my LLK entries are attorney-client privileged. I will avoid confidential legal details. This prototype does not send my entries to an attorney.'}
];
export const fields={name:120,industry:100,entityType:80,country:80,state:80,stage:40};
export function emptyBusiness(){return {version:1,acknowledgment:null,profile:null};}
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function normalizeProfile(values){
 const profile={},errors={};
 for(const [key,max]of Object.entries(fields)){profile[key]=typeof values[key]==='string'?values[key].trim():'';if(profile[key].length>max)errors[key]='Please use '+max+' characters or fewer.';}
 if(!profile.name)errors.name='Enter your company or working name.';
 profile.launchUnknown=values.launchUnknown===true;
 profile.launchDate=profile.launchUnknown?'':typeof values.launchDate==='string'?values.launchDate.trim():'';
 if(profile.launchDate&&!validDate(profile.launchDate))errors.launchDate='Enter a valid date, or choose “Not sure yet.”';
 return {profile,errors};
}
export function createAcknowledgment(checked,now=new Date().toISOString()){
 if(checked?.all!==true)throw new Error('Please confirm that you have read and understood the acknowledgments to continue.');
 if(!Number.isFinite(Date.parse(now)))throw new Error('Unable to record the acknowledgment time.');
 return {recordType:'prototype-only',noticeVersion:NOTICE_VERSION,recordedAt:now,termsVersion:null,privacyVersion:null,checked:{all:true}};
}
export function hasAcknowledged(state){const a=state?.acknowledgment;return a?.recordType==='prototype-only'&&a.noticeVersion===NOTICE_VERSION&&typeof a.recordedAt==='string'&&Number.isFinite(Date.parse(a.recordedAt))&&a.termsVersion===null&&a.privacyVersion===null&&a.checked?.all===true;}
export function decodeBusiness(raw){
 const result=emptyBusiness();
 try{const data=JSON.parse(raw);if(data?.version!==1)return result;if(hasAcknowledged(data))result.acknowledgment=createAcknowledgment(data.acknowledgment.checked,data.acknowledgment.recordedAt);
 if(data.profile&&typeof data.profile==='object'){const {profile,errors}=normalizeProfile(data.profile);if(!Object.keys(errors).length)result.profile=profile;}
 }catch{}return result;
}
