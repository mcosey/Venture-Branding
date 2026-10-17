-- No API calls. Temporary fictional workspaces reuse an existing actor and roll back.
begin;
do $$ declare target uuid:='10000000-0000-0000-0000-000000000001'; second uuid:='b9200000-0000-0000-0000-000000000001'; actor uuid; cfg public.vb_bcm_settings; job jsonb; payload jsonb; used integer; total integer; i integer; decision public.vb_bcm_schedules;
begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 select user_id into actor from vb_private.client_memberships where client_id=target and active limit 1;
 if actor is null or exists(select 1 from public.vb_clients where id=second) then raise exception 'Existing actor or clean fixture required';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 if (public.vb_bcm_ai_allowance(target)->>'limit')::integer<>8 then raise exception 'Wrong client default';end if;
 begin perform public.vb_bcm_ai_allowance(second);raise exception 'Foreign-client usage exposed';exception when insufficient_privilege then null;end;
 if public.vb_bcm_ai_allowance(target) ? 'global_used' then raise exception 'Shared usage exposed';end if;
 select (public.vb_bcm_ai_allowance(target)->>'used')::integer into used;
 if used<1 then raise exception 'Existing month usage required for boundary fixture';end if;
 update vb_private.bcm_ai_config set client_month_limit=used where singleton;
 if (public.vb_bcm_ai_allowance(target)->>'reason')<>'client_limit' then raise exception 'Client cap not enforced';end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 begin perform public.vb_begin_bcm_ai_run(target,cfg.version);raise exception 'Extra reservation accepted';exception when raise_exception then if sqlerrm<>'Monthly research allowance reached' then raise;end if;end;
 insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values(second,'ROLLBACK BCM fixture','business','Fictional fixture',true);
 insert into vb_private.client_memberships(client_id,user_id) values(second,actor);
 insert into public.vb_bcm_settings(client_id,urls,frequency,categories,exclusions,access_mode,discovery_mode,version,authorized_by,authorized_at)
 values(second,array['https://rollout-fixture.example.com/'],'weekly',array['product_names'],array[]::text[],'public','site',1,actor,now());
 update public.vb_bcm_schedules set enabled=true,revision=1,settings_version=1,authorized_by=actor,started_at=now(),next_run_at=now()-interval '1 hour' where client_id=second;
 -- Completed baseline in the previous month is retained but does not spend this month's checks.
 for i in 1..3 loop
  insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,domain,status,started_at,finished_at)
  values(second,1,actor,'rollout-fixture.example.com','completed',vb_private.bcm_ai_month_start()-interval '1 hour',vb_private.bcm_ai_month_start()-interval '30 minutes');
 end loop;
 if (public.vb_bcm_ai_allowance(second)->>'used')::integer<>0 or (public.vb_bcm_ai_baseline_progress(second)->>'completed')::integer<>3 then raise exception 'Monthly reset or baseline retention failed';end if;
 -- The exhausted original client is earlier in the due queue; the second must still run.
 update public.vb_bcm_schedules set next_run_at=now()-interval '2 hours' where client_id=target;
 update vb_private.bcm_ai_config set client_month_limit=1 where singleton;
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 job:=public.vb_claim_bcm_ai_due_run();
 if (job->'settings'->>'client_id')::uuid is distinct from second then raise exception 'Exhausted client blocked the queue';end if;
 if not public.vb_bcm_ai_run_is_current((job->>'ticket')::uuid) then raise exception 'Last permitted reservation invalid at cap';end if;
 payload:=jsonb_build_object('source','openai-observations-v1','model','gpt-6-luna','domain','rollout-fixture.example.com','coverage','limited','coverage_note','Rollback only; no provider call','consulted_urls',jsonb_build_array('https://rollout-fixture.example.com/'),'observations','[]'::jsonb,'usage','{}'::jsonb);
 if public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,payload,false)<>'completed' then raise exception 'Final permitted run discarded';end if;
 if public.vb_claim_bcm_ai_due_run() is not null then raise exception 'Unexpected additional queue reservation';end if;
 if (vb_private.bcm_ai_allowance(second)->>'used')::integer<>1 then raise exception 'New month count wrong';end if;
 -- A failed attempt also counts, without a provider request or automatic retry.
 insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,domain,status,finished_at) values(second,1,actor,'rollout-fixture.example.com','failed',now());
 if (vb_private.bcm_ai_allowance(second)->>'used')::integer<>2 then raise exception 'Failure bypassed budget';end if;
 select count(*) into total from public.vb_bcm_ai_runs where started_at>=vb_private.bcm_ai_month_start();
 update vb_private.bcm_ai_config set global_month_limit=total,client_month_limit=8 where singleton;
 if (vb_private.bcm_ai_allowance(second)->>'reason')<>'global_limit' or public.vb_claim_bcm_ai_due_run() is not null then raise exception 'Shared cap not enforced';end if;
 update vb_private.bcm_ai_config set global_month_limit=200,ready=false where singleton;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 if (public.vb_bcm_ai_allowance(second)->>'reason')<>'paused' then raise exception 'Global pause ignored';end if;
 decision:=public.vb_set_bcm_ai_monitoring(second,1,1,false);
 if decision.enabled then raise exception 'Cannot pause without research';end if;
 -- Archived workspaces cannot spend remaining allowance.
 update vb_private.bcm_ai_config set ready=true where singleton;
 update public.vb_clients set archived_at=now() where id=second;
 if (vb_private.bcm_ai_allowance(second)->>'reason')<>'client_unavailable' then raise exception 'Archived client enabled';end if;
end;$$;
set local role authenticated;
do $$ begin if exists(select 1 from public.vb_bcm_ai_observations) or exists(select 1 from public.vb_bcm_ai_reviews) then raise exception 'Private findings or notes exposed';end if;end;$$;
reset role;
rollback;
select true as monthly_budget_matrix_passed,true as client_boundary,true as shared_boundary,true as old_month_reset,true as fair_queue,true as final_reservation_completes,true as pause_available,true as private_data_hidden,true as no_api_calls;
