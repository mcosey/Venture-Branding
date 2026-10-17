begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
create temporary table onboarding_results(label text,passed boolean) on commit drop;
grant select,insert on onboarding_results to authenticated,anon;
create function pg_temp.check_onboarding(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into onboarding_results values(label,true);
end $$;
create function pg_temp.expect_onboarding_error(command text,code text,label text) returns void language plpgsql as $$
declare actual text;
begin
 begin execute command; exception when others then
  get stacked diagnostics actual=returned_sqlstate;
  if actual<>code then raise exception 'FAIL: %, expected %, got %',label,code,actual; end if;
  insert into onboarding_results values(label,true);return;
 end;
 raise exception 'FAIL: unexpectedly allowed: %',label;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
('f1660000-0000-0000-0000-000000000001','onboarding-verified@example.test',now()),
('f1660000-0000-0000-0000-000000000002','onboarding-unverified@example.test',null);
set local role anon;
select pg_temp.expect_onboarding_error($x$select public.vb_onboard_test_member('{"full_name":"Test","name":"Company"}','member-signup-test-2026-10-16',true)$x$,'42501','Anonymous cannot provision an account');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1660000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_onboarding_error($x$select public.vb_onboard_test_member('{"full_name":"Test","name":"Company"}','member-signup-test-2026-10-16',true)$x$,'42501','Unverified email cannot provision an account');
select pg_temp.check_onboarding(public.vb_portal_entry()='denied','Unverified account cannot enter the portal');
select set_config('request.jwt.claims','{"sub":"f1660000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","user_metadata":{"role":"staff"}}',true);
select pg_temp.check_onboarding(public.vb_portal_entry()='onboarding','Verified new identity needs onboarding');
select pg_temp.expect_onboarding_error($x$select public.vb_onboard_test_member('{"full_name":"Test","name":"Company"}','old',true)$x$,'22023','Old acknowledgment version is rejected');
select pg_temp.expect_onboarding_error($x$select public.vb_onboard_test_member('{"full_name":"Test","name":"Company"}','member-signup-test-2026-10-16',false)$x$,'22023','Unchecked acknowledgment is rejected');
select pg_temp.expect_onboarding_error($x$select public.vb_onboard_test_member('{"full_name":"Test","name":"Company","launch_date":"2026-02-30"}','member-signup-test-2026-10-16',true)$x$,'22008','Impossible launch date is rejected');
select public.vb_onboard_test_member('{"full_name":"Test Member","name":"Company","industry":"Software","launch_date":"2026-11-01","role":"staff","client_id":"forged"}','member-signup-test-2026-10-16',true);
select pg_temp.check_onboarding(public.vb_account_access()='member','Onboarding provisions Member only despite editable role metadata');
select pg_temp.check_onboarding(public.vb_portal_entry()='member','Completed onboarding enters Member portal');
select pg_temp.check_onboarding((select count(*) from public.vb_member_companies)=1,'Exactly one company is created');
select pg_temp.check_onboarding((select count(*) from public.vb_member_profiles)=1,'Owner profile is available');
select public.vb_onboard_test_member('{"full_name":"Retry","name":"Another Company"}','member-signup-test-2026-10-16',true);
select pg_temp.check_onboarding((select count(*) from public.vb_member_companies)=1,'Retry does not duplicate company setup');
select pg_temp.check_onboarding((select name from public.vb_member_companies)='Company','Retry cannot silently overwrite the saved company');
select pg_temp.check_onboarding((select count(*) from public.vb_clients)=0,'New signup cannot read legal clients');
reset role;
select pg_temp.check_onboarding((select count(*) from vb_private.engagement_grants where user_id='f1660000-0000-0000-0000-000000000001')=0,'Registration creates no engagement grant');
select pg_temp.check_onboarding((select count(*) from vb_private.portal_acceptances where user_id='f1660000-0000-0000-0000-000000000001')=0,'Registration creates no final policy acceptance');
select pg_temp.check_onboarding((select count(*) from vb_private.portal_test_onboarding where user_id='f1660000-0000-0000-0000-000000000001' and record_type='test-only' and terms_version is null and privacy_version is null)=1,'Only a server-timestamped Test acknowledgment is recorded');
update vb_private.portal_accounts set status='suspended' where user_id='f1660000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.check_onboarding(public.vb_portal_entry()='denied','Suspension denies sign-in routing');
select pg_temp.expect_onboarding_error($x$select public.vb_onboard_test_member('{"full_name":"Test","name":"Company"}','member-signup-test-2026-10-16',true)$x$,'42501','Retry cannot reactivate a suspended account');
reset role;
select count(*) as passed_checks,bool_and(passed) as all_passed from onboarding_results;
rollback;
