import {createChecklistItem} from './llk-checklist.mjs';

export const vibeMilestones=[
 {id:'considerations',name:'Considerations',href:'#vibe-coding/considerations',x:50,y:17}
];
export const vibeResources=[
 ['The Legal Risks of Vibe Coding','the-legal-risks-of-vibe-coding'],
 ['Can I Use AI to Create My Business Logo?','can-i-use-ai-to-create-my-business-logo']
];
export const vibeChecklist=[
 ['Read Venture Branding resources on vibe coding.','The articles in Resources provide general background on AI-assisted development and AI-generated business logos.'],
 ['Consider whether to consult an attorney about your site or application.','The resources provide general background. A consultation is available if you would like help with questions about your particular site or application.']
];
export function isVibeConsiderationsRoute(hash){return hash==='#vibe-coding/considerations';}

export function renderVibeConsiderations(main){
 const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href,cls='text-link')=>{const n=e('a',text,cls);n.href=href;return n;};
 const panel=(title,cls='')=>{const n=e('section',undefined,'panel '+cls);n.append(e('h2',title));return n;};
 const header=e('header',undefined,'page-heading');header.append(e('p','LEGAL LAUNCH KIT','eyebrow'));
 const crumbs=e('nav',undefined,'breadcrumbs');crumbs.setAttribute('aria-label','Breadcrumb');
 crumbs.append(link('Legal Launch Kit','#'),e('span','›'),link('Vibe Coding','#category/contracts'),e('span','›'),e('span','Considerations'));
 header.append(crumbs,e('h1','Considerations'),e('p','Explore Venture Branding’s resources on vibe coding.','intro'));main.append(header);

 const summary=e('div',undefined,'workspace-summary');
 const category=panel('Vibe Coding');category.append(e('p','Building with AI involves more than the finished product.'),link('Back to Vibe Coding','#category/contracts'));
 const what=panel('What is this?');what.append(e('p','A place to explore Venture Branding’s resources on vibe coding and consider whether a consultation would be useful for your site or application.'));
 summary.append(category,what);main.append(summary);

 const layout=e('div',undefined,'milestone-layout');
 const checklist=panel('Milestone checklist','vibe-checklist');
 checklist.append(e('p','Open an item for a short explanation.','muted'));
 let taskIndex=0;
 function reviewItem(title,detail){
  const row=createChecklistItem({title,detail,index:taskIndex++,checked:false});
  // Content review only: do not imply that this new milestone has account saving.
  row.children[0].disabled=true;
  return row;
 }
 for(const [title,detail]of vibeChecklist)checklist.append(reviewItem(title,detail));
 const resources=panel('Resources');resources.append(e('p','Read more in the Venture Branding library.','muted'));
 for(const [title,slug]of vibeResources)resources.append(link(title,'../blog/posts/'+slug+'.html','resource'));
 layout.append(checklist,resources);main.append(layout);
}
