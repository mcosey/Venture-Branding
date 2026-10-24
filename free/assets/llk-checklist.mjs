// Keep completion separate from the native disclosure control.
export function createChecklistItem({title,detail,index,checked,open=false,onChange,onToggle}){
 const input=document.createElement('input');input.type='checkbox';input.id='task-'+index;input.checked=checked;
 input.addEventListener('change',()=>onChange(input.checked));
 if(!detail){
  const label=document.createElement('label');label.className='task';
  const text=document.createElement('span');text.textContent=title;label.append(input,text);return label;
 }
 const row=document.createElement('div');row.className='task task--expandable';
 const disclosure=document.createElement('details');disclosure.className='task-details';disclosure.open=open;
 const summary=document.createElement('summary');summary.id='task-title-'+index;summary.textContent=title;
 input.setAttribute('aria-labelledby',summary.id);
 const context=document.createElement('p');context.id='task-context-'+index;context.textContent=detail;
 disclosure.append(summary,context);disclosure.addEventListener('toggle',()=>onToggle?.(disclosure.open));
 row.append(input,disclosure);return row;
}
