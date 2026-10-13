-- STOP SWITCH after separately approved installation/activation. No data is erased.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
end; $$;
update vb_private.bcm_ai_config set ready=false where singleton;
update vb_private.bcm_scheduler_config set ready=false where singleton;
update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,updated_at=now()
where client_id=(select pilot_client_id from vb_private.bcm_ai_config) and enabled;
select cron.alter_job(job_id:=jobid,active:=false) from cron.job where jobname='vb-bcm-ai-pilot-tick';
commit;
-- Also set BCM_AI_RELEASE_ENABLED=false and allowBcmResearch=false.
-- Keep reviewed publications, observations, settings, audit records and workers intact.
