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
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000006' and name='DISPOSABLE WATCH RACE — close-before-worker'),'Expected disposable fixture');
select pg_advisory_xact_lock(73772131);
update vb_private.watch_scope_settings set next_run_at=now()+interval '1 year' where enabled and client_id<>'f2c00000-0000-0000-0000-000000000006';
update vb_private.watch_settings set next_run_at=now()+interval '1 year' where enabled;
update vb_private.watch_scope_settings set next_run_at='-infinity' where engagement_id='f2c10000-0000-0000-0000-000000000062';
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
create temporary table race_worker_result on commit drop as select public.vb_watch_run_due() result;
reset role;
select pg_temp.race_assert((select (result->>'completed_clients')::integer=1 from race_worker_result),'Companion still processes after A closure');
select pg_temp.race_assert(exists(select 1 from vb_private.watch_runs r join vb_private.watch_scope_settings s on s.id=r.configuration_id where s.engagement_id='f2c10000-0000-0000-0000-000000000062'),'Run belongs to active companion');
select true as companion_continuation_passed;
rollback;
