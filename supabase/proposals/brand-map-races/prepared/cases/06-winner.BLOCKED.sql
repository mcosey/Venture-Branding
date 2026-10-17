-- PREPARED, NOT EXECUTED. Exact project imvkhicfmidzbzsbhkzs; verify dashboard URL independently.
-- No account login, invitation or production work. Original local guards unchanged.
begin isolation level read committed;
set local lock_timeout='20s';
set local statement_timeout='25s';
set local idle_in_transaction_session_timeout='25s';
set local application_name='bm-race-813aabca-6-winner';
set local search_path=public;
set local request.jwt.claims='{}';
set local request.jwt.claim.sub='';
do $bm_target$ begin
 if false is not true then raise exception 'Prepared copy blocked: execution approval is required.'; end if;
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_TEST_CLUSTER_PIN__' then raise exception 'Unexpected Test target/executor'; end if;
end $bm_target$;
do $bm_run_guard$ declare r jsonb; begin
 select payload into strict r from vb_private.brand_map_race_runs where run_id='813aabca-15c9-45f8-8f3b-06a582182bc4'::uuid;
 if r->'fixture_manifest' is distinct from '{"prepared_only":true,"project":"imvkhicfmidzbzsbhkzs","run_id":"813aabca-15c9-45f8-8f3b-06a582182bc4","label":"bm-race-813aabca","namespace":135506621,"client_id":"2ba5b51e-62d8-48db-915f-b273e84736bb","user_id":"7da00277-4ee2-4719-bfa4-43e77f4fb6ed","staff_id":"eb1493cf-c9fe-4956-a57e-0ce120c55c02","cases":[{"index":1,"id":"read-committed/cycle","isolation":"read committed","scenario":"cycle","assets":["fd142b5a-a3f6-4101-893e-05800cce7fc1","18e6f562-5e21-4a31-800c-f85cc497b3b9"],"mark_id":null,"application_number":"90000001","expected_code":"22023"},{"index":2,"id":"read-committed/stale-edit","isolation":"read committed","scenario":"stale-edit","assets":["2a59ad79-aa74-491e-ac99-7ac76d283af6"],"mark_id":null,"application_number":"90000002","expected_code":"40001"},{"index":3,"id":"read-committed/membership-revocation","isolation":"read committed","scenario":"membership-revocation","assets":["ca9f9ade-0e14-4a07-9f57-6438bb7ad404"],"mark_id":null,"application_number":"90000003","expected_code":"42501"},{"index":4,"id":"read-committed/direct-mark-update","isolation":"read committed","scenario":"direct-mark-update","assets":["8b8e7f07-63b5-49a6-a2e8-31e968d47368"],"mark_id":"e618603b-0870-444b-b05c-002ec03d3497","application_number":"90000004","expected_code":"40001"},{"index":5,"id":"read-committed/uspto-import","isolation":"read committed","scenario":"uspto-import","assets":["feb8d9ed-965f-45bd-a627-ab4bcc9d15bc"],"mark_id":"a9ae4510-128c-4782-b5b7-e7b8b2fcea6c","application_number":"90000005","expected_code":"40001"},{"index":6,"id":"read-committed/review-and-status-refresh","isolation":"read committed","scenario":"review-and-status-refresh","assets":["c4ac0364-cd70-41c2-b7d2-d8572a0b2778"],"mark_id":"c02015f4-14e3-4f15-9292-09774decc262","application_number":"90000006","expected_code":"00000"},{"index":7,"id":"repeatable-read/cycle","isolation":"repeatable read","scenario":"cycle","assets":["6253e2f6-8784-4f3c-b4e4-94a6113d2c51","5519344a-caea-4e91-85c1-0cfe55e96d12"],"mark_id":null,"application_number":"90000007","expected_code":"40001"},{"index":8,"id":"repeatable-read/stale-edit","isolation":"repeatable read","scenario":"stale-edit","assets":["daab1bd9-0221-4873-ae93-30d2d31bd93e"],"mark_id":null,"application_number":"90000008","expected_code":"40001"},{"index":9,"id":"repeatable-read/membership-revocation","isolation":"repeatable read","scenario":"membership-revocation","assets":["bc121fa5-9fc1-489b-a8ac-d83229919457"],"mark_id":null,"application_number":"90000009","expected_code":"40001"},{"index":10,"id":"repeatable-read/direct-mark-update","isolation":"repeatable read","scenario":"direct-mark-update","assets":["0d223c64-ad77-47ce-ac74-f55fef505cd6"],"mark_id":"fb750360-1320-4bea-8e2a-f323f2176593","application_number":"90000010","expected_code":"40001"},{"index":11,"id":"repeatable-read/uspto-import","isolation":"repeatable read","scenario":"uspto-import","assets":["73460f11-21b7-4069-a536-89d9562a5307"],"mark_id":"2b2bb3c7-56ae-4b22-8696-254abdc9bc81","application_number":"90000011","expected_code":"40001"},{"index":12,"id":"repeatable-read/review-and-status-refresh","isolation":"repeatable read","scenario":"review-and-status-refresh","assets":["8a050ee3-e296-4fb7-8a55-85e9237ea2db"],"mark_id":"c491758e-0988-491a-bf15-0e9d497ce306","application_number":"90000012","expected_code":"00000"}]}'::jsonb or r->>'draft_hash'<>'21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3' or (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata) is distinct from r->>'installed_schema' then raise exception 'Run ownership or installed schema changed'; end if;
 if not exists(select 1 from public.vb_clients where id='2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid and name='Brand Map race 813aabca-15c9-45f8-8f3b-06a582182bc4' and portal_enabled and archived_at is null)
 or not exists(select 1 from auth.users where id='7da00277-4ee2-4719-bfa4-43e77f4fb6ed'::uuid and email='bm-race-813aabca-15c9-45f8-8f3b-06a582182bc4-client@example.invalid' and coalesce(encrypted_password,'')='')
 or not exists(select 1 from auth.users where id='eb1493cf-c9fe-4956-a57e-0ce120c55c02'::uuid and email='bm-race-813aabca-15c9-45f8-8f3b-06a582182bc4-staff@example.invalid' and coalesce(encrypted_password,'')='')
 then raise exception 'Synthetic ownership markers changed'; end if;
end $bm_run_guard$;
do $bm_fresh_case$ begin
 if exists(select 1 from vb_private.brand_map_race_runs where run_id='813aabca-15c9-45f8-8f3b-06a582182bc4'::uuid and payload->'completed' ? 'read-committed/review-and-status-refresh') then raise exception 'Case already completed: no automatic replay'; end if;
 if (select count(*) from public.vb_brand_assets where id in ('c4ac0364-cd70-41c2-b7d2-d8572a0b2778'::uuid) and client_id='2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid and version=1 and identity_revision=1)<>1
 or not exists(select 1 from vb_private.client_memberships where client_id='2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid and user_id='7da00277-4ee2-4719-bfa4-43e77f4fb6ed'::uuid and active)
 then raise exception 'Case fixture is no longer fresh'; end if;
 if not exists(select 1 from public.vb_marks where id='c02015f4-14e3-4f15-9292-09774decc262'::uuid and client_id='2ba5b51e-62d8-48db-915f-b273e84736bb'::uuid and record_owner='Test owner' and status='inactive' and application_number is null and archived_at is null) then raise exception 'Mark fixture changed'; end if;
end $bm_fresh_case$;
do $bm_controller_exists$ begin
 if (select count(*) from (select a.pid from pg_stat_activity a join pg_locks l on l.pid=a.pid where a.datname=current_database() and a.usename='postgres' and a.application_name='bm-race-813aabca-6-controller' and a.state='active' and l.locktype='advisory' and l.classid=135506621::oid and l.objid=6::oid and l.objsubid=2 and l.granted) controller)<>1 then raise exception 'Controller does not own this gate'; end if;
end $bm_controller_exists$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"eb1493cf-c9fe-4956-a57e-0ce120c55c02","role":"authenticated","aal":"aal2"}',true);
do $bm_winner$ begin
 execute 'select public.vb_review_brand_legal_link(''2ba5b51e-62d8-48db-915f-b273e84736bb''::uuid,''c4ac0364-cd70-41c2-b7d2-d8572a0b2778''::uuid,''c02015f4-14e3-4f15-9292-09774decc262''::uuid,1,1,''{"client_id":"2ba5b51e-62d8-48db-915f-b273e84736bb","name":"Status refresh mark","mark_type":"word","record_owner":"Test owner"}''::jsonb)';
 perform pg_advisory_xact_lock(135506621,6);
 perform set_config('vb_brand_map.race_report',jsonb_build_object('run_id','813aabca-15c9-45f8-8f3b-06a582182bc4','case_id','read-committed/review-and-status-refresh','actor','winner','pid',pg_backend_pid(),'isolation',current_setting('transaction_isolation'),'status','WINNER_COMMITTED','action_performed',true,'controller_gate_released',true)::text,true);
end $bm_winner$;
reset role;
select current_setting('vb_brand_map.race_report')::jsonb as brand_map_race_report;
commit;
