import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStep,validConfiguration} from '../auth/flow.mjs';
const user={id:'test',user_metadata:{role:'staff'}};
test('no session cannot skip login with role or MFA values',()=>assert.equal(nextStep({audience:'staff',currentLevel:'aal2',passwordSetup:true}),'signin'));
test('staff entry always challenges non-MFA identity',()=>assert.equal(nextStep({user,audience:'staff',currentLevel:'aal1',nextLevel:'aal1'}),'mfa'));
test('existing client MFA also required before password reset',()=>assert.equal(nextStep({user,audience:'client',currentLevel:'aal1',nextLevel:'aal2',passwordSetup:true}),'mfa'));
test('new invite can set password before initial staff MFA enrollment',()=>assert.equal(nextStep({user,audience:'staff',currentLevel:'aal1',nextLevel:'aal1',passwordSetup:true}),'set-password'));
test('verified staff completes identity flow but has no inferred membership',()=>assert.equal(nextStep({user,audience:'staff',currentLevel:'aal2'}),'signed-in'));
test('only intended project and publishable keys permitted',()=>{
 const config={url:'https://omvkwiosonatswocbdgx.supabase.co',publishableKey:'sb_publishable_example'};
 assert.equal(validConfiguration(config),true);
 for(const publishableKey of ['', 'sb_secret_example','eyJhbGciOiJIUzI1NiJ9'])assert.equal(validConfiguration({...config,publishableKey}),false);
 assert.equal(validConfiguration({...config,url:'https://wrong.example'}),false);
});
