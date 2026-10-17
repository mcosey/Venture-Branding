-- DRAFT ONLY. BCM TEST ONLY. Disable our job and pause monitoring; preserve saved settings, scans and other jobs.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test database required'; end if;
end; $$;
update vb_private.bcm_scheduler_config set ready=false where singleton;
update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,updated_at=now() where enabled;
do $$ declare job bigint; begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  for job in select jobid from cron.job where jobname='vb-bcm-due-tick' and command='select vb_private.dispatch_bcm_tick();' loop
   perform cron.unschedule(job);
  end loop;
 end if;
end; $$;
commit;
