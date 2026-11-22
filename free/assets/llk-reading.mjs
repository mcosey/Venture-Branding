// Reading guides have disclosures and resources, without completion or saving controls.
export function renderReadingGuide(main,{name,explanation,listTitle,topics,resources=[]}){
 const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href,cls='text-link')=>{const n=e('a',text,cls);n.href=href;return n;};
 const header=e('header',undefined,'page-heading'),nav=e('nav',undefined,'breadcrumbs');
 nav.setAttribute('aria-label','Breadcrumb');nav.append(link('Legal Launch Kit','#'),e('span','›'),link('Web & App','#category/contracts'),e('span','›'),e('span',name));
 header.append(e('p','LEGAL LAUNCH KIT','eyebrow'),nav,e('h1',name));main.append(header);
 const what=e('section',undefined,'panel');what.append(e('h2','What is this?'),e('p',explanation));main.append(what);
 const layout=e('div',undefined,'milestone-layout'),list=e('section',undefined,'panel');list.append(e('h2',listTitle));
 for(const [title,context]of topics){
  const row=e('div',undefined,'task task--expandable'),disclosure=e('details',undefined,'task-details');
  disclosure.append(e('summary',title),e('p',context));row.append(disclosure);list.append(row);
 }
 const resourcePanel=e('section',undefined,'panel');resourcePanel.append(e('h2','Resources'));
 for(const [title,slug]of resources)resourcePanel.append(link(title,'../blog/posts/'+slug+'.html','resource'));
 layout.append(list,resourcePanel);main.append(layout);
}
