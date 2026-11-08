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
 ['Can I Trademark My App Icon?','can-i-trademark-my-app-icon'],
 ['How Do I Know If My Trademark Is Available?','how-do-i-know-if-my-trademark-is-available'],
 ["Who Should Own My Startup’s Trademark?",'who-should-own-my-startups-trademark'],
 ['Can I License My Trademark to Another Business?','can-i-license-my-trademark-to-another-business'],
 ['What Happens After I File a Trademark Application?','what-happens-after-i-file-a-trademark-application'],
 ['Can I Protect My Trademark Internationally?','can-i-protect-my-trademark-internationally'],
 ['How Long Does a Trademark Last?','how-long-does-a-trademark-last'],
 ['What Happens If Someone Starts Using My Trademark?','what-happens-if-someone-starts-using-my-trademark']
];
export const brandMilestones=[{
 id:'trademarks',categoryId:'brand',name:'Trademark Protection',href:'#brand-protection/trademarks',x:50,y:17,
 intro:'Explore ownership, clearance and registration for your business’s trademarks.',
 explanation:'A planning checklist for the initial trademark-protection process. The resources also cover maintaining trademark rights and responding to others’ use.',
 tasks:trademarkChecklist.map(([title])=>title),taskDetails:trademarkChecklist.map(([,detail])=>detail),
 resources:trademarkResources,questions:[],planner:false
}];
export function isTrademarkProtectionRoute(hash){return hash===brandMilestones[0].href;}
