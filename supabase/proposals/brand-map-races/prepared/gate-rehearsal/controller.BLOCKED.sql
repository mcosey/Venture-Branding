-- PREPARED, NOT EXECUTED. Exact project imvkhicfmidzbzsbhkzs; verify dashboard URL independently.
-- No account login, invitation or production work. Original local guards unchanged.
begin read only;
set local lock_timeout='20s';
set local statement_timeout='25s';
set local idle_in_transaction_session_timeout='25s';
set local application_name='bm-race-813aabca-100-controller';
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_target$ begin
 if false is not true then raise exception 'Prepared copy blocked: execution approval is required.'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_TEST_CLUSTER_PIN__' then raise exception 'Unexpected Test target/executor'; end if;
end $bm_target$;
do $bm_gate_controller$ declare deadline timestamptz:=clock_timestamp()+interval '20 seconds'; w integer; l integer; begin
 if not pg_try_advisory_xact_lock(135506621,100) then raise exception 'Rehearsal gate in use'; end if;
 loop
  perform pg_stat_clear_snapshot();
  select pid into w from pg_stat_activity where datname=current_database() and usename='postgres' and application_name='bm-race-813aabca-100-winner' and state='active' and wait_event_type='Lock';
  select pid into l from pg_stat_activity where datname=current_database() and usename='postgres' and application_name='bm-race-813aabca-100-loser' and state='active' and wait_event_type='Lock';
  if w is not null and l is not null and w<>l and pg_blocking_pids(w)=array[pg_backend_pid()] and pg_blocking_pids(l)=array[w] then exit; end if;
  if clock_timestamp()>deadline then raise exception 'Controlled release rehearsal failed'; end if;
  perform pg_sleep(0.1);
 end loop;
 perform set_config('vb_brand_map.race_report',jsonb_build_object('run_id','813aabca-15c9-45f8-8f3b-06a582182bc4','case_id','gate-rehearsal','actor','controller','pid',pg_backend_pid(),'isolation',current_setting('transaction_isolation'),'status','GATE_OVERLAP','winner_pid',w,'loser_pid',l,'winner_blocked_by',pg_backend_pid(),'loser_blocked_by',w)::text,true);
end $bm_gate_controller$;
reset role;
select current_setting('vb_brand_map.race_report')::jsonb as brand_map_race_report;
commit;
