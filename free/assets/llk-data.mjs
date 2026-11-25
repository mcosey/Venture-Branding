import {brandMilestones} from './llk-trademark.mjs';
import {ongoingTopics,ongoingMilestones} from './llk-obligations.mjs';

export const categories = [
 {id:'formation',name:'Formation & structure',icon:'◇',description:'Choose a structure and document how your business will operate.',x:50,y:18},
 {id:'brand',name:'Brand protection',icon:'◎',description:'Explore names, trademarks, and brand strategy.',x:72.27,y:48.35},
 {id:'contracts',name:'Web & App',icon:'≡',description:'Explore vibe coding and common considerations for a business website.',x:27.73,y:48.35},
 {id:'compliance',name:'Ongoing obligations',icon:'✓',description:'Explore ongoing obligations for your business.',x:50,y:79.67}
];
export const milestones = [
 {id:'entity',name:'Business structure',icon:'◇',x:24,y:23,
  intro:'Explore entity type, formation state, legal name, and management structure.',
  explanation:'This checklist covers the entity type, state of formation, legal entity name, and management structure.',
  // New slots receive the latest choices from Initial Steps without reviving
  // older Business Structure checkmarks after an explicit uncheck.
  progressIndices:[12,13,14,7],progressLength:15,
  tasks:['Decided entity type.','Choose the state of formation.','Choose the legal entity name.','Choose the management structure.'],
  taskDetails:[
   'Choose the legal form for the business, such as an LLC or corporation.',
   'Select the state in which the entity will be formed. This is a separate choice from where it will operate.',
   'The legal entity name is the formal name that appears in the state’s records and may differ from the name used for branding. Founders may need to consider name availability and state-specific naming conventions, requirements, and restrictions.',
   'Choose how management authority will be organized. For an LLC, this may involve member-managed or manager-managed arrangements.'
  ],
  resources:[['Founders, owners, directors, and managers','founders-owners-directors-and-managers-who-actually-runs-a-startup'],['Why incorporate in Delaware?','why-incorporate-in-delaware'],['Qualified small business stock (QSBS)','what-is-qualified-small-business-stock-qsbs-and-why-should-founders-care']]
 },
 {id:'founders',name:'Founders’ agreement',icon:'♧',x:75,y:23,
  intro:'Document expectations around ownership, responsibilities, decisions, and departures.',
  explanation:'Founders’ arrangements describe how the founders will work together. These terms can appear in a founders’ agreement or across the company’s equity, IP, and governing documents.',
  // Keep saved positions stable after removing the conflicts and compensation items.
  progressIndices:[4,5,6,7,8,9,10,11,12,13,16,17,18],progressLength:19,
  tasks:[
   'Define each founder’s role.',
   'Agree on each founder’s contributions.',
   'Agree on the founders’ ownership split.',
   'Decide whether founder equity will vest.',
   'Agree on decision-making authority.',
   'Choose a process for resolving deadlocks.',
   'Agree on founder-departure terms.',
   'Decide on ownership-transfer restrictions.',
   'Agree on confidentiality obligations.',
   'Document founder IP assignments.',
   'Agree on outside business activities.',
   'Agree on what happens if the venture ends.',
   'Sign the founders’ agreement.'
  ],
  taskDetails:[
   'A founder’s responsibilities may differ from their ownership percentage or formal title.',
   'Contributions can include money, services, equipment or intellectual property.',
   'This captures the ownership allocation agreed among the founders.',
   'Vesting connects a founder’s equity rights to continued participation or other agreed conditions.',
   'Day-to-day decisions and major company decisions may involve different approval rights.',
   'A deadlock occurs when the required decision-makers cannot reach an agreement.',
   'A founder’s departure can affect their role, equity and continuing obligations.',
   'These terms address a founder’s ability to transfer their ownership interest to someone else.',
   'These provisions address the treatment of nonpublic company information.',
   'Assignments address the company’s rights in business-related IP contributed or developed by its founders. The documentation can cover existing IP and future work, with transfer timing depending on whether the entity exists.',
   'Founders may have different expectations about other ventures and time commitments.',
   'Ending the collaboration can raise questions about its assets, IP and continuing obligations.',
   'The signed agreement records the terms accepted by its parties.'
  ],
  resources:[
   ['Founders’ Agreements: What Co-Founders Should Agree on Before Starting a Business','founders-agreements'],
   ['Founder Equity: How to Divide Ownership and Structure Vesting','founder-equity-how-to-divide-ownership-and-structure-vesting'],
   ['What Happens When a Co-Founder Leaves Your Startup?','what-happens-when-a-co-founder-leaves-your-startup'],
   ['Founders, Owners, Directors, and Managers: Who Actually Runs a Startup?','founders-owners-directors-and-managers-who-actually-runs-a-startup']
  ]
 },
 {id:'governance',name:'Governing documents',icon:'≡',x:20,y:70,
  intro:'Establish the rules for how your business will operate and make decisions.',
  explanation:'Governing documents describe the company’s internal rules, including decision-making, leadership and voting. The documents depend on the entity type and applicable state law.',
  // Preserve saved positions; the storage item now appears only in Initial Steps.
  progressIndices:[4,5,6,7,8,9,11],progressLength:12,
  tasks:[
   'Identify the governing documents.',
   'Define the amendment process.',
   'Set decision-making procedures.',
   'Define leadership selection rules.',
   'Establish voting rights.',
   'Set approval thresholds.',
   'Adopt the governing documents.'
  ],
  taskDetails:[
   'The governing documents a business uses depend on its entity type and applicable state law. Examples include corporate bylaws and LLC operating agreements.',
   'The amendment process describes how the governing documents can be changed.',
   'These procedures describe how company decisions are made, such as through meetings or written approvals.',
   'These rules describe how directors, managers or officers are appointed, removed or replaced.',
   'Voting rights describe who participates in decisions and how their votes are counted.',
   'Approval thresholds describe the level of approval needed for different decisions, such as a majority or unanimous approval.',
   'Adoption is the formal approval or execution of the applicable governing documents.'
  ],
  resources:[
   ['Business structure','#milestone/entity'],
   ['Founders, Owners, Directors, and Managers: Who Actually Runs a Startup?','founders-owners-directors-and-managers-who-actually-runs-a-startup'],
   ["Founders’ Agreements: What Co-Founders Should Agree on Before Starting a Business",'founders-agreements']
  ]
 },
 {id:'consents',name:'Initial Steps',icon:'✓',x:75,y:70,
  intro:'Plan registered-agent designation, formation filings, initial resolutions, and business records.',
  explanation:'This checklist brings together a registered agent where required, formation filings, initial authorizing resolutions, implementation and tax questions, and a place for company documents and records.',
  // Retained tasks keep their positions. Moved formation steps use new slots.
  progressIndices:[10,11,6,5,3],progressLength:12,
  tasks:[
   'Designate a registered agent (if required).',
   'File required formation document(s).',
   'Initial authorizing resolutions.',
   'Discuss implementation and time-sensitive tax issues with advisors.',
   'Choose where to store and organize the governing documents and business records.'
  ],
  taskDetails:[
   'Identify who will receive legal papers for the entity. The required designation and address depend on the state.',
   'Submit the documents used to form the entity, such as articles of organization or a certificate of incorporation.',
   'Written resolutions record the initial actions formally approved by the company’s authorized decision-makers.',
   'Implementation can involve tax questions with timing implications, including Section 83(b) elections where applicable.',
   'A central location keeps current versions, signed copies and later amendments organized. Google Drive, Microsoft OneDrive and Dropbox are examples of document-storage services with options for limiting who can access or edit files.'
  ],
  resources:[
   ['What Is a Registered Agent, and Does Your Startup Need One?','what-is-a-registered-agent-and-does-your-startup-need-one'],
   ['Initial Authorizing Resolutions: What Happens After You Form Your Company?','initial-authorizing-resolutions-what-happens-after-you-form-your-company'],
   ['Understanding Startup Capitalization: Authorized Stock, Outstanding Shares, and Fully Diluted Ownership','understanding-startup-capitalization'],
   ['Understanding Section 83(b) Elections: Tax Consequences, Filing Requirements, and Startup Equity','understanding-section-83b-elections'],
   ["Founders’ Agreements: What Co-Founders Should Agree on Before Starting a Business",'founders-agreements']
  ]
 }
];
// Active checklists drive routes and roadmap status.
// Keep `milestones` as the Formation group for its existing category layout.
export const savedMilestones=[...milestones,...brandMilestones,...ongoingMilestones];
// Keep the retired row readable and resettable without displaying a second page.
export const storedMilestones=[...savedMilestones,{id:'equity',tasks:[],progressLength:4}];
export function taskProgressIndex(m,index){
 if(index===m.tasks.length&&m.progressLength)return m.progressLength;
 return m.progressIndices?.[index]??(m.progressOffset||0)+index;
}
export function emptyProgress(){return {version:1,tasks:{},notes:{}};}
export function decodeProgress(raw){
 const result=emptyProgress();
 try{const data=JSON.parse(raw);if(data?.version!==1)return result;
 for(const m of storedMilestones){result.tasks[m.id]=Array.from({length:taskProgressIndex(m,m.tasks.length)},(_,i)=>data.tasks?.[m.id]?.[i]===true);if(typeof data.notes?.[m.id]==='string')result.notes[m.id]=data.notes[m.id].slice(0,3000);}
 // Carry over only the two retained ownership tasks. Once a combined-page value
 // exists, including an explicit false, the retired row must not override it.
 for(const [target,source]of [[4,2],[5,3]])if(data.tasks?.consents?.[target]===undefined)result.tasks.consents[target]=data.tasks?.equity?.[source]===true;
 // Moved entity choices keep their original completion until the Initial Steps
 // row records a value. An explicit uncheck on that page takes precedence.
 for(const [target,source]of [[7,4],[8,5],[9,6]])if(data.tasks?.consents?.[target]===undefined)result.tasks.consents[target]=data.tasks?.entity?.[source]===true;
 // Choices now return to Business Structure. The latest Initial Steps value,
 // including false, wins over their older Business Structure positions.
 for(const [target,source]of [[12,7],[13,8],[14,9]])if(data.tasks?.entity?.[target]===undefined)result.tasks.entity[target]=result.tasks.consents[source];
 // Registered-agent designation and formation filings move in the other direction.
 for(const [target,source]of [[10,8],[11,10]])if(data.tasks?.consents?.[target]===undefined)result.tasks.consents[target]=data.tasks?.entity?.[source]===true;
 }catch{}return result;
}
export function milestoneStatus(progress,m){const done=m.tasks.filter((_,i)=>progress.tasks[m.id]?.[taskProgressIndex(m,i)]===true).length;return {done,total:m.tasks.length,percent:Math.round(done/m.tasks.length*100),label:done===m.tasks.length?'Completed':done?'In progress':'Not started'};}

// Satellite coordinates locate the small circles; labels sit outside each cluster.
export const categoryTasks = {
 formation:[{name:'Business structure',id:'entity',x:50,y:7.33,side:'top'},{name:'Founders’ agreement',id:'founders',x:45.41,y:9.26,side:'left'},{name:'Governing documents',id:'governance',x:57.52,y:14.35,side:'right'},{name:'Initial Steps',id:'consents',x:54.59,y:9.26,side:'right'}],
 brand:[{name:'Trademark Protection',id:'trademarks',href:'#brand-protection/trademarks',x:77,y:19.33,side:'top'}],
 contracts:[{name:'Vibe Coding',id:'considerations',href:'#vibe-coding/considerations',x:20,y:43,side:'left'},{name:'Website Basics',href:'#website/basics',x:20,y:54,side:'left'}],
 compliance:ongoingTopics.map(({id,...topic})=>({...topic,...(ongoingMilestones.some(m=>m.id===id)?{id}:{})}))
};
