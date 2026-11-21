export const taxMilestone={
 id:'ongoing-tax',categoryId:'compliance',name:'Tax',href:'#ongoing/tax',x:50,y:81,side:'bottom',
 accountSavingReady:false,
 intro:'Understand the documents, accounting support, and filing dates for your business.',
 explanation:'Tax filings depend on the business’s tax treatment and circumstances. This checklist organizes the documents, professional support, and dates involved.',
 tasks:[
  'Identify the tax documents your business needs.',
  'Find an accountant who handles business tax filings.',
  'Know important filing dates.'
 ],
 taskDetails:[
  'The documents involved can depend on the business’s entity type, tax treatment, location, and activities.',
  'Business tax experience can include preparing company returns, partnership returns, and applicable state filings.',
  'For calendar-year partnerships, the federal Form 1065 return is generally due March 15. If the date falls on a weekend or legal holiday, the due date moves to the next business day. Fiscal-year partnerships generally file by the 15th day of the third month after their tax year ends.'
 ],
 resources:[
  ['Business Tax Documents: The Basics Every Founder Should Know','business-tax-documents-the-basics-every-founder-should-know'],
  ['Business Tax Documents: Entity Elections, Employment Taxes, and Equity Compensation','business-tax-documents-entity-elections-employment-taxes-and-equity-compensation']
 ]
};
export const ipMilestone={
 id:'ongoing-ip',categoryId:'compliance',name:'Intellectual Property',href:'#ongoing/intellectual-property',x:75,y:23,side:'right',
 accountSavingReady:false,
 intro:'Keep track of your trademark, its use, and the goodwill associated with your brand.',
 explanation:'This checklist brings together trademark monitoring, use connected with an intent-to-use application, state trademark registrations, and brand goodwill.',
 tasks:[
  'Monitor your trademark.',
  'Track trademark use for an intent-to-use filing (if applicable).',
  'Consider state trademark registrations.',
  'Understand your brand’s goodwill.'
 ],
 taskDetails:[
  'Monitoring concerns newly filed marks and marketplace use that may affect your brand.',
  'For an intent-to-use application, when and how the mark is used can become relevant to the use-based filing stage. Records and specimens relate to that actual use.',
  'State trademark registration is separate from federal registration and from registering a business entity’s name. Its scope and requirements vary by state.',
  'Goodwill is the reputation and customer recognition associated with a business or brand.'
 ],
 resources:[
  ['What Is Goodwill, and Why Does Trademark Law Protect It?','what-is-goodwill-and-why-does-trademark-law-protect-it'],
  ['What Happens If Someone Starts Using My Trademark?','what-happens-if-someone-starts-using-my-trademark'],
  ['What Does “Use in Commerce” Mean for a Trademark?','what-does-use-in-commerce-mean-for-a-trademark'],
  ['What Is a Trademark Specimen?','what-is-a-trademark-specimen'],
  ["Don't Overlook Common-Law and State Trademarks",'dont-overlook-common-law-and-state-trademarks']
 ]
};
export const businessMilestone={
 id:'ongoing-business',categoryId:'compliance',name:'Business',href:'#ongoing/business',x:24,y:23,side:'left',
 accountSavingReady:false,
 intro:'Keep the company’s ownership and decision-making records organized.',
 explanation:'This checklist covers stock records, board meeting minutes, and resolutions documenting company decisions.',
 tasks:[
  'Stock ledger.',
  'Board minutes.',
  'Resolutions for decisions per your formation documents.'
 ],
 taskDetails:[
  'For corporations, a stock ledger records share ownership, issuances, and transfers.',
  'Minutes record what was considered or approved at a board meeting.',
  'Resolutions document formal approval of company decisions under the applicable formation and governing documents.'
 ],
 resources:[
  ['Initial Authorizing Resolutions: What Happens After You Form Your Company?','initial-authorizing-resolutions-what-happens-after-you-form-your-company']
 ]
};
export const governmentMilestone={
 id:'ongoing-government',categoryId:'compliance',name:'Government',href:'#ongoing/government',x:20,y:70,side:'left',
 accountSavingReady:false,
 intro:'Keep track of recurring filings and registrations relevant to your business.',
 explanation:'This checklist covers annual filing costs and dates, foreign qualification, and state and local registrations where applicable.',
 tasks:[
  'Know your annual filing costs and dates.',
  'Foreign qualifications (if necessary).',
  'State and local/county registration (if necessary).'
 ],
 taskDetails:[
  'Annual reports and similar recurring filings can have different fees and deadlines depending on the entity type and state.',
  'Foreign qualification refers to registering an entity to do business in a state other than its formation state.',
  'State, city, and county registration requirements can depend on where the business operates and its activities.'
 ],
 resources:[
  ['Know Before You Go: Does Your Business Need to Register in Other States? Understanding Foreign Qualification and Local Registration Requirements','know-before-you-go-does-your-business-need-to-register-in-other-states']
 ]
};
export const miscMilestone={
 id:'ongoing-misc',categoryId:'compliance',name:'Misc',href:'#ongoing/misc',x:81,y:70,side:'right',
 accountSavingReady:false,
 intro:'Organize account records and recurring administrative fees.',
 explanation:'This checklist covers account recordkeeping and recurring fees for registered agent and P.O. box services, where applicable.',
 tasks:[
  'Decide how and where to maintain account records.',
  'Keep up with registered agent fees (if applicable).',
  'Keep up with P.O. box fees (if applicable).'
 ],
 taskDetails:[
  'Account records can include statements, invoices, receipts, and related financial documents.',
  'A paid registered agent service may charge recurring fees tied to its service term.',
  'P.O. box rental fees can recur on the provider’s renewal schedule.'
 ],
 resources:[
  ['Business Tax Documents: The Basics Every Founder Should Know','business-tax-documents-the-basics-every-founder-should-know']
 ]
};
export const ongoingMilestones=[taxMilestone,ipMilestone,businessMilestone,governmentMilestone,miscMilestone].filter(m=>m.accountSavingReady);
export const ongoingTopics=[
 businessMilestone,
 ipMilestone,
 governmentMilestone,
 taxMilestone,
 miscMilestone
];
