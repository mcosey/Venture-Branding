import {renderReadingGuide} from './llk-reading.mjs';
export const websiteBasics={
 id:'website-basics',categoryId:'contracts',name:'Website Basics',href:'#website/basics',x:75,y:23
};
export const websiteTopics=[
 ['Accessibility','Accessibility concerns how people with disabilities navigate and use a website, including with keyboards, screen readers, or other assistive tools. A site can look finished while forms, menus, or other features remain difficult to use. Barriers may have legal significance depending on the business, the services offered, and applicable law.'],
 ['Terms of Service','Terms of Service describe the rules for using a website and the relationship between the provider and its users. Their relevance and content can vary with features such as accounts, purchases, or user uploads. Terms copied from another business may describe different services or include commitments that do not reflect how the site operates.'],
 ['Privacy Policy','Forms, accounts, analytics, and outside services can collect or receive information about visitors. A privacy policy describes a business’s information practices, which may include collection, use, sharing, and retention. Applicable disclosure requirements can depend on the business, information, users, and jurisdictions involved. Differences between a policy’s statements and the site’s actual behavior can also raise legal questions.'],
 ['Cookies and tracking','Cookies and similar technologies can remember preferences, measure visits, or share information with advertising providers. Different uses may involve different disclosure, consent, or opt-out considerations under applicable law. A visible cookie banner does not, by itself, show what the underlying tools collect or whether they follow the choices presented to visitors.']
];
export function renderWebsiteBasics(main){
 renderReadingGuide(main,{...websiteBasics,listTitle:'Website Considerations',topics:websiteTopics,
  explanation:'Four topics that may be relevant when launching or operating a business website. Each consideration explains what the topic involves and why it may matter, depending on the website and the business behind it.',
  resources:[['The Legal Risks of Vibe Coding: What Founders Should Know Before Launching','the-legal-risks-of-vibe-coding']]
 });
}
