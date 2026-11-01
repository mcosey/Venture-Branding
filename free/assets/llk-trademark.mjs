import {createChecklistItem} from './llk-checklist.mjs';

export const brandMilestones=[
 {id:'trademarks',name:'Trademark Protection',href:'#brand-protection/trademarks',x:50,y:17}
];
export const trademarkChecklist=[
 ['Identify the trademarks to protect.','A business may use its name, logo, product names or slogans as trademarks.'],
 ['Confirm trademark ownership.','The owner may be an individual or an entity, depending on the circumstances.'],
 ['Complete a trademark clearance review.','Clearance examines potential conflicts with existing trademark rights.'],
 ['Decide whether to seek registration.','Registration is a separate decision from choosing and using a trademark.'],
 ['Choose where to seek registration, if applicable.','The relevant jurisdictions depend on the business’s activities and plans.'],
 ['Submit the selected trademark applications, if applicable.','Filing begins the examination process; it does not itself establish registration.']
];
export const trademarkResources=[
 ['What Is a Trademark?','what-is-a-trademark'],
 ['How Do I Know If My Trademark Is Available?','how-do-i-know-if-my-trademark-is-available'],
 ["Who Should Own My Startup’s Trademark?",'who-should-own-my-startups-trademark'],
 ['What Happens After I File a Trademark Application?','what-happens-after-i-file-a-trademark-application'],
 ['Can I Protect My Trademark Internationally?','can-i-protect-my-trademark-internationally'],
 ['How Long Does a Trademark Last?','how-long-does-a-trademark-last'],
 ['What Happens If Someone Starts Using My Trademark?','what-happens-if-someone-starts-using-my-trademark']
];
export function isTrademarkProtectionRoute(hash){return hash==='#brand-protection/trademarks';}

export function renderTrademarkProtection(main){
 const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href,cls='text-link')=>{const n=e('a',text,cls);n.href=href;return n;};
 const panel=(title,cls='')=>{const n=e('section',undefined,'panel '+cls);n.append(e('h2',title));return n;};
 const header=e('header',undefined,'page-heading');header.append(e('p','LEGAL LAUNCH KIT','eyebrow'));
 const crumbs=e('nav',undefined,'breadcrumbs');crumbs.setAttribute('aria-label','Breadcrumb');
 crumbs.append(link('Legal Launch Kit','#'),e('span','›'),link('Brand protection','#category/brand'),e('span','›'),e('span','Trademark Protection'));
 header.append(crumbs,e('h1','Trademark Protection'),e('p','Explore ownership, clearance and registration for your business’s trademarks.','intro'));main.append(header);

 const summary=e('div',undefined,'workspace-summary');
 const category=panel('Brand protection');category.append(e('p','Names, logos and other marks can help distinguish your business.'),link('Back to Brand protection','#category/brand'));
 const what=panel('What is this?');what.append(e('p','A planning checklist for the initial trademark-protection process. The resources also cover maintaining trademark rights and responding to others’ use.'));
 summary.append(category,what);main.append(summary);

 const layout=e('div',undefined,'milestone-layout');
 const checklist=panel('Milestone checklist','review-checklist');
 checklist.append(e('p','Open an item for a short explanation. Checkboxes are inactive while this checklist is under review.','muted'));
 trademarkChecklist.forEach(([title,detail],index)=>{
  const row=createChecklistItem({title,detail,index,checked:false});
  // The account progress service supports Formation only. Review must not write to it.
  row.children[0].disabled=true;row.children[0].setAttribute('data-review-only','true');checklist.append(row);
 });
 const resources=panel('Resources');resources.append(e('p','Read more in the Venture Branding library.','muted'));
 for(const [title,slug]of trademarkResources)resources.append(link(title,'../blog/posts/'+slug+'.html','resource'));
 layout.append(checklist,resources);main.append(layout);
}
