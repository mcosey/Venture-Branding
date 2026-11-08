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
 header.append(e('p','LEGAL LAUNCH KIT','eyebrow'),nav,e('h1',m.name),e('p',m.intro,'intro'));main.append(header);const s=milestoneStatus(progress,m);
 const summary=e('div',undefined,'workspace-summary');const p=panel(s.label,'progress-panel');
 p.append(e('p',s.done+' of '+s.total+' planning tasks checked'),e('strong',s.percent+'%','percent'));
 const bar=e('progress');bar.max=s.total;bar.value=s.done;bar.setAttribute('aria-label',m.name+' checklist progress');p.append(bar);
 const what=panel('What is this?');what.append(e('p',m.explanation));summary.append(p,what);main.append(summary);
 const layout=e('div',undefined,'milestone-layout');const tasks=panel('Milestone checklist');
 tasks.append(e('p','Check tasks as you address them. You can uncheck them at any time.','muted'));
 m.tasks.forEach((task,i)=>{
  const index=taskProgressIndex(m,i),key=m.id+':'+i;
  tasks.append(createChecklistItem({title:task,detail:m.taskDetails?.[i],index:i,checked:progress.tasks[m.id]?.[index]===true,open:expandedTasks.has(key),
   onToggle:open=>{if(open)expandedTasks.add(key);else expandedTasks.delete(key);},
   onChange:checked=>{
    progress.tasks[m.id]??=Array.from({length:taskProgressIndex(m,m.tasks.length)},()=>false);
    progress.tasks[m.id][index]=checked;onCheck(m.id,i);
   }
  }));
 });
 layout.append(tasks);const resources=panel('Resources');resources.append(e('p','Read more in the Venture Branding library.','muted'));
 for(const [title,slug]of m.resources)resources.append(link(title,'../blog/posts/'+slug+'.html','resource'));
 layout.append(resources);main.append(layout);
}
