begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong retirement database'; end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-due-tick' and command<>'select vb_private.dispatch_bcm_tick();') then raise exception 'Unexpected BCM job'; end if;
end $$;
select jsonb_build_object('settings',(select count(*) from public.vb_bcm_settings),'scans',(select count(*) from public.vb_bcm_scans),'schedules',(select count(*) from public.vb_bcm_schedules),'ready',(select ready from vb_private.bcm_scheduler_config where singleton),'other_jobs',(select coalesce(jsonb_agg(to_jsonb(j) order by jobid),'[]') from cron.job j where jobname<>'vb-bcm-due-tick')) as before_retirement;
update vb_private.bcm_scheduler_config set ready=false where singleton;
select cron.alter_job(jobid,active:=false) from cron.job where jobname='vb-bcm-due-tick' and command='select vb_private.dispatch_bcm_tick();';
select jsonb_build_object('settings',(select count(*) from public.vb_bcm_settings),'scans',(select count(*) from public.vb_bcm_scans),'schedules',(select count(*) from public.vb_bcm_schedules),'ready',(select ready from vb_private.bcm_scheduler_config where singleton),'active_bcm_jobs',(select count(*) from cron.job where jobname='vb-bcm-due-tick' and active),'other_jobs',(select coalesce(jsonb_agg(to_jsonb(j) order by jobid),'[]') from cron.job j where jobname<>'vb-bcm-due-tick')) as after_retirement;
commit;
