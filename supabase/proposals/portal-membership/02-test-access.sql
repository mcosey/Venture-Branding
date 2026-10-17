-- Synthetic database-role checks only. No emails, passwords, real user grants or retained fixtures.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
create temporary table portal_test_results(name text, passed boolean) on commit drop;
grant insert,select on portal_test_results to authenticated,anon;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into portal_test_results values(label,true);
end $$;
create function pg_temp.denied(command text,label text) returns void language plpgsql as $$
begin
 begin execute command; exception when insufficient_privilege then
  insert into portal_test_results values(label,true); return;
 end;
 raise exception 'FAIL: command unexpectedly allowed: %',label;
end $$;
insert into auth.users(id,email) values
('f1600000-0000-0000-0000-000000000001','portal-member-one@example.test'),
('f1600000-0000-0000-0000-000000000002','portal-member-two@example.test'),
('f1600000-0000-0000-0000-000000000003','portal-staff@example.test'),
('f1600000-0000-0000-0000-000000000004','portal-unprovisioned@example.test');
insert into vb_private.portal_accounts(user_id) values
('f1600000-0000-0000-0000-000000000001'),('f1600000-0000-0000-0000-000000000002'),('f1600000-0000-0000-0000-000000000003');
insert into vb_private.staff_members(user_id) values('f1600000-0000-0000-0000-000000000003');
insert into public.vb_member_profiles(user_id,full_name) values
('f1600000-0000-0000-0000-000000000001','Synthetic Member One'),('f1600000-0000-0000-0000-000000000002','Synthetic Member Two');
insert into public.vb_member_companies(id,owner_id,name) values
('f1610000-0000-0000-0000-000000000001','f1600000-0000-0000-0000-000000000001','Synthetic Member Company A'),
('f1610000-0000-0000-0000-000000000002','f1600000-0000-0000-0000-000000000002','Synthetic Member Company B');
insert into public.vb_member_progress(company_id,milestone_id,progress) values
('f1610000-0000-0000-0000-000000000001','formation','{"checked":["first"]}'),
('f1610000-0000-0000-0000-000000000002','formation','{"notes":"Private synthetic note"}');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
('f1620000-0000-0000-0000-000000000001','Synthetic Legal Client A','business','Synthetic Contact A',true),
('f1620000-0000-0000-0000-000000000002','Synthetic Legal Client B','business','Synthetic Contact B',true);
insert into public.vb_engagements(id,client_id,title,status,activated_at) values
('f1630000-0000-0000-0000-000000000001','f1620000-0000-0000-0000-000000000001','Synthetic Engagement A1','active',now()),
('f1630000-0000-0000-0000-000000000002','f1620000-0000-0000-0000-000000000001','Synthetic Engagement A2','active',now()),
('f1630000-0000-0000-0000-000000000003','f1620000-0000-0000-0000-000000000002','Synthetic Engagement B','active',now());
insert into public.vb_matters(engagement_id,title) select id,title||' matter' from public.vb_engagements where id::text like 'f163%';
insert into vb_private.engagement_services(engagement_id,service,enabled) select id,'brand_change_monitor',true from public.vb_engagements where id::text like 'f163%';

set local role anon;
select pg_temp.denied('select public.vb_account_access()','Anonymous cannot resolve account access');
select pg_temp.denied('select * from public.vb_member_companies','Anonymous cannot read Member data');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1600000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select pg_temp.check_true(public.vb_account_access()='member','New account is Member without legal access');
select pg_temp.check_true((select count(*) from public.vb_member_companies)=1,'Member sees only own company');
select pg_temp.check_true((select count(*) from public.vb_member_profiles)=1,'Member sees only own profile');
select pg_temp.check_true((select count(*) from public.vb_member_progress)=1,'Member sees only own planning progress');
select pg_temp.check_true((select count(*) from public.vb_engagements)=0,'Member cannot read legal engagements');
select pg_temp.check_true((select count(*) from public.vb_matters)=0,'Member cannot read legal matters');
select pg_temp.check_true((select count(*) from public.vb_clients)=0,'New Member gains no legacy client records');
select pg_temp.denied('update public.vb_member_companies set owner_id=''f1600000-0000-0000-0000-000000000002''','Company ownership cannot be transferred by a Member');
select pg_temp.denied('insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values(''f1630000-0000-0000-0000-000000000001'',''f1600000-0000-0000-0000-000000000001'',''active'',now())','Member cannot self-grant client access');
select pg_temp.denied('update vb_private.portal_accounts set status=''active''','Member cannot change account security state');
select pg_temp.denied('insert into vb_private.portal_acceptances(user_id,notice_version) values(''f1600000-0000-0000-0000-000000000001'',''invented'')','Member cannot forge policy acceptance');
select pg_temp.denied('insert into public.vb_member_progress(company_id,milestone_id) values(''f1610000-0000-0000-0000-000000000002'',''unauthorized'')','Guessed company ID cannot receive another Member progress');
update public.vb_member_progress set progress='{"checked":["first","second"]}' where company_id='f1610000-0000-0000-0000-000000000001';
select pg_temp.check_true((select jsonb_array_length(progress->'checked') from public.vb_member_progress)=2,'Owner can save own progress');
reset role;
insert into vb_private.engagement_grants(engagement_id,user_id,status) values('f1630000-0000-0000-0000-000000000001','f1600000-0000-0000-0000-000000000001','invited');
set local role authenticated;
select pg_temp.check_true(public.vb_account_access()='member','Unaccepted invitation does not grant client access');
reset role;
update vb_private.engagement_grants set status='active',accepted_at=now() where user_id='f1600000-0000-0000-0000-000000000001';
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values
('f1630000-0000-0000-0000-000000000002','f1600000-0000-0000-0000-000000000001','active',now()),
('f1630000-0000-0000-0000-000000000003','f1600000-0000-0000-0000-000000000001','active',now());
set local role authenticated;
select pg_temp.check_true(public.vb_account_access()='client','Authorized accepted engagement derives Client access');
select pg_temp.check_true((select count(*) from public.vb_engagements)=3,'One account can access several engagements and businesses');
select pg_temp.check_true(vb_private.can_use_engagement_service('f1630000-0000-0000-0000-000000000001','brand_change_monitor'),'Service requires explicit enabled entitlement');
select pg_temp.check_true(not vb_private.can_use_engagement_service('f1630000-0000-0000-0000-000000000001','trademark_watch'),'Unassigned service is unavailable');
reset role;
update public.vb_engagements set status='closed',closed_at=now() where id='f1630000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.check_true((select count(*) from public.vb_matters)=2,'Closed matter stays hidden even with another active engagement for same legal client');
select pg_temp.check_true(not vb_private.can_use_engagement_service('f1630000-0000-0000-0000-000000000001','brand_change_monitor'),'Closure immediately denies closed engagement service');
select pg_temp.check_true(vb_private.can_access_engagement('f1630000-0000-0000-0000-000000000003'),'Another business remains accessible after closure');
select pg_temp.check_true(public.vb_account_access()='client','Remaining engagement retains Client classification');
reset role;
update public.vb_engagements set status='closed',closed_at=now() where id in ('f1630000-0000-0000-0000-000000000002','f1630000-0000-0000-0000-000000000003');
set local role authenticated;
select pg_temp.check_true(public.vb_account_access()='alumni','Last engagement closure derives Alumni classification');
select pg_temp.check_true((select count(*) from public.vb_matters)=0,'Alumni cannot read closed legal matters');
select pg_temp.check_true((select count(*) from public.vb_member_progress)=1,'Alumni retains Member planning data');
reset role;
insert into public.vb_engagements(id,client_id,title,status,activated_at) values('f1630000-0000-0000-0000-000000000004','f1620000-0000-0000-0000-000000000001','Later engagement','active',now());
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values('f1630000-0000-0000-0000-000000000004','f1600000-0000-0000-0000-000000000001','active',now());
set local role authenticated;
select pg_temp.check_true(public.vb_account_access()='client','Later engagement restores Client access on same account');
reset role;
update vb_private.portal_accounts set status='suspended' where user_id='f1600000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.check_true(public.vb_account_access()='denied','Suspension denies account access');
select pg_temp.check_true((select count(*) from public.vb_member_progress)=0,'Suspended account cannot read planning data');
reset role;
select pg_temp.check_true((select status from public.vb_engagements where id='f1630000-0000-0000-0000-000000000004')='active','Suspension does not terminate representation');
update vb_private.portal_accounts set status='archived' where user_id='f1600000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.check_true(public.vb_account_access()='denied','Archived account is denied');
select set_config('request.jwt.claims','{"sub":"f1600000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',true);
select pg_temp.check_true(public.vb_account_access()='denied','Staff cannot bypass MFA through Member account');
select set_config('request.jwt.claims','{"sub":"f1600000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
select pg_temp.check_true(public.vb_account_access()='staff','Verified MFA staff retains staff access');
select pg_temp.check_true((select count(*) from public.vb_engagements where id::text like 'f163%')=4,'Staff retains closed engagement records');
select pg_temp.check_true((select count(*) from public.vb_member_progress)=0,'Staff access does not expose private Member notes');
select pg_temp.denied('update vb_private.portal_lifecycle_events set previous_data=null','Browser cannot rewrite lifecycle history');
select set_config('request.jwt.claims','{"sub":"f1600000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2","user_metadata":{"role":"staff","client":true}}',true);
select pg_temp.check_true(public.vb_account_access()='denied','Self-edited metadata does not provision access');
reset role;
select pg_temp.check_true((select count(*) from vb_private.portal_lifecycle_events where table_name='vb_engagements' and operation='UPDATE')>=3,'Engagement closures retain audit history');
select count(*) as passed_checks, bool_and(passed) as all_passed from portal_test_results;
rollback;
