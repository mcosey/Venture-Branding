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
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000001' and name='DISPOSABLE WATCH RACE — first-save'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000002' and name='DISPOSABLE WATCH RACE — stale-update'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000003' and name='DISPOSABLE WATCH RACE — shared-cap'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000004' and name='DISPOSABLE WATCH RACE — close-before-save'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000005' and name='DISPOSABLE WATCH RACE — save-before-close'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000006' and name='DISPOSABLE WATCH RACE — close-before-worker'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000007' and name='DISPOSABLE WATCH RACE — worker-before-close'),'Expected disposable fixture');
select pg_temp.race_assert(exists(select 1 from public.vb_clients where id='f2c00000-0000-0000-0000-000000000008' and name='DISPOSABLE WATCH RACE — legacy-writer'),'Expected disposable fixture');
select pg_temp.race_assert((select count(*)=1 and max(version)=1 from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000011'),'first-save: exactly one successful save');
select pg_temp.race_assert((select count(*)=1 and max(version)=2 from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000021'),'stale-update: exactly one successful save');
select pg_temp.race_assert((select sum(cardinality(mark_ids))=7 from vb_private.watch_scope_settings where client_id='f2c00000-0000-0000-0000-000000000003'),'Shared cap race retained six A plus original one B');
select pg_temp.race_assert((select version=1 and mark_ids=array['f2c30000-0000-0000-0000-000000000321']::uuid[] from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000032'),'Rejected B save is atomic');
select pg_temp.race_assert((select status='closed' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000041'),'close-before-save: A closed');
select pg_temp.race_assert((select not enabled and next_run_at is null from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000041'),'close-before-save: closed schedule stopped');
select pg_temp.race_assert((select status='active' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000042'),'close-before-save: B remains active');
select pg_temp.race_assert((select status='closed' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000051'),'save-before-close: A closed');
select pg_temp.race_assert((select not enabled and next_run_at is null from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000051'),'save-before-close: closed schedule stopped');
select pg_temp.race_assert((select status='active' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000052'),'save-before-close: B remains active');
select pg_temp.race_assert((select status='closed' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000061'),'close-before-worker: A closed');
select pg_temp.race_assert((select not enabled and next_run_at is null from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000061'),'close-before-worker: closed schedule stopped');
select pg_temp.race_assert((select status='active' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000062'),'close-before-worker: B remains active');
select pg_temp.race_assert((select status='closed' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000071'),'worker-before-close: A closed');
select pg_temp.race_assert((select not enabled and next_run_at is null from vb_private.watch_scope_settings where engagement_id='f2c10000-0000-0000-0000-000000000071'),'worker-before-close: closed schedule stopped');
select pg_temp.race_assert((select status='active' from public.vb_engagements where id='f2c10000-0000-0000-0000-000000000072'),'worker-before-close: B remains active');
select pg_temp.race_assert((select count(*)=1 from vb_private.watch_runs r join public.vb_engagements e on e.id='f2c10000-0000-0000-0000-000000000071' where r.client_id='f2c00000-0000-0000-0000-000000000007' and r.checked_at<e.closed_at),'Worker run preceded closure');
select pg_temp.race_assert((select version=9 and not enabled and next_run_at is null from vb_private.watch_settings where client_id='f2c00000-0000-0000-0000-000000000008'),'Blocked legacy writer left singleton unchanged');
select true as final_fixture_assertions_passed;
rollback;
