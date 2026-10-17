-- Verified 2026-10-10: 23 assertions passed in BCM Test. BCM TEST ONLY.
-- Reuses two existing test users; all fixture changes roll back.
-- No recurring job, network request, user creation or password change.
begin;
set local statement_timeout='30s';
do $$
declare actor uuid; other_actor uuid; target uuid; cfg public.vb_bcm_settings; s public.vb_bcm_schedules;
 job jsonb; output text; captured jsonb; saved_revision integer; due timestamptz;manual_ticket uuid; results jsonb:='[]';
begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test database required'; end if;
 if exists(select 1 from public.vb_bcm_scans where status='running') then raise exception 'Wait for all current checks to finish before test'; end if;
 if exists(select 1 from public.vb_bcm_schedules where enabled) then raise exception 'This transactional check requires all schedules paused'; end if;
 select id into actor from auth.users where email='cotivate-filing@example.test';
 select id into other_actor from auth.users where email='mithril-zeppelin-filing@example.test';
 select m.client_id into target from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id
 where m.user_id=actor and m.active and c.portal_enabled and c.archived_at is null order by c.id limit 1;
 if actor is null or other_actor is null or target is null or actor=other_actor then raise exception 'Existing Test users with active membership required'; end if;
 if vb_private.bcm_actor_has_access(target,other_actor) then raise exception 'Choose existing users belonging to different clients'; end if;
 if has_table_privilege('authenticated','public.vb_bcm_schedules','UPDATE') or has_table_privilege('anon','public.vb_bcm_schedules','SELECT')
 or has_function_privilege('authenticated','public.vb_claim_bcm_due_scan()','EXECUTE')
 or has_function_privilege('authenticated','public.vb_bcm_job_is_current(uuid)','EXECUTE') then raise exception 'Unexpected direct/worker privileges'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 select * into cfg from public.vb_bcm_settings where client_id=target;
 cfg:=public.vb_save_bcm_settings(target,coalesce(cfg.version,0),jsonb_build_object('urls',jsonb_build_array('https://example.com/'),'exclusions','[]'::jsonb,'access_mode','public','frequency','weekly','categories',jsonb_build_array('product_names'),'discovery_mode','pages'),true);
 select * into s from public.vb_bcm_schedules where client_id=target;
 if s.enabled or s.next_run_at is not null or s.settings_version<>cfg.version then raise exception 'Save must stay paused'; end if;
 results:=results||jsonb_build_array('PASS: saving leaves automatic monitoring paused');
 update vb_private.bcm_scheduler_config set ready=false where singleton;
 begin perform public.vb_set_bcm_monitoring(target,cfg.version,s.revision,true);raise exception 'Disconnected start was accepted';exception when sqlstate '55000' then null;end;
 results:=results||jsonb_build_array('PASS: disconnected scheduling cannot start');
 update vb_private.bcm_scheduler_config set ready=true where singleton;
 saved_revision:=s.revision;
 s:=public.vb_set_bcm_monitoring(target,cfg.version,s.revision,true);
 if not s.enabled or s.next_run_at>now() then raise exception 'Start did not queue first check'; end if;
 results:=results||jsonb_build_array('PASS: start queues first check');
 begin perform public.vb_set_bcm_monitoring(target,cfg.version,saved_revision,false);raise exception 'Stale change was accepted';exception when serialization_failure then null;end;
 results:=results||jsonb_build_array('PASS: stale revision rejected');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_actor,'role','authenticated','aal','aal1')::text,true);
 begin perform public.vb_set_bcm_monitoring(target,cfg.version,s.revision,false);raise exception 'Other client changed schedule';exception when insufficient_privilege then null;end;
 results:=results||jsonb_build_array('PASS: cross-client control rejected');
 begin perform public.vb_claim_bcm_due_scan();raise exception 'Client called worker reservation';exception when insufficient_privilege then null;end;
 results:=results||jsonb_build_array('PASS: client cannot claim background work');
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 job:=public.vb_claim_bcm_due_scan();
 if job is null or job->'settings'->>'client_id'<>target::text or not public.vb_bcm_job_is_current((job->>'ticket')::uuid) then raise exception 'Due reservation unavailable'; end if;
 results:=results||jsonb_build_array('PASS: saved public setup reserved');
 if public.vb_claim_bcm_due_scan() is not null then raise exception 'Duplicate concurrent reservation'; end if;
 results:=results||jsonb_build_array('PASS: second reservation rejected');
 select next_run_at into due from public.vb_bcm_schedules where client_id=target;
 if due is distinct from now()+interval '168 hours' then raise exception 'Weekly due date incorrect'; end if;
 results:=results||jsonb_build_array('PASS: weekly due date is 168 hours');
 captured:=jsonb_build_object('url','https://example.com/','urls',jsonb_build_array('https://example.com/'),'title','Scheduler fixture','headings','[]'::jsonb,'text','Fictional public product text long enough for snapshot validation.','extractor','source-text-v2','pages',jsonb_build_array(jsonb_build_object('url','https://example.com/','title','Scheduler fixture','headings','[]'::jsonb,'text','Fictional public product text long enough for snapshot validation.','extractor','source-text-v2')));
 output:=public.vb_finish_bcm_baseline((job->>'ticket')::uuid,captured,false);
 if output<>'completed' then raise exception 'First scheduled baseline failed'; end if;
 results:=results||jsonb_build_array('PASS: first scheduled baseline validated');
 -- Advance only fixture due metadata inside this transaction, not the real clock.
 update public.vb_bcm_schedules set next_run_at=now()-interval '1 minute' where client_id=target;
 update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where id=(job->>'ticket')::uuid;
 job:=public.vb_claim_bcm_due_scan();
 if job is null or (select scan_type from public.vb_bcm_scans where id=(job->>'ticket')::uuid)<>'comparison' then raise exception 'Later scheduled check is not a comparison'; end if;
 results:=results||jsonb_build_array('PASS: later check is comparison');
 select * into s from public.vb_bcm_schedules where client_id=target;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 s:=public.vb_set_bcm_monitoring(target,cfg.version,s.revision,false);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.vb_bcm_job_is_current((job->>'ticket')::uuid) then raise exception 'Pause failed to invalidate running job'; end if;
 results:=results||jsonb_build_array('PASS: pause invalidates running check');
 if public.vb_finish_bcm_baseline((job->>'ticket')::uuid,captured,false)<>'failed' then raise exception 'Paused result persisted'; end if;
 results:=results||jsonb_build_array('PASS: paused result rejected');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 cfg:=public.vb_save_bcm_settings(target,cfg.version,jsonb_build_object('urls',jsonb_build_array('https://example.com/'),'exclusions','[]'::jsonb,'access_mode','public','frequency','monthly','categories',jsonb_build_array('product_names'),'discovery_mode','pages'),true);
 select * into s from public.vb_bcm_schedules where client_id=target;
 if s.enabled then raise exception 'Frequency save restarted automatically'; end if;
 results:=results||jsonb_build_array('PASS: frequency save stays paused');
 s:=public.vb_set_bcm_monitoring(target,cfg.version,s.revision,true);
 update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id=target;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 job:=public.vb_claim_bcm_due_scan();
 if job is null then raise exception 'Monthly job not reserved'; end if;
 results:=results||jsonb_build_array('PASS: monthly setting reserved');
 select next_run_at into due from public.vb_bcm_schedules where client_id=target;
 if due is distinct from (((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC') then raise exception 'Monthly due date incorrect'; end if;
 results:=results||jsonb_build_array('PASS: monthly due date uses calendar month UTC');
 update vb_private.client_memberships set active=false where client_id=target and user_id=actor;
 if public.vb_bcm_job_is_current((job->>'ticket')::uuid) then raise exception 'Revoked access remained current'; end if;
 results:=results||jsonb_build_array('PASS: revoked access invalidates check');
 if public.vb_finish_bcm_baseline((job->>'ticket')::uuid,captured,false)<>'failed' then raise exception 'Revoked result persisted'; end if;
 results:=results||jsonb_build_array('PASS: revoked result rejected');
 -- Verify loss of access disables the next reservation rather than retaining an active schedule.
 update public.vb_bcm_schedules set next_run_at=now()-interval '1 minute' where client_id=target;
 update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id=target;
 job:=public.vb_claim_bcm_due_scan();
 select * into s from public.vb_bcm_schedules where client_id=target;
 if job is not null or s.enabled or s.last_status<>'access_unavailable' then raise exception 'Revoked schedule not disabled'; end if;
 results:=results||jsonb_build_array('PASS: revoked authorizer pauses next reservation');
 update vb_private.client_memberships set active=true where client_id=target and user_id=actor;
 select * into s from public.vb_bcm_schedules where client_id=target;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 s:=public.vb_set_bcm_monitoring(target,cfg.version,s.revision,true);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 job:=public.vb_claim_bcm_due_scan();if job is null then raise exception 'Save invalidation fixture unavailable';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 cfg:=public.vb_save_bcm_settings(target,cfg.version,jsonb_build_object('urls',jsonb_build_array('https://example.com/'),'exclusions','[]'::jsonb,'access_mode','public','frequency','weekly','categories',jsonb_build_array('product_names'),'discovery_mode','pages'),true);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.vb_bcm_job_is_current((job->>'ticket')::uuid) or public.vb_finish_bcm_baseline((job->>'ticket')::uuid,captured,false)<>'failed' then raise exception 'Saved changes accepted stale scheduled result';end if;
 results:=results||jsonb_build_array('PASS: saving changes discards in-progress scheduled result');
 -- Existing manual baseline/comparison still work through the new wrapper while scheduling is paused.
 update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id=target;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 manual_ticket:=public.vb_begin_bcm_baseline(target,cfg.version);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.vb_finish_bcm_baseline(manual_ticket,captured,false)<>'completed' then raise exception 'Manual baseline compatibility failed';end if;
 results:=results||jsonb_build_array('PASS: manual baseline remains compatible');
 update public.vb_bcm_scans set started_at=now()-interval '3 minutes' where client_id=target;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 manual_ticket:=public.vb_begin_bcm_comparison(target,cfg.version);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.vb_finish_bcm_baseline(manual_ticket,captured,false)<>'completed' then raise exception 'Manual comparison compatibility failed';end if;
 results:=results||jsonb_build_array('PASS: manual comparison remains compatible');
 if (timestamp '2027-01-31 12:00'+interval '1 month')<>timestamp '2027-02-28 12:00'
 or (timestamp '2028-01-31 12:00'+interval '1 month')<>timestamp '2028-02-29 12:00' then raise exception 'Calendar month-end behavior incorrect';end if;
 results:=results||jsonb_build_array('PASS: monthly dates handle month-end and leap years');
 perform set_config('bcm.scheduling_results',results::text,true);
end; $$;
select current_setting('bcm.scheduling_results')::jsonb as scheduling_results;
rollback;
