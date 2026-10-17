const key='vb-test-engagement-invitation';
export function validInvitationId(value){return typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);}
export function pendingInvitation(storage,search=''){
 const value=new URLSearchParams(search).get('invitation');
 if(validInvitationId(value)){try{storage.setItem(key,value);}catch{}return value;}
 try{const stored=storage.getItem(key);return validInvitationId(stored)?stored:null;}catch{return null;}
}
export function invitationDestination(route,invitation){
 if(!validInvitationId(invitation)||!['member.html','portal.html','signup.html'].includes(route))return route;
 return (route==='signup.html'?route:'invitation.html')+'?invitation='+encodeURIComponent(invitation);
}
export function clearInvitation(storage){try{storage.removeItem(key);}catch{}}
