import {createChecklistItem} from './llk-checklist.mjs';
import {categories,milestoneStatus,taskProgressIndex} from './llk-data.mjs';

// All LLK checklists use this renderer and the existing account progress store.
export function renderSavedMilestone(main,{milestone:m,progress,expandedTasks=new Set(),onCheck}){
 const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href,cls='text-link')=>{const n=e('a',text,cls);n.href=href;return n;};
 const panel=(title,cls='')=>{const n=e('section',undefined,'panel '+cls);n.append(e('h2',title));return n;};
 const header=e('header',undefined,'page-heading'),nav=e('nav',undefined,'breadcrumbs');
 const category=categories.find(c=>c.id===(m.categoryId||'formation'));
 nav.setAttribute('aria-label','Breadcrumb');nav.append(link('Legal Launch Kit','#'),e('span','›'),link(category.name,'#category/'+category.id),e('span','›'),e('span',m.name));
 header.append(e('p','LEGAL LAUNCH KIT','eyebrow'),nav,e('h1',m.name));main.append(header);const s=milestoneStatus(progress,m);
 const summary=e('div',undefined,'workspace-summary');const p=panel(s.label,'progress-panel');
 p.append(e('p',s.done+' of '+s.total+' planning tasks checked'),e('strong',s.percent+'%','percent'));
 const bar=e('progress');bar.max=s.total;bar.value=s.done;bar.setAttribute('aria-label',m.name+' checklist progress');p.append(bar);
 const what=panel('What is this?');what.append(e('p',m.explanation));summary.append(p,what);main.append(summary);
 const layout=e('div',undefined,'milestone-layout');const tasks=panel('Milestone checklist');
 if(m.accountSavingReady===false)tasks.append(e('p','Checklist preview. Account saving will be connected before these checkboxes are enabled.','muted'));
 m.tasks.forEach((task,i)=>{
  const index=taskProgressIndex(m,i),key=m.id+':'+i;
  const item=createChecklistItem({title:task,detail:m.taskDetails?.[i],index:i,checked:progress.tasks[m.id]?.[index]===true,open:expandedTasks.has(key),disabled:m.accountSavingReady===false,
   onToggle:open=>{if(open)expandedTasks.add(key);else expandedTasks.delete(key);},
   onChange:checked=>{
    if(m.accountSavingReady===false)return;
    progress.tasks[m.id]??=Array.from({length:taskProgressIndex(m,m.tasks.length)},()=>false);
    progress.tasks[m.id][index]=checked;onCheck(m.id,i);
   }
  });
  tasks.append(item);
 });
 layout.append(tasks);const resources=panel('Resources');
 for(const title of m.pendingResources||[])resources.append(e('p',title+' (in preparation)','resource muted'));
 for(const [title,slug]of m.resources)resources.append(link(title,slug.startsWith('#')?slug:'../blog/posts/'+slug+'.html','resource'));
 layout.append(resources);main.append(layout);
 if(m.showConsultation){
  const consultation=panel('Let’s talk about your company’s brand.','llk-consultation');
  const booking=link('Book a consultation','https://calendly.com/venturebrandinglaw/30min','llk-consultation-button');
  booking.target='_blank';booking.rel='noopener noreferrer';
  consultation.append(booking);main.append(consultation);
 }
}
