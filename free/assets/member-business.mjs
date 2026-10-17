export function renderAccountBusiness(main,{e,link,panel,heading},context,onNameSaved){
 heading('Company profile','A few basics to help organize your planning.');main.append(link('← Back to the map','#'));
 if(!context.company){main.append(panel('Your company profile is not set up yet.'));return;}
 const company=context.company;const card=panel(company.name);const form=e('form');form.className='business-form';const grid=e('div',undefined,'business-fields');const inputs={};
 for(const [key,labelText,type,max] of [['name','Company or working name','text',120],['launch_date','Planned launch date (optional)','date'],['industry','Industry (optional)','text',100],['stage','Business stage (optional)','text',40],['entity_type','Entity type (optional)','text',80],['country','Country (optional)','text',80],['region','State or region (optional)','text',80]]){
  const wrap=e('div',undefined,'business-field'),label=e('label',labelText),input=e('input');input.id='account-company-'+key;label.htmlFor=input.id;input.type=type;input.value=company[key]||'';if(max)input.maxLength=max;if(key==='name')input.required=true;inputs[key]=input;wrap.append(label,input);grid.append(wrap);
 }
 const save=e('button','Save company profile','primary');save.type='submit';const status=e('p',undefined,'business-save-status');status.setAttribute('role','status');
 form.append(grid,e('p','Please avoid confidential legal details. Your launch date is for planning, not calculating legal deadlines.','muted'),save,status);
 form.addEventListener('input',()=>{save.textContent='Save company profile';status.textContent='';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(save.disabled||!form.reportValidity())return;save.disabled=true;
  const values=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value.trim()]));values.launch_date=values.launch_date||null;
  try{
   const result=await context.db.from('vb_member_companies').update(values).eq('id',company.id).select('id').single();
   if(result.error||!result.data)throw Error('Save failed');Object.assign(company,values);onNameSaved(company.name);save.textContent='✓ Saved';status.textContent='Company profile saved.';
  }catch{status.textContent='Unable to save your changes. Please try again.';}finally{save.disabled=false;}
 });card.append(form);main.append(card);
}
