-- Run only inside a reviewed rollback transaction. Fictional database fixtures;
-- no Auth API calls, email, provider activity, or existing user grants.
create temporary table onboarding_checks(label text primary key) on commit drop;
create temporary table onboarding_context(client_company uuid,member_company uuid,invited_company uuid,member_receipt text) on commit drop;
insert into onboarding_context default values;
grant select,insert on onboarding_checks to authenticated,anon;
grant select,update on onboarding_context to authenticated;
create function pg_temp.onboarding_check(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Check failed: %',label; end if;insert into onboarding_checks values(label);end $$;
create function pg_temp.onboarding_denied(command text,expected text,label text) returns void language plpgsql as $$
declare actual text;
begin begin execute command;exception when others then get stacked diagnostics actual=returned_sqlstate;end;
 if actual is distinct from expected then raise exception 'Expected %, got %: %',expected,actual,label;end if;
 insert into onboarding_checks values(label);
end $$;

do $$ begin
 if exists(select 1 from auth.users where id::text like 'c0240001-%')
 or exists(select 1 from public.vb_clients where id::text like 'c0240002-%')
 then raise exception 'Fictional fixture IDs already present';end if;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('c0240001-0000-4000-8000-000000000001','client-onboarding-legacy@example.invalid',now()),
 ('c0240001-0000-4000-8000-000000000002','client-onboarding-member@example.invalid',now()),
 ('c0240001-0000-4000-8000-000000000003','client-onboarding-invited@example.invalid',now()),
 ('c0240001-0000-4000-8000-000000000004','client-onboarding-outsider@example.invalid',now()),
 ('c0240001-0000-4000-8000-000000000005','client-onboarding-staff@example.invalid',now()),
 ('c0240001-0000-4000-8000-000000000006','client-onboarding-unverified@example.invalid',null);
insert into vb_private.portal_accounts(user_id) values('c0240001-0000-4000-8000-000000000001');
insert into vb_private.staff_members(user_id) values('c0240001-0000-4000-8000-000000000005');
insert into public.vb_clients(id,name,client_type,contact_name,contact_email,portal_enabled) values
 ('c0240002-0000-4000-8000-000000000001','ROLLBACK ONLY — legacy Client','business','Fictional contact','client-onboarding-legacy@example.invalid',true),
 ('c0240002-0000-4000-8000-000000000002','ROLLBACK ONLY — invited Client','business','Fictional contact','client-onboarding-invited@example.invalid',false),
 ('c0240002-0000-4000-8000-000000000003','ROLLBACK ONLY — Member upgrade','individual','Fictional contact','client-onboarding-member@example.invalid',false);
insert into public.vb_engagements(id,client_id,title,status,activated_at) values
 ('c0240003-0000-4000-8000-000000000001','c0240002-0000-4000-8000-000000000001','ROLLBACK ONLY — existing access','active',now());
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values
 ('c0240003-0000-4000-8000-000000000001','c0240001-0000-4000-8000-000000000001','active',now());
insert into vb_private.portal_engagement_drafts(id,client_id,engagement_title,matter_title,recipient_email,created_by) values
 ('c0240004-0000-4000-8000-000000000001','c0240002-0000-4000-8000-000000000002','ROLLBACK ONLY — invited access','ROLLBACK ONLY — scope','client-onboarding-invited@example.invalid','c0240001-0000-4000-8000-000000000005'),
 ('c0240004-0000-4000-8000-000000000002','c0240002-0000-4000-8000-000000000003','ROLLBACK ONLY — Member upgrade','ROLLBACK ONLY — scope','client-onboarding-member@example.invalid','c0240001-0000-4000-8000-000000000005');
insert into vb_private.engagement_invitations(id,draft_id,draft_revision,client_id,recipient_email,contact_updated_at,engagement_title,matter_title,state,requested_by,sent_at)
 select case when d.id='c0240004-0000-4000-8000-000000000001' then 'c0240005-0000-4000-8000-000000000001'::uuid else 'c0240005-0000-4000-8000-000000000002'::uuid end,
 d.id,d.revision,d.client_id,d.recipient_email,c.updated_at,d.engagement_title,d.matter_title,'sent',d.created_by,now()
 from vb_private.portal_engagement_drafts d join public.vb_clients c on c.id=d.client_id
 where d.id in('c0240004-0000-4000-8000-000000000001','c0240004-0000-4000-8000-000000000002');

set local role anon;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture"}',null)$q$,'42501','Anonymous Client setup denied');
select pg_temp.onboarding_denied('select public.vb_member_onboarding_complete()','42501','Anonymous completion read denied');
reset role;
select set_config('request.jwt.claims','{"sub":"c0240001-0000-4000-8000-000000000004","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture"}',null)$q$,'42501','Ordinary user cannot self-select Client setup');
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture"}','c0240005-0000-4000-8000-000000000001')$q$,'42501','Wrong recipient cannot use Client invitation');
select pg_temp.onboarding_denied('select * from vb_private.portal_client_onboarding','42501','Users cannot list Client onboarding records');
select pg_temp.onboarding_denied($q$select public.vb_onboard_test_member('{"full_name":"Fixture","name":"Fixture"}','member-signup-test-2026-10-16',false)$q$,'22023','Member confirmation still required');
reset role;
select set_config('request.jwt.claims','{"sub":"c0240001-0000-4000-8000-000000000006","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture"}',null)$q$,'42501','Unverified user denied');
reset role;
select set_config('request.jwt.claims','{"sub":"c0240001-0000-4000-8000-000000000005","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture"}',null)$q$,'42501','Staff cannot use Client profile setup');
reset role;

select set_config('request.jwt.claims','{"sub":"c0240001-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture","role":"staff"}',null)$q$,'22023','Editable profile cannot inject privileges');
update onboarding_context set client_company=public.vb_onboard_client('{"full_name":"Existing Client","name":"Existing planning company"}',null);
select pg_temp.onboarding_check(public.vb_account_access()='client','Existing Client access retained');
select pg_temp.onboarding_check(not public.vb_member_onboarding_complete(),'Client setup records no Member acceptance');
select pg_temp.onboarding_check(public.vb_onboard_client('{"full_name":"Retry","name":"Different name"}',null)=(select client_company from onboarding_context),'Client retry reuses profile');
select pg_temp.onboarding_check((select count(*)=1 and min(name)='Existing planning company' from public.vb_member_companies),'Client retry preserves company name');
select public.vb_save_member_progress((select client_company from onboarding_context),'entity','{"version":1,"tasks":[true,false,false,false],"notes":"Rollback planning note"}',null);
reset role;
select pg_temp.onboarding_check(not exists(select 1 from vb_private.portal_test_onboarding where user_id='c0240001-0000-4000-8000-000000000001'),'No Member acknowledgment row created for existing Client');
update vb_private.portal_accounts set status='suspended' where user_id='c0240001-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Fixture","name":"Fixture"}',null)$q$,'42501','Suspended Client cannot retry setup');
reset role;
update vb_private.portal_accounts set status='active' where user_id='c0240001-0000-4000-8000-000000000001';

select set_config('request.jwt.claims','{"sub":"c0240001-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
update onboarding_context set member_company=public.vb_onboard_test_member('{"full_name":"Free Member","name":"Member planning company"}','member-signup-test-2026-10-16',true);
select pg_temp.onboarding_check(public.vb_member_onboarding_complete(),'Member signup retains separate confirmation');
select pg_temp.onboarding_check((select count(*)=0 from public.vb_member_progress),'Member cannot read another account progress');
reset role;
update onboarding_context set member_receipt=(select md5(to_jsonb(o)::text) from vb_private.portal_test_onboarding o where user_id='c0240001-0000-4000-8000-000000000002');
set local role authenticated;
select pg_temp.onboarding_check(public.vb_onboard_client('{"full_name":"Member upgrade","name":"Must not replace existing company"}','c0240005-0000-4000-8000-000000000002')=(select member_company from onboarding_context),'Member Client setup reuses existing profile');
select public.vb_accept_test_engagement_invite('c0240005-0000-4000-8000-000000000002',true);
select pg_temp.onboarding_check(public.vb_account_access()='client','Member upgrades through invitation');
reset role;
select pg_temp.onboarding_check((select md5(to_jsonb(o)::text) from vb_private.portal_test_onboarding o where user_id='c0240001-0000-4000-8000-000000000002')=(select member_receipt from onboarding_context),'Upgrade does not repeat or modify Member acceptance');

select set_config('request.jwt.claims','{"sub":"c0240001-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
update vb_private.engagement_invitations set state='revoked' where id='c0240005-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.onboarding_denied($q$select public.vb_onboard_client('{"full_name":"Invited user","name":"Invited planning company"}','c0240005-0000-4000-8000-000000000001')$q$,'42501','Revoked invitation cannot provision a profile');
reset role;
update vb_private.engagement_invitations set state='sent' where id='c0240005-0000-4000-8000-000000000001';
set local role authenticated;
update onboarding_context set invited_company=public.vb_onboard_client('{"full_name":"Invited user","name":"Invited planning company"}','c0240005-0000-4000-8000-000000000001');
select pg_temp.onboarding_check(public.vb_account_access()<>'client','Profile setup alone grants no Client record access');
select pg_temp.onboarding_check(not public.vb_member_onboarding_complete(),'New invitee has no Member acceptance');
select pg_temp.onboarding_denied($q$select public.vb_accept_test_engagement_invite('c0240005-0000-4000-8000-000000000001',false)$q$,'22023','Invitation acceptance remains explicit');
select public.vb_accept_test_engagement_invite('c0240005-0000-4000-8000-000000000001',true);
select pg_temp.onboarding_check(public.vb_account_access()='client','New invitee reaches Client access without Member terms');
select pg_temp.onboarding_denied($q$select public.vb_accept_test_engagement_invite('c0240005-0000-4000-8000-000000000001',true)$q$,'42501','Accepted invitation cannot be reused');
select pg_temp.onboarding_check((select count(*)=1 and min(name)='Invited planning company' from public.vb_member_companies),'New Client sees only own planning profile');
reset role;
select pg_temp.onboarding_check(not exists(select 1 from vb_private.portal_test_onboarding where user_id='c0240001-0000-4000-8000-000000000003'),'Invitation acceptance does not manufacture Member acceptance');
select pg_temp.onboarding_check((select count(*)=8 and bool_and(enabled) from vb_private.engagement_services where engagement_id=(select engagement_id from vb_private.engagement_invitations where id='c0240005-0000-4000-8000-000000000001')),'Client invitation still includes all Client features');
update public.vb_engagements set status='closed',closed_at=now() where id=(select engagement_id from vb_private.engagement_invitations where id='c0240005-0000-4000-8000-000000000001');
set local role authenticated;
select pg_temp.onboarding_check(public.vb_account_access()='alumni','Last engagement closure returns Alumni classification');
select pg_temp.onboarding_check(not public.vb_member_onboarding_complete(),'Client-only alumnus has not accepted Member terms');
select pg_temp.onboarding_check(public.vb_onboard_test_member('{"full_name":"Alumnus","name":"Must preserve company"}','member-signup-test-2026-10-16',true)=(select invited_company from onboarding_context),'Later Member choice reuses Client planning profile');
select pg_temp.onboarding_check(public.vb_member_onboarding_complete(),'Explicit later Member signup is recorded separately');
select pg_temp.onboarding_check((select count(*)=1 and min(name)='Invited planning company' from public.vb_member_companies),'Later Member choice preserves company and does not duplicate it');
reset role;
select count(*)::integer as checks, true as all_checks_passed from onboarding_checks;
