export const vibeResources=[
 ['The Legal Risks of Vibe Coding','the-legal-risks-of-vibe-coding'],
 ['Can I Use AI to Create My Business Logo?','can-i-use-ai-to-create-my-business-logo']
];
export const vibeChecklist=[
 ['Read Venture Branding resources on vibe coding.','The articles in Resources provide general background on AI-assisted development and AI-generated business logos.'],
 ['Consider whether to consult an attorney about your site or application.','The resources provide general background. A consultation is available if you would like help with questions about your particular site or application.']
];
export const vibeMilestones=[{
 id:'considerations',categoryId:'contracts',name:'Considerations',href:'#vibe-coding/considerations',x:50,y:17,
 intro:'Explore Venture Branding’s resources on vibe coding.',
 explanation:'A place to explore Venture Branding’s resources on vibe coding and consider whether a consultation would be useful for your site or application.',
 tasks:vibeChecklist.map(([title])=>title),taskDetails:vibeChecklist.map(([,detail])=>detail),
 resources:vibeResources,questions:[],planner:false
}];
export function isVibeConsiderationsRoute(hash){return hash===vibeMilestones[0].href;}
