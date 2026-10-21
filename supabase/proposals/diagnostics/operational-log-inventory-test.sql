-- PREPARED ONLY. Run after the owner coordinates resuming BCM Test.
-- Read existing cron metadata/counts only. No job is created, changed or run.
-- Do not select cron commands, return_message, request payloads or identities.
begin read only;
do $$ begin
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7692130048193495360'
 then raise exception 'Expected BCM Test and reviewed executor';end if;
end $$;
select exists(select 1 from pg_extension where extname='pg_cron') as cron_installed,
 current_setting('cron.log_run',true)='on' as cron_run_logging_enabled,
 to_regclass('cron.job_run_details') is not null as existing_run_history_available;
-- If pg_cron is absent these queries stop safely; do not install it as a shortcut.
select jobname,schedule,active from cron.job where jobname='vb-inbox-digests';
select case when d.status in ('succeeded','failed','running','starting','connecting','sending') then d.status else 'other' end as outcome,
 count(*) as runs,min(d.start_time) as oldest_retained_start,max(d.start_time) as latest_start,
 max(d.end_time) as latest_finish
from cron.job_run_details d join cron.job j using(jobid)
where j.jobname='vb-inbox-digests'
group by 1 order by 1;
rollback;
