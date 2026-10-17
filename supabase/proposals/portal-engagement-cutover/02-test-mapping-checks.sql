-- Mapping/new-model checks, NOT proof of legacy service cutover. All edits roll back.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
create temporary table scope_results(label text,passed boolean) on commit drop;
grant select,insert on scope_results to authenticated,anon;
create function pg_temp.scope_check(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into scope_results values(label,true);
end $$;
create function pg_temp.scope_denied(command text,label text) returns void language plpgsql as $$ begin
 begin execute command; exception when insufficient_privilege then insert into scope_results values(label,true); return; end;
 raise exception 'FAIL: unexpectedly allowed: %',label;
end $$;
select pg_temp.scope_check((select count(*) from vb_private.legacy_test_mappings)=4,'Exactly four approved fictional mappings');
select pg_temp.scope_check(not exists(select 1 from vb_private.legacy_test_mappings where enforcement_enabled),'No legacy cutover activated');
select pg_temp.scope_check((select count(*) from public.vb_engagements where id in(select engagement_id from vb_private.legacy_test_mappings) and status='active')=4,'Four Test engagements active');
select pg_temp.scope_check((select count(*) from vb_private.engagement_grants g join vb_private.legacy_test_mappings m using(engagement_id) join vb_private.client_memberships old on old.client_id=m.client_id and old.user_id=g.user_id where old.active and g.status='active' and g.accepted_at is not null)=4,'Only exact existing protected memberships migrated');
select pg_temp.scope_check(not exists(select 1 from vb_private.engagement_grants g join vb_private.legacy_test_mappings m using(engagement_id) left join vb_private.client_memberships old on old.client_id=m.client_id and old.user_id=g.user_id and old.active where old.user_id is null),'No identity inferred from company names');
select pg_temp.scope_check((select md5(coalesce(jsonb_agg(c order by id)::text,'')) from public.vb_clients c)='910249c562ca27860858146771e2fa6d','Original clients unchanged');
select pg_temp.scope_check((select md5(coalesce(jsonb_agg(m order by client_id,user_id)::text,'')) from vb_private.client_memberships m)='fa3747007aff32f9e9f7558cff515963','Original memberships unchanged');
select pg_temp.scope_check((select count(*) from vb_private.legacy_test_record_scopes where resource='public.vb_marks')=5,'All five existing marks mapped');
select pg_temp.scope_check(not has_table_privilege('authenticated','vb_private.legacy_test_mappings','SELECT,INSERT,UPDATE,DELETE'),'Authenticated has no mapping-table grants');
select pg_temp.scope_check(not has_table_privilege('anon','vb_private.legacy_test_record_scopes','SELECT,INSERT,UPDATE,DELETE'),'Anonymous has no record-map grants');
do $$ declare r text; total bigint; mapped bigint; begin
 for r in select distinct resource from vb_private.legacy_test_record_scopes loop
  execute format($q$select count(*) from %s t join vb_private.legacy_test_mappings m on m.client_id=t.client_id$q$,r::regclass) into total;
  select count(*) into mapped from vb_private.legacy_test_record_scopes where resource=r;
  perform pg_temp.scope_check(total=mapped,'Complete snapshot: '||r);
  execute format($q$select count(*) from %s t join vb_private.legacy_test_record_scopes s on s.resource=$1 and s.client_id=t.client_id and to_jsonb(t) @> s.record_key where md5(to_jsonb(t)::text)=s.source_fingerprint$q$,r::regclass) into total using r;
  perform pg_temp.scope_check(total=mapped,'Source data preserved: '||r);
 end loop;
end $$;
-- Use existing fictional client identity; no Auth users or credentials created.
create temporary table scope_actor as
 select m.client_id,m.engagement_id,m.matter_id,g.user_id,
 (select count(*) from vb_private.engagement_grants a where a.user_id=g.user_id and a.status='active') as engagement_count
 from vb_private.legacy_test_mappings m join vb_private.engagement_grants g using(engagement_id)
 order by m.client_id limit 1;
grant select on scope_actor to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated','aal','aal1')::text,true) from scope_actor;
set local role authenticated;
select pg_temp.scope_check(public.vb_account_access()='client','Existing fictional user derives Client classification');
select pg_temp.scope_check((select count(*) from public.vb_engagements)=(select engagement_count from scope_actor),'User sees only authorized engagements');
select pg_temp.scope_check((select count(*) from public.vb_matters)=(select engagement_count from scope_actor),'User sees only authorized matters');
select pg_temp.scope_denied('select * from vb_private.legacy_test_record_scopes','User cannot inspect private migration mapping');
select pg_temp.scope_denied('update public.vb_engagements set status=''closed'',closed_at=now()','User cannot change representation lifecycle');
reset role;
-- Second engagement for the SAME legal client, then close the original; rollback below.
insert into public.vb_engagements(id,client_id,title,status,activated_at)
 select 'f1720000-0000-0000-0000-000000000001',client_id,'ROLLBACK TEST — separate scope','active',now() from scope_actor;
insert into public.vb_matters(id,engagement_id,title) values('f1730000-0000-0000-0000-000000000001','f1720000-0000-0000-0000-000000000001','ROLLBACK TEST — second matter');
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at)
 select 'f1720000-0000-0000-0000-000000000001',user_id,'active',now() from scope_actor;
update public.vb_engagements set status='closed',closed_at=now() where id=(select engagement_id from scope_actor);
set local role authenticated;
select pg_temp.scope_check(not vb_private.can_access_engagement((select engagement_id from scope_actor)),'Closed engagement is denied by new model');
select pg_temp.scope_check(not exists(select 1 from public.vb_matters where id=(select matter_id from scope_actor)),'Closed matter hidden with same-client active engagement');
select pg_temp.scope_check(exists(select 1 from public.vb_matters where id='f1730000-0000-0000-0000-000000000001'),'Second same-client matter remains available');
select pg_temp.scope_check(public.vb_account_access()='client','Other active engagements preserve Client classification');
select pg_temp.scope_check(not vb_private.can_use_engagement_service((select engagement_id from scope_actor),'brand_change_monitor'),'Closed engagement service denied by new model');
-- Explicitly document coexistence; this is NOT a legacy closure success assertion.
select pg_temp.scope_check(public.vb_portal_entry()='client','Staged mapping leaves original legacy routing intact');
reset role;
update public.vb_engagements set status='closed',closed_at=now() where status='active' and id in(select engagement_id from vb_private.engagement_grants where user_id=(select user_id from scope_actor));
set local role authenticated;
select pg_temp.scope_check(public.vb_account_access()='alumni','Final new-model closure derives Alumni');
select pg_temp.scope_check((select count(*) from public.vb_engagements)=0,'No new-model engagement visible after final closure');
reset role;
update vb_private.portal_accounts set status='suspended' where user_id=(select user_id from scope_actor);
set local role authenticated;
select pg_temp.scope_check(public.vb_account_access()='denied','Suspended account denied by new model');
select pg_temp.scope_check(public.vb_portal_entry()='denied','Suspension blocks portal entry');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',o.user_id,'role','authenticated','aal','aal1')::text,true)
 from vb_private.portal_test_onboarding o where not exists(select 1 from vb_private.client_memberships m where m.user_id=o.user_id) limit 1;
set local role authenticated;
select pg_temp.scope_check(public.vb_account_access()='member','Registered free Member remains Member');
select pg_temp.scope_check((select count(*) from public.vb_clients)=0,'Registered Member has no legacy client access');
select pg_temp.scope_check((select count(*) from public.vb_engagements)=0,'Registered Member has no engagement access');
select pg_temp.scope_check((select count(*) from public.vb_matters)=0,'Registered Member has no matter access');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated','aal','aal1')::text,true) from vb_private.staff_members where active order by user_id limit 1;
set local role authenticated;
select pg_temp.scope_check(public.vb_account_access()='denied','Staff without MFA denied');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated','aal','aal2')::text,true) from vb_private.staff_members where active order by user_id limit 1;
set local role authenticated;
select pg_temp.scope_check(public.vb_account_access()='staff','Staff with MFA allowed');
select pg_temp.scope_check(exists(select 1 from public.vb_engagements where id=(select engagement_id from scope_actor) and status='closed'),'Staff retain closed records');
reset role;
select count(*) as passed_checks,bool_and(passed) as all_passed from scope_results;
rollback;
