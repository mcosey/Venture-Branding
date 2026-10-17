import {requireAccess} from './connection.mjs';
export function contactValues(name,email){
 name=name.trim();email=email.trim();
 if(!name||name.length>200)throw new Error('Enter a contact name (up to 200 characters).');
 if(email&&(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error('Enter a valid contact email.');
 return {name,email:email||null};
}
export async function saveContact(db,client,name,email){
 const values=contactValues(name,email);await requireAccess(db,'client');
 const {data,error}=await db.rpc('vb_update_my_contact',{target_client:client.id,expected_updated_at:client.updated_at,contact_name:values.name,contact_email:values.email});
 if(error)throw new Error(error.code==='40001'?'Details changed elsewhere. Reload this page and try again.':'Contact details could not be saved. Please try again later.');
 return data;
}
export async function changeEmail(db,email,origin){
 email=contactValues('Account',email).email;if(!email)throw new Error('Enter your new sign-in email.');
 const user=await requireAccess(db,'client');
 if(email.toLowerCase()===user.email?.toLowerCase())throw new Error('Enter a different sign-in email.');
 const {error}=await db.auth.updateUser({email},{emailRedirectTo:origin+'/login.html'});
 if(error)throw new Error('The verification email could not be requested. Please try again later.');
}
export async function resetPassword(db,origin){
 const user=await requireAccess(db,'client');if(!user.email)throw new Error('No sign-in email is available.');
 const {error}=await db.auth.resetPasswordForEmail(user.email,{redirectTo:origin+'/login.html'});
 if(error)throw new Error('The reset email could not be requested. Please try again later.');
}
