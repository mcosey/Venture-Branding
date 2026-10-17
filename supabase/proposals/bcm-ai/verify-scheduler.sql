-- Test-only scheduler regression. Synthetic reservations roll back; no API calls.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required';end if;
end; $$;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare target uuid; ticket jsonb; due timestamptz;
begin
 select cfg.client_id into target from public.vb_bcm_settings cfg join public.vb_bcm_schedules sched on sched.client_id=cfg.client_id
 where vb_private.bcm_ai_valid(cfg) and vb_private.bcm_actor_has_access(cfg.client_id,sched.authorized_by) limit 1;
 if target is null then raise exception 'Save and start an existing Test client first';end if;
 if exists(select 1 from public.vb_bcm_ai_runs where status='running' and started_at>now()-interval '5 minutes') then raise exception 'Wait for current research';end if;
 update public.vb_bcm_schedules set enabled=false,next_run_at=null;
 update public.vb_bcm_settings set frequency='weekly' where client_id=target;
 update public.vb_bcm_schedules set enabled=true,next_run_at=now() where client_id=target;
 ticket:=public.vb_claim_bcm_ai_due_run();
 if ticket is null or not public.vb_bcm_ai_run_is_current((ticket->>'ticket')::uuid) then raise exception 'Scheduled reservation failed';end if;
 select next_run_at into due from public.vb_bcm_schedules where client_id=target;
 if due is distinct from now()+interval '168 hours' then raise exception 'Weekly interval failed';end if;
 if public.vb_claim_bcm_ai_due_run() is not null then raise exception 'Duplicate due reservation';end if;
 perform public.vb_finish_bcm_ai_run((ticket->>'ticket')::uuid,null,true);
 update public.vb_bcm_settings set frequency='monthly' where client_id=target;
 update public.vb_bcm_schedules set enabled=true,next_run_at=now() where client_id=target;
 ticket:=public.vb_claim_bcm_ai_due_run();
 select next_run_at into due from public.vb_bcm_schedules where client_id=target;
 if ticket is null or due is distinct from ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' then raise exception 'Monthly interval failed';end if;
 update public.vb_bcm_schedules set enabled=false,next_run_at=null where client_id=target;
 if public.vb_bcm_ai_run_is_current((ticket->>'ticket')::uuid) then raise exception 'Pause did not invalidate scheduled reservation';end if;
 raise notice 'PASS: scheduled reservation, weekly/monthly interval, duplicate prevention and pause invalidation';
end; $$;
rollback;
