import {memberContext} from '../../auth/member-session.mjs?v=1';
import {renderAccountBusiness} from './member-business.mjs?v=2';
import {BUSINESS_KEY,NOTICE_VERSION,acknowledgments,fields,emptyBusiness,decodeBusiness,hasAcknowledged,createAcknowledgment,normalizeProfile} from './llk-business-state.mjs';
const businessStorageKey=BUSINESS_KEY+(memberContext?':'+memberContext.user.id:'');
let state=emptyBusiness(),canSave=true;
try{state=decodeBusiness(localStorage.getItem(businessStorageKey));}catch{canSave=false;}
let savedName=memberContext?memberContext.company?.name||'':state.profile?.name||'';
export function savedBusinessName(){return savedName;}

export function renderBusiness(main,{e,link,panel,heading,refresh}){
 if(memberContext)return renderAccountBusiness(main,{e,link,panel,heading},memberContext,name=>{savedName=name;});
 heading('Your business','A few basics to help organize your planning. No confidential legal details are needed.');
 main.append(link('← Back to the map','#'));
 const notice=panel('Local prototype · draft legal wording','business-notice');
 notice.append(e('p','Terms of Service and Privacy Policy have not been finalized. This is a test of the acknowledgment flow, not acceptance of final policies. Legal wording must be approved before public release.'));
 main.append(notice);
 const result=e('p',undefined,'business-save-status');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 function persist(){try{localStorage.setItem(businessStorageKey,JSON.stringify(state));canSave=true;return true;}catch{canSave=false;return false;}}
 if(!hasAcknowledged(state)){
  const card=panel('Before you continue');card.append(e('p','Please read the draft acknowledgments below, then confirm once to continue.','muted'));
  const form=e('form');const text=e('ol',undefined,'business-ack-text');text.id='business-ack-text';
  for(const item of acknowledgments)text.append(e('li',item.text));form.append(text);
  const label=e('label',undefined,'task business-ack');const box=e('input');box.type='checkbox';box.id='business-ack-all';box.name='all';box.required=true;box.setAttribute('aria-describedby','business-ack-text');label.append(box,e('span','I have read and understood the acknowledgments above.'));form.append(label);
  form.append(e('p','Notice version: '+NOTICE_VERSION+'. This is not a waiver of rights or a guarantee that liability or privilege questions are resolved.','muted'));
  const error=e('p',undefined,'business-error');error.setAttribute('role','alert');const submit=e('button','Continue to company profile','primary');submit.type='submit';form.append(error,submit);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{state.acknowledgment=createAcknowledgment({all:box.checked});persist();refresh();document.querySelector('#company-name')?.focus();}catch(err){error.textContent=err.message;}});
  card.append(form);main.append(card);return;
 }
 const card=panel('Company profile');card.append(e('p','Saved in this browser only. This does not create an account, open a matter, schedule a consultation, or notify an attorney.','muted'));
 if(!canSave){result.textContent='Browser saving is unavailable. Changes last only while this page stays open.';}
 const form=e('form');form.className='business-form';const inputs={};const grid=e('div',undefined,'business-fields');const profile=state.profile||{};
 function field(key,labelText,type='text',options){const wrap=e('div',undefined,'business-field');const label=e('label',labelText);label.htmlFor='company-'+key;const input=e(options?'select':'input');input.id='company-'+key;input.name=key;if(options){input.append(new Option('Choose (optional)',''));for(const text of options)input.append(new Option(text,text));}else{input.type=type;if(fields[key])input.maxLength=fields[key];}input.value=profile[key]||'';if(key==='name')input.required=true;input.autocomplete='off';inputs[key]=input;const error=e('span',undefined,'business-error');error.id='company-'+key+'-error';error.setAttribute('aria-live','polite');input.setAttribute('aria-describedby',error.id);wrap.append(label,input,error);grid.append(wrap);return input;}
 field('name','Company or working name');const date=field('launchDate','Planned launch date (optional)','date');
 const unknownLabel=e('label',undefined,'business-unknown');const unknown=e('input');unknown.type='checkbox';unknown.checked=profile.launchUnknown===true;unknownLabel.append(unknown,e('span','Not sure about the launch date yet'));date.parentElement.append(unknownLabel);date.disabled=unknown.checked;unknown.onchange=()=>{date.disabled=unknown.checked;};
 field('stage','Business stage (optional)','text',['Exploring an idea','Preparing to launch','Already operating']);field('industry','Industry (optional)');field('entityType','Entity type (optional)','text',['Not formed yet','Not sure','Sole proprietorship','LLC','Corporation','Partnership','Other']);field('country','Country (optional)');field('state','State or region (optional)');
 form.append(grid,e('p','Keep this brief. Please do not enter identification numbers, financial information, or confidential legal facts. The launch date is for planning and does not calculate legal deadlines.','muted'));
 const actions=e('div',undefined,'business-actions');const submit=e('button','Save company profile','primary');submit.type='submit';actions.append(submit,link('Return to map','#'));form.append(actions,result);
 const markUnsaved=()=>{submit.textContent='Save company profile';submit.setAttribute('data-saved','false');if(canSave)result.textContent='';};
 form.addEventListener('input',markUnsaved);form.addEventListener('change',markUnsaved);
 form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;
 const {profile,errors}=normalizeProfile({...Object.fromEntries(Object.entries(inputs).map(([id,input])=>[id,input.value])),launchUnknown:unknown.checked});
 for(const [id,input]of Object.entries(inputs)){const message=errors[id]||'';document.querySelector('#company-'+id+'-error').textContent=message;input.setAttribute('aria-invalid',String(Boolean(message)));}
 if(Object.keys(errors).length){inputs[Object.keys(errors)[0]]?.focus();return;}
 // Direct profile links never bypass the current draft acknowledgment.
 if(!hasAcknowledged(state)){refresh();return;}
 state.profile=profile;const saved=persist();if(saved)savedName=profile.name;submit.textContent=saved?'✓ Saved':'Save company profile';submit.setAttribute('data-saved',String(saved));
 result.className=saved?'business-save-status sr-only':'business-save-status';
 result.textContent=saved?'Company profile saved in this browser. Nothing was sent to Venture Branding.':'Your changes are available for this session, but browser storage could not save them.';
 });card.append(form);main.append(card);
 const record=e('div',undefined,'business-record');record.append(e('p','Prototype acknowledgments recorded '+new Date(state.acknowledgment.recordedAt).toLocaleString()+'. Final Terms and Privacy Policy have not been accepted.','muted'));
 const reset=e('button','Reset company profile and prototype acknowledgments','quiet-button');reset.type='button';reset.onclick=()=>{if(!confirm('Remove this company profile and prototype acknowledgments? Your milestone progress and notes will stay.'))return;state=emptyBusiness();savedName='';persist();refresh();main.focus();};record.append(reset);main.append(record);
}
