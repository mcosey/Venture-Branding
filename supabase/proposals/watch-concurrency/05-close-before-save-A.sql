begin;
set local statement_timeout='45s';
set local lock_timeout='30s';
set local idle_in_transaction_session_timeout='45s';
-- BEGIN HOSTED GUARDS
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'BCM Test only'; end if;
 if to_regclass('vb_private.watch_scope_settings') is null then raise exception 'Installed scoped Watch required'; end if;
 if md5(pg_get_functiondef('public.vb_watch_run_due()'::regprocedure))<>'c72725f3f7c9459fb7d5f64ab4b9f818' then raise exception 'Installed Watch definition changed'; end if;
 if md5(pg_get_functiondef('public.vb_watch_snapshot(uuid)'::regprocedure))<>'f4e2544500812010d4369071af28c071' then raise exception 'Installed Watch definition changed'; end if;
 if md5(pg_get_functiondef('public.vb_watch_save(uuid,integer,uuid[],boolean)'::regprocedure))<>'2b1683e4347a2923fdc789804e35a2a1' then raise exception 'Installed Watch definition changed'; end if;
 if md5(pg_get_functiondef('public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)'::regprocedure))<>'c47bcca98513ed06c6441b6c511e2c00' then raise exception 'Installed Watch definition changed'; end if;
end $$;
-- END HOSTED GUARDS

select set_config('request.jwt.claims','{}',true);
create or replace function pg_temp.race_assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create temporary table race_actors on commit drop as select
 (select id from auth.users where lower(email)='mithrilzeppelin117@gmail.com') a,
 (select id from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com') b,
 (select user_id from vb_private.staff_members where active order by user_id limit 1) staff;
select pg_temp.race_assert((select a is not null and b is not null and staff is not null and a<>b and a<>staff and b<>staff from race_actors),'Three distinct existing Test identities');
create or replace function pg_temp.race_actor(who text) returns void language sql as $$ select set_config('request.jwt.claims',jsonb_build_object('sub',case who when 'a' then a when 'b' then b else staff end,'role','authenticated','aal',case when who='staff' then 'aal2' else 'aal1' end)::text,true)::text::void from race_actors $$;
grant select on race_actors to authenticated,service_role;
do $$ begin execute format('grant usage on schema %I to authenticated,service_role',(select nspname from pg_namespace where oid=pg_my_temp_schema())); end $$;
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000004' and name='DISPOSABLE WATCH RACE — close-before-save'),'Expected disposable fixture');
select pg_advisory_xact_lock(73772132,4);
set local role authenticated;
select pg_temp.race_actor('staff');
select public.vb_close_test_engagement('f2c10000-0000-0000-0000-000000000041','active');
reset role;
select pg_sleep(18);
select jsonb_build_object('session_a_pid',pg_backend_pid(),'action_completed_before_commit_at',clock_timestamp()) as session_a_receipt;
commit;
