export const vibeMilestones=[
 {id:'considerations',name:'Considerations',href:'#vibe-coding/considerations',x:50,y:17}
];
export const vibeResources=[
 ['The Legal Risks of Vibe Coding','the-legal-risks-of-vibe-coding'],
 ['Can I Use AI to Create My Business Logo?','can-i-use-ai-to-create-my-business-logo']
];
export function isVibeConsiderationsRoute(hash){return hash==='#vibe-coding/considerations';}

export function renderVibeConsiderations(main){
 const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href,cls='text-link')=>{const n=e('a',text,cls);n.href=href;return n;};
 const panel=(title,cls='')=>{const n=e('section',undefined,'panel '+cls);n.append(e('h2',title));return n;};
 const header=e('header',undefined,'page-heading');header.append(e('p','LEGAL LAUNCH KIT','eyebrow'));
 const crumbs=e('nav',undefined,'breadcrumbs');crumbs.setAttribute('aria-label','Breadcrumb');
 crumbs.append(link('Legal Launch Kit','#'),e('span','›'),link('Vibe Coding','#category/contracts'),e('span','›'),e('span','Considerations'));
 header.append(crumbs,e('h1','Considerations'),e('p','Explore the legal considerations involved in building software and brand assets with AI.','intro'));main.append(header);

 const summary=e('div',undefined,'workspace-summary');
 const category=panel('Vibe Coding');category.append(e('p','Building with AI involves more than the finished product.'),link('Back to Vibe Coding','#category/contracts'));
 const what=panel('What is this?');what.append(e('p','AI-generated software and brand assets can raise questions about privacy, security, accessibility, ownership, and third-party rights. Explore the articles below for context.'));
 summary.append(category,what);main.append(summary);

 const layout=e('div',undefined,'milestone-layout');
 // Keep the checklist empty until its tasks have been agreed with the user.
 const checklist=panel('Milestone checklist','vibe-checklist');
 const resources=panel('Resources');resources.append(e('p','Read more in the Venture Branding library.','muted'));
 for(const [title,slug]of vibeResources)resources.append(link(title,'../blog/posts/'+slug+'.html','resource'));
 layout.append(checklist,resources);main.append(layout);
}
