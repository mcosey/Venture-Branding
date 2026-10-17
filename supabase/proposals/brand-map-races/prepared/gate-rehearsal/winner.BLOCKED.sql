-- PREPARED, NOT EXECUTED. Exact project imvkhicfmidzbzsbhkzs; verify dashboard URL independently.
-- No account login, invitation or production work. Original local guards unchanged.
begin read only;
set local lock_timeout='20s';
set local statement_timeout='25s';
set local idle_in_transaction_session_timeout='25s';
set local application_name='bm-race-813aabca-100-winner';
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_target$ begin
 if false is not true then raise exception 'Prepared copy blocked: execution approval is required.'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_TEST_CLUSTER_PIN__' then raise exception 'Unexpected Test target/executor'; end if;
end $bm_target$;
do $bm_gate_winner$ begin
 if (select count(*) from (select a.pid from pg_stat_activity a join pg_locks l on l.pid=a.pid where a.datname=current_database() and a.usename='postgres' and a.application_name='bm-race-813aabca-100-controller' and a.state='active' and l.locktype='advisory' and l.classid=135506621::oid and l.objid=100::oid and l.objsubid=2 and l.granted) controller)<>1 then raise exception 'Rehearsal controller gate missing'; end if;
 if not pg_try_advisory_xact_lock(135506621,101) then raise exception 'Rehearsal data lock in use'; end if;
 perform pg_advisory_xact_lock(135506621,100);
 perform set_config('vb_brand_map.race_report',jsonb_build_object('run_id','813aabca-15c9-45f8-8f3b-06a582182bc4','case_id','gate-rehearsal','actor','winner','pid',pg_backend_pid(),'isolation',current_setting('transaction_isolation'),'status','GATE_RELEASED')::text,true);
end $bm_gate_winner$;
reset role;
select current_setting('vb_brand_map.race_report')::jsonb as brand_map_race_report;
commit;
