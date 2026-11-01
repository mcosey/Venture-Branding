export const categories = [
 {id:'formation',name:'Formation & structure',icon:'◇',description:'Choose a structure and document how your business will operate.',x:50,y:18},
 {id:'brand',name:'Brand protection',icon:'◎',description:'Explore names, trademarks, and brand strategy.',x:77,y:30},
 {id:'ownership',name:'IP ownership',icon:'✧',description:'Understand who owns the work your business relies on.',x:77,y:61},
 {id:'contracts',name:'Vibe Coding',icon:'≡',description:'Explore legal considerations when building software and brand assets with AI.',x:23,y:30},
 {id:'people',name:'People & hiring',icon:'♧',description:'Consider your relationships with employees and contractors.',x:23,y:61},
 {id:'fundraising',name:'Fundraising',icon:'↗',description:'Explore financing, equity, and investor relationships.',x:37,y:84},
 {id:'compliance',name:'Ongoing obligations',icon:'✓',description:'Plan for filings, privacy, and other continuing obligations.',x:67,y:84}
];
export const milestones = [
 {id:'entity',name:'Business structure',icon:'◇',x:24,y:23,
  intro:'Explore the business structure that fits your ownership, operations, and financing plans.',
  explanation:'The right structure depends on your circumstances. Use this workspace to prepare for a conversation about entity choice; it does not select or form an entity for you.',
  // Reserve the four original planning-task positions so their saved checkmarks
  // cannot become completion of unrelated decisions in the revised checklist.
  progressOffset:4,
  tasks:['Decide entity choice.','Choose the state of formation.','Choose the legal entity name.','Choose the management structure.','Designate a registered agent, if required.','Confirm formation filing requirements.','File the formation document.','Determine whether registration in other states is required.'],
  taskDetails:[
   'Choose the legal form for the business, such as an LLC or corporation.',
   'Select the state in which the entity will be formed. This is a separate choice from where it will operate.',
   'Choose the formal name that will appear in the entity’s state records. It may differ from the name used for branding.',
   'Choose how management authority will be organized. For an LLC, this may involve member-managed or manager-managed arrangements.',
   'Identify who will receive legal papers for the entity. The required designation and address depend on the state.',
   'Check the selected state’s required formation documents, information, signatures, and fees.',
   'Submit the document used to form the entity, such as articles of organization or a certificate of incorporation.',
   'Identify states outside the formation state where the company’s activities may require foreign qualification.'
  ],
  questions:[],
  resources:[['Founders, owners, directors, and managers','founders-owners-directors-and-managers-who-actually-runs-a-startup'],['Why incorporate in Delaware?','why-incorporate-in-delaware'],['What is a registered agent?','what-is-a-registered-agent-and-does-your-startup-need-one'],['Qualified small business stock (QSBS)','what-is-qualified-small-business-stock-qsbs-and-why-should-founders-care']]
 },
 {id:'founders',name:'Founders’ agreement',icon:'♧',x:75,y:23,
  intro:'Document expectations around ownership, responsibilities, decisions, and departures.',
  explanation:'Founders’ arrangements describe how the founders will work together. These terms can appear in a founders’ agreement or across the company’s equity, IP, and governing documents.',
  // Keep the four original discussion-task positions separate from the revised items.
  progressOffset:4,
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
   'Identify conflicting obligations.',
   'Agree on founder compensation.',
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
   'Existing employment, consulting or other agreements can affect a founder’s contributions or IP rights.',
   'Salary or other compensation, if any, is separate from equity ownership.',
   'Founders may have different expectations about other ventures and time commitments.',
   'Ending the collaboration can raise questions about its assets, IP and continuing obligations.',
   'The signed agreement records the terms accepted by its parties.'
  ],
  questions:[],
  resources:[
   ['Founders’ Agreements: What Co-Founders Should Agree on Before Starting a Business','founders-agreements'],
   ['Founder Equity: How to Divide Ownership and Structure Vesting','founder-equity-how-to-divide-ownership-and-structure-vesting'],
   ['What Happens When a Co-Founder Leaves Your Startup?','what-happens-when-a-co-founder-leaves-your-startup'],
   ['Founders, Owners, Directors, and Managers: Who Actually Runs a Startup?','founders-owners-directors-and-managers-who-actually-runs-a-startup']
  ]
 },
 {id:'governance',name:'Governing documents',icon:'≡',x:20,y:70,intro:'Understand the documents that establish how your business makes decisions.',explanation:'Governing documents depend on the entity type and arrangements among its owners. This checklist helps organize the information needed to discuss those documents with counsel.',tasks:['Identify the entity type and current governing documents.','List who will manage the business and make major decisions.','Outline voting, approval, and dispute questions.','Discuss adoption and maintenance of governing documents with counsel.'],questions:['Which governing documents does our entity need?','Which decisions require owner or board approval?','How should we document decisions and retain records?'],resources:[['Founders’ agreements','founders-agreements']]},
 {id:'equity',name:'Initial ownership',icon:'◉',x:50,y:81,intro:'Plan how ownership will be allocated and properly documented.',explanation:'An agreed ownership split and the legal issuance of equity are different steps. Prepare your proposed arrangements and questions about authorization, documentation, vesting, and tax advice.',tasks:['List proposed owners and ownership allocations.','Record expected contributions and any vesting questions.','Identify questions about authorization and equity documentation.','Discuss implementation and time-sensitive tax issues with advisors.'],questions:['What approvals and documents are needed to issue ownership interests?','How will future financing affect ownership?','Are there time-sensitive tax steps we need to address?'],resources:[['Understanding startup capitalization','understanding-startup-capitalization'],['Understanding Section 83(b) elections','understanding-section-83b-elections']]},
 {id:'consents',name:'Initial decisions & records',icon:'✓',x:81,y:70,intro:'Organize the initial decisions and records your business may need.',explanation:'Required approvals and records vary by entity and situation. Use this workspace to collect questions and prepare to discuss the appropriate next steps.',tasks:['List the initial business decisions that need approval.','Identify who has authority to approve each decision.','Discuss required approvals and records with counsel.','Choose where to organize final business records.'],questions:['Which initial actions need formal approval?','Who should sign or approve those actions?','What records should we retain and update?'],resources:[['Founders’ agreements','founders-agreements']]}
];
export function taskProgressIndex(m,index){return (m.progressOffset||0)+index;}
export function emptyProgress(){return {version:1,tasks:{},notes:{}};}
export function decodeProgress(raw){
 const result=emptyProgress();
 try{const data=JSON.parse(raw);if(data?.version!==1)return result;
 for(const m of milestones){result.tasks[m.id]=Array.from({length:taskProgressIndex(m,m.tasks.length)},(_,i)=>data.tasks?.[m.id]?.[i]===true);if(typeof data.notes?.[m.id]==='string')result.notes[m.id]=data.notes[m.id].slice(0,3000);}
 }catch{}return result;
}
export function milestoneStatus(progress,m){const done=m.tasks.filter((_,i)=>progress.tasks[m.id]?.[taskProgressIndex(m,i)]===true).length;return {done,total:m.tasks.length,percent:Math.round(done/m.tasks.length*100),label:done===m.tasks.length?'Completed':done?'In progress':'Not started'};}

// Satellite coordinates locate the small circles; labels sit outside each cluster.
export const categoryTasks = {
 formation:[{name:'Business structure',id:'entity',x:50,y:7.33,side:'top'},{name:'Founders’ agreement',id:'founders',x:45.41,y:9.26,side:'left'},{name:'Governing documents',id:'governance',x:57.52,y:14.35,side:'right'},{name:'Initial ownership',id:'equity',x:42.48,y:14.35,side:'left'},{name:'Initial decisions',id:'consents',x:54.59,y:9.26,side:'right'}],
 brand:[{name:'Trademark Protection',href:'#brand-protection/trademarks',x:77,y:19.33,side:'top'}],
 ownership:[{name:'Assigning IP',x:82.66,y:53.46,side:'right'},{name:'Contractor IP',x:85.00,y:61.00,side:'right'},{name:'Open source',x:82.66,y:68.54,side:'right'}],
 contracts:[{name:'Considerations',href:'#vibe-coding/considerations',x:15,y:26,side:'left'}],
 people:[{name:'Employee or contractor',x:16.87,y:54.14,side:'left'},{name:'Offer letters',x:15.00,y:61.00,side:'left'},{name:'Workplace policies',x:16.87,y:67.86,side:'left'}],
 fundraising:[{name:'Term sheets',x:30.07,y:78.67,side:'left'},{name:'Investor rights',x:29.00,y:84.00,side:'left'},{name:'Diligence preparation',x:45.00,y:84.00,side:'right'}],
 compliance:[{name:'Annual filings',x:72.66,y:76.46,side:'right'},{name:'Tax questions',x:75.00,y:84.00,side:'right'},{name:'Data privacy',x:72.66,y:91.54,side:'right'}]
};
