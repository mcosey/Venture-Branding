export const websiteBasics={
 id:'website-basics',categoryId:'contracts',name:'Website Basics',href:'#website/basics',x:75,y:23,
 intro:'Explore common considerations for a business website.'
};
export const websiteTopics=[
 ['Accessibility','How visitors with disabilities experience and use a website.'],
 ['Terms of Service','The terms that describe the relationship between a website and its users.'],
 ['Privacy Policy','Information about a website’s collection, use, and sharing of personal information.'],
 ['Cookies and tracking','Technologies that can remember preferences or collect information about website activity.']
];
export function renderWebsiteBasics(main){
 const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,href)=>{const n=e('a',text,'text-link');n.href=href;return n;};
 const header=e('header',undefined,'page-heading'),nav=e('nav',undefined,'breadcrumbs');
 nav.setAttribute('aria-label','Breadcrumb');nav.append(link('Legal Launch Kit','#'),e('span','›'),link('Web & App','#category/contracts'),e('span','›'),e('span',websiteBasics.name));
 header.append(e('p','LEGAL LAUNCH KIT','eyebrow'),nav,e('h1',websiteBasics.name),e('p',websiteBasics.intro,'intro'));main.append(header);
 const what=e('section',undefined,'panel');what.append(e('h2','What is this?'),e('p','A place to explore website accessibility, user-facing terms, privacy disclosures, and cookies or tracking technologies.'));main.append(what);
 const topics=e('div',undefined,'milestone-layout');
 for(const [title,context]of websiteTopics){const panel=e('section',undefined,'panel');panel.append(e('h2',title),e('p',context));topics.append(panel);}
 main.append(topics);
}
