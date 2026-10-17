begin;
create temporary table admin_results(label text,passed boolean) on commit drop;
grant select,insert on admin_results to authenticated,anon;
create function pg_temp.assert_admin(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;insert into admin_results values(label,true);end $$;
create function pg_temp.error_admin(command text,code text,label text) returns void language plpgsql as $$ declare actual text:='00000';begin begin execute command;exception when others then get stacked diagnostics actual=returned_sqlstate;end;perform pg_temp.assert_admin(actual=code,label||' ['||actual||']');end $$;
create temporary table admin_context as select
 (select user_id from vb_private.staff_members where active limit 1) as staff,
 (select user_id from vb_private.portal_test_onboarding where user_id not in (select user_id from vb_private.staff_members) limit 1) as member,
 (select client_id from vb_private.legacy_test_mappings order by client_id limit 1) as client,
 (select count(*) from auth.users) as auth_count,
 (select count(*) from vb_private.engagement_grants) as grant_count,
 (select count(*) from public.vb_clients) as client_count;
grant select on admin_context to authenticated;
select pg_temp.assert_admin((select staff is not null and member is not null and client is not null from admin_context),'Existing identities available');
set local role anon;
select pg_temp.error_admin('select public.vb_test_engagement_admin()','42501','Anonymous cannot read setup');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select member from admin_context),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
select pg_temp.error_admin('select public.vb_test_engagement_admin()','42501','Member cannot list clients or drafts');
select pg_temp.error_admin($q$select public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000001',0,'{}')$q$,'42501','Member cannot save an engagement draft');
select pg_temp.error_admin('select * from vb_private.portal_engagement_drafts','42501','Member cannot read private recipient emails');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from admin_context),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
select pg_temp.error_admin('select public.vb_test_engagement_admin()','42501','Staff without MFA denied');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from admin_context),'role','authenticated','aal','aal2')::text,true);
set local role authenticated;
select pg_temp.assert_admin(public.vb_test_engagement_admin() ?& array['clients','engagements','drafts'],'MFA staff can read authorized administration data');
select pg_temp.assert_admin(not (public.vb_test_engagement_admin() ?| array['members','member_profiles','member_progress','account_exists']),'No Member directory, activity or account-existence result');
select pg_temp.assert_admin((public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000001',0,jsonb_build_object('client_id',(select client from admin_context),'engagement_title','Rollback draft','matter_title','Initial matter','recipient_email','No-Account-Lookup@Example.test'))->>'revision')::integer=1,'Existing legal client draft saved');
select pg_temp.assert_admin((public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000001',0,jsonb_build_object('client_id',(select client from admin_context),'engagement_title','Rollback draft','matter_title','Initial matter','recipient_email','no-account-lookup@example.test'))->>'revision')::integer=1,'Retry is idempotent');
select pg_temp.error_admin($q$select public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000001',0,jsonb_build_object('client_id',(select client from admin_context),'engagement_title','Conflicting title','matter_title','Initial matter','recipient_email','no-account-lookup@example.test'))$q$,'40001','Stale conflicting save rejected');
select pg_temp.assert_admin((public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000001',1,jsonb_build_object('client_id',(select client from admin_context),'engagement_title','Updated rollback draft','matter_title','Initial matter','recipient_email','no-account-lookup@example.test'))->>'revision')::integer=2,'Revision-checked edit saved');
select pg_temp.assert_admin((public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000002',0,'{"new_client_name":"Rollback new legal client","client_type":"business","contact_name":"Test founder","engagement_title":"New relationship","matter_title":"Initial matter","recipient_email":"new-relationship@example.test"}')->>'revision')::integer=1,'New legal client can be drafted without account discovery');
select pg_temp.error_admin($q$select public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000003',0,'{"recipient_email":"invalid"}')$q$,'22023','Malformed details rejected');
select pg_temp.error_admin($q$select public.vb_save_test_engagement_draft('f1810000-0000-0000-0000-000000000003',0,'{"services":["portfolio"]}')$q$,'22023','Feature packages cannot be requested');
reset role;
select pg_temp.assert_admin((select count(*) from auth.users)=(select auth_count from admin_context),'No account created or looked up by recipient');
select pg_temp.assert_admin((select count(*) from vb_private.engagement_grants)=(select grant_count from admin_context),'Drafts grant no Client access');
select pg_temp.assert_admin((select count(*) from public.vb_clients)=(select client_count from admin_context),'New-client draft does not create a legal client prematurely');
select pg_temp.assert_admin((select count(*)=2 from vb_private.portal_engagement_drafts where id::text like 'f1810000-%'),'Only the intended drafts saved');
select pg_temp.assert_admin(not exists(select 1 from public.vb_engagements e where (select count(*) from vb_private.engagement_services s where s.engagement_id=e.id and s.enabled)<>8),'Every existing engagement includes all eight features');
-- New engagement is uncommitted and receives all features without any picker.
insert into public.vb_engagements(id,client_id,title) select 'f1820000-0000-0000-0000-000000000001',client,'Rollback all-features draft' from admin_context;
select pg_temp.assert_admin((select count(*)=8 and bool_and(enabled) from vb_private.engagement_services where engagement_id='f1820000-0000-0000-0000-000000000001'),'New engagement automatically includes every Client feature');
update vb_private.engagement_services set enabled=false where engagement_id='f1820000-0000-0000-0000-000000000001' and service='portfolio';
select pg_temp.assert_admin((select enabled from vb_private.engagement_services where engagement_id='f1820000-0000-0000-0000-000000000001' and service='portfolio'),'Service row cannot become a Client tier toggle');
select count(*) as passed_checks,bool_and(passed) as all_passed from admin_results;
rollback;
