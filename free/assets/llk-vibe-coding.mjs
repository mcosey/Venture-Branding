import {renderReadingGuide} from './llk-reading.mjs';
export const vibeResources=[
 ['The Legal Risks of Vibe Coding: What Founders Should Know Before Launching','the-legal-risks-of-vibe-coding'],
 ['Can I Use AI to Create My Business Logo?','can-i-use-ai-to-create-my-business-logo']
];
export const vibeChecklist=[
 ['Tracking tools and cookies','When asked to add analytics or advertising features, AI agents may install cookies, tracking pixels, or other tools you did not specifically request. A cookie banner may appear without actually controlling those tools. Depending on the technology, information involved, and applicable law, this can raise disclosure, consent, or opt-out questions.'],
 ['Third-party images and code','To complete a design or feature, an AI agent may select images, fonts, templates, or software libraries from outside sources. Those materials may carry copyright or licensing restrictions, including conditions on commercial use, attribution, or distribution. Their appearance in an AI-built product does not establish that the business has unrestricted rights to use them.'],
 ['Rights in AI-generated work','An AI agent may generate substantial portions of a site or application. The platform’s output terms and the human contributions to the finished work can affect the rights the business possesses. Contractual rights to use an output and copyright protection are separate questions; generating a product does not necessarily give the business exclusive rights in every element.'],
 ['Data sharing and privacy promises','AI agents may connect features to outside services or generate privacy language without matching it to the finished application. The product might send information to an analytics or AI provider, or retain uploads after a policy says they are deleted. Differences between actual practices and published promises can raise privacy and consumer-protection questions.'],
 ['Access to user data','An AI agent may build a working login screen while leaving database permissions, file storage, or credentials inadequately protected. A user might be able to access someone else’s records even though the application appears to work normally. Depending on the information and circumstances, these weaknesses or a resulting incident can have legal consequences.'],
 ['Accessibility','AI agents may focus on appearance and visible functionality while overlooking keyboard navigation, screen-reader support, or accessible forms. They may also generate accessibility statements that overstate what the site supports. Barriers to using the product and inaccurate accessibility claims can raise legal questions, depending on the business and applicable law.'],
 ['Automated emails and texts','An AI agent may connect registration, abandoned carts, or other activity to promotional emails or texts without building the corresponding consent or opt-out features. Marketing messages and operational messages can be treated differently, and email and text-message rules differ. The potential legal issues depend on the message, sending technology, recipients, and applicable law.'],
 ['Subscriptions and cancellation','An AI agent may successfully connect recurring payments or a free trial while overlooking how renewal terms are presented or how customers cancel. Charging correctly is only one part of the experience. Disclosures, consent to recurring charges, and cancellation arrangements can raise consumer-protection questions under the laws that apply to the service.'],
 ['Chatbot responses','An AI agent may add a support chatbot with an open-ended prompt that lets it improvise answers about prices, refunds, or services. Those answers may differ from the business’s actual policies or suggest commitments it did not intend to make. Misleading responses can raise questions about the business’s responsibility for information presented to customers.'],
 ['User uploads and takedowns','An AI agent can add file uploads or public posts as a simple feature, creating a place where users can share material belonging to others. Copyright liability protections and notice-and-removal obligations may then become relevant. The legal significance depends on the service, the content involved, and the conditions of any applicable protection.']
];
export const vibeMilestones=[{
 id:'considerations',categoryId:'contracts',name:'Vibe Coding',href:'#vibe-coding/considerations',x:25,y:23,
 listTitle:'Vibe Coding Considerations',topics:vibeChecklist,
 explanation:'AI-assisted development can introduce features and behavior a founder did not specifically request or fully understand. These considerations explain how that can happen and why it may have legal significance.',
 resources:vibeResources
}];
export function isVibeConsiderationsRoute(hash){return hash===vibeMilestones[0].href||hash==='#milestone/considerations';}
export function renderVibeCoding(main){renderReadingGuide(main,vibeMilestones[0]);}
