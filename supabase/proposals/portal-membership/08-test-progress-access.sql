begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
create temporary table progress_results(label text,passed boolean) on commit drop;
create temporary table progress_revision(value timestamptz) on commit drop;
grant select,insert,update on progress_results,progress_revision to authenticated,anon;
create function pg_temp.check_progress(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into progress_results values(label,true);
end $$;
create function pg_temp.expect_progress_error(command text,code text,label text) returns void language plpgsql as $$
declare actual text;
begin
 begin execute command; exception when others then
  get stacked diagnostics actual=returned_sqlstate;
  if actual<>code then raise exception 'FAIL: %, expected %, got %',label,code,actual; end if;
  insert into progress_results values(label,true);return;
 end;
 raise exception 'FAIL: unexpectedly allowed: %',label;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
('f1670000-0000-0000-0000-000000000001','progress-one@example.test',now()),
('f1670000-0000-0000-0000-000000000002','progress-two@example.test',now());
insert into vb_private.portal_accounts(user_id) values('f1670000-0000-0000-0000-000000000001'),('f1670000-0000-0000-0000-000000000002');
insert into public.vb_member_companies(id,owner_id,name) values
('f1680000-0000-0000-0000-000000000001','f1670000-0000-0000-0000-000000000001','Progress Company One'),
('f1680000-0000-0000-0000-000000000002','f1670000-0000-0000-0000-000000000002','Progress Company Two');
insert into public.vb_member_progress(company_id,milestone_id,progress) values('f1680000-0000-0000-0000-000000000002','entity','{"version":1,"tasks":[false,false,false,false],"notes":"Private synthetic note"}');
set local role anon;
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[true],"notes":""}',null)$x$,'42501','Anonymous cannot save progress');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1670000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
insert into progress_revision select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[true,false,false,false],"notes":"Synthetic planning question"}',null);
select pg_temp.check_progress((select progress->'tasks'->>0 from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001')='true','Owner checkmark is saved');
select pg_temp.check_progress((select progress->>'notes' from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001')='Synthetic planning question','Owner planning note is saved');
select pg_temp.check_progress((select count(*) from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000002')=0,'Another Member notes remain unreadable');
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000002','entity','{"version":1,"tasks":[true],"notes":"Overwrite"}',null)$x$,'42501','Another Member progress cannot be changed');
select pg_temp.expect_progress_error($x$update public.vb_member_progress set progress='{}'$x$,'42501','Direct writes cannot bypass revision checks');
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','unknown','{"version":1,"tasks":[true],"notes":""}',null)$x$,'22023','Unknown milestones are rejected');
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":["true"],"notes":""}',null)$x$,'22023','Nonboolean checkmarks are rejected');
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity',jsonb_build_object('version',1,'tasks',jsonb_build_array(true),'notes',repeat('x',3001)),null)$x$,'22023','Oversized notes are rejected');
select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[true,true,false,false],"notes":"Newer saved note"}',(select value from progress_revision));
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[false],"notes":"Stale overwrite"}',(select value from progress_revision))$x$,'40001','Stale device cannot overwrite newer progress');
select pg_temp.check_progress((select progress->>'notes' from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001')='Newer saved note','Conflict preserves newer notes');
select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[true,true,false,false],"notes":"Newer saved note"}',(select value from progress_revision));
select pg_temp.check_progress((select count(*) from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001')=1,'Lost-response retry is idempotent');
select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[false,false,false,false],"notes":""}',(select updated_at from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001' and milestone_id='entity'));
select pg_temp.check_progress((select progress->>'notes' from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001')='','Reset clears the account note');
select pg_temp.check_progress((select progress->'tasks' from public.vb_member_progress where company_id='f1680000-0000-0000-0000-000000000001')='[false,false,false,false]'::jsonb,'Reset clears the account checklist');
reset role;
update vb_private.portal_accounts set status='suspended' where user_id='f1670000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.expect_progress_error($x$select public.vb_save_member_progress('f1680000-0000-0000-0000-000000000001','entity','{"version":1,"tasks":[true],"notes":""}',null)$x$,'42501','Suspended account cannot save progress');
reset role;
select count(*) as passed_checks,bool_and(passed) as all_passed from progress_results;
rollback;
