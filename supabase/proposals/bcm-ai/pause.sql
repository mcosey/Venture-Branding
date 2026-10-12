-- TEST ONLY. Stop research and automatic dispatch, preserving all observations and code.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required';end if;
end; $$;
update vb_private.bcm_ai_config set ready=false where singleton;
update vb_private.bcm_scheduler_config set ready=false where singleton;
update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,updated_at=now() where enabled;
select cron.alter_job(job_id:=jobid,active:=false) from cron.job where jobname='vb-bcm-ai-test-tick';
commit;
