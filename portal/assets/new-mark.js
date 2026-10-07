// Scheduling intake only: never creates a trademark or authorizes work.
const drafts=new Map();
export function clearMarkDrafts(){drafts.clear();}
export function renderNewMark(main,client){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const draft=drafts.get(client.id)||{};drafts.set(client.id,draft);
 const form=el('form');form.className='panel connected-card mark-intake';
 form.append(el('p','Tell us about the mark you’d like to discuss.'));
 function field(key,label,kind,options){const wrap=el('label',label);let input;
  if(kind==='select'){input=el('select');for(const value of options)input.add(new Option(value,value));}
  else{input=el(kind==='textarea'?'textarea':'input');if(kind!=='textarea')input.type='text';input.maxLength=kind==='textarea'?2000:200;}
  input.name=key;input.value=draft[key]||options?.[0]||'';input.required=['name','description'].includes(key);
  input.addEventListener('input',()=>draft[key]=input.value);wrap.append(input);form.append(wrap);return input;
 }
 field('name','Mark name or short description','text');
 field('type','Mark type','select',['Not sure','Name / words','Logo','Name and logo']);
 field('description','What products or services will it identify?','textarea');
 field('use','Are you using it yet?','select',['Not sure','Not yet','Already in use']);
 field('notes','Anything else you’d like to discuss? (optional)','textarea');
 const notice=el('p','Booking is not connected yet. These details stay on this page and are not sent or saved.');notice.className='muted';form.append(notice);
 const button=el('button','Schedule a call');button.type='submit';button.className='mark-primary';form.append(button);
 const dialog=el('dialog');dialog.className='mark-confirm';dialog.setAttribute('aria-labelledby','schedule-title');dialog.setAttribute('aria-describedby','schedule-disclaimer');
 const title=el('h2','Would you like to schedule a call?');title.id='schedule-title';
 const disclaimer=el('p','Scheduling a call does not create an attorney-client relationship or automatically modify or expand the scope of any existing representation. Any new or additional work must be separately agreed to with Venture Branding.');disclaimer.id='schedule-disclaimer';
 const unavailable=el('p','Online scheduling is not connected yet. No appointment has been booked and no request has been submitted.');
 const back=el('button','Back to mark details');back.type='button';back.className='mark-primary';back.addEventListener('click',()=>dialog.close());
 dialog.append(title,disclaimer,unavailable,back);main.append(form,dialog);
 form.addEventListener('submit',event=>{event.preventDefault();dialog.showModal();});
 dialog.addEventListener('close',()=>button.focus());
}
