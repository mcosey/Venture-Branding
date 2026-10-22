-- LOCAL PROPOSAL ONLY. Not applied. Main VB dashboard omvkwiosonatswocbdgx only.
-- Verify the dashboard URL independently; identity drift must stop execution.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';
DO $preflight$
BEGIN
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216'
 then raise exception 'Expected main Venture Branding database and postgres executor'; end if;
 if not exists(select 1 from pg_extension where extname='pg_cron')
 then raise exception 'Existing pg_cron required; do not install anything'; end if;
 if coalesce(current_setting('cron.timezone',true),'') not in ('GMT','UTC')
 then raise exception 'Review cron timezone before proposing 03:17 UTC; change no settings'; end if;
 if current_setting('cron.log_run',true) is distinct from 'on'
 then raise exception 'Existing cron run logging must remain on'; end if;
 if to_regclass('cron.job_run_details') is null or to_regclass('cron.job') is null
 then raise exception 'Existing cron metadata required; do not install anything'; end if;
 if (select relkind<>'r' from pg_class where oid='cron.job_run_details'::regclass)
 or not exists(select 1 from pg_index where indrelid='cron.job_run_details'::regclass
   and indisprimary and indnatts=1 and indkey[0]=(select attnum from pg_attribute
    where attrelid='cron.job_run_details'::regclass and attname='runid' and atttypid='bigint'::regtype and not attisdropped))
 or (select count(*) from pg_attribute where attrelid='cron.job_run_details'::regclass and not attisdropped
   and ((attname='end_time' and atttypid='timestamptz'::regtype) or (attname='status' and atttypid='text'::regtype)))<>2
 then raise exception 'Unexpected cron history shape'; end if;
 if exists(select 1 from pg_trigger where tgrelid='cron.job_run_details'::regclass and not tgisinternal and tgenabled<>'D')
 or exists(select 1 from pg_rewrite where ev_class='cron.job_run_details'::regclass and ev_enabled<>'D')
 or exists(select 1 from pg_constraint where contype='f' and confrelid='cron.job_run_details'::regclass)
 then raise exception 'Unexpected history trigger, rule or dependent foreign key'; end if;
 if not has_table_privilege(current_user,'cron.job_run_details','SELECT')
 or not has_table_privilege(current_user,'cron.job_run_details','DELETE')
 then raise exception 'Existing history privileges required; grant nothing'; end if;
 if exists(select 1 from cron.job where jobname='vb-ops-cron-history-retention-30d')
 then raise exception 'Named retention job already exists; inspect rather than overwrite'; end if;
 if exists(select 1 from cron.job where jobname in ('delete-job-run-details','job-run-details-cleanup')
   or command ilike '%job_run_details%')
 then raise exception 'Possible competing history maintenance; inspect before scheduling'; end if;
 if to_regprocedure('cron.schedule(text,text,text)') is null
 or to_regprocedure('cron.unschedule(bigint)') is null
 then raise exception 'Expected native cron functions required'; end if;
 if not has_function_privilege(current_user,'cron.schedule(text,text,text)','EXECUTE')
 or not has_function_privilege(current_user,'cron.unschedule(bigint)','EXECUTE')
 then raise exception 'Existing cron execution rights required; grant nothing'; end if;
END;
$preflight$;
SELECT jsonb_build_object('target_guard_passed',true,'cron_timezone',current_setting('cron.timezone',true),
 'eligible_finished_rows',(select count(*) from cron.job_run_details
   where status in ('succeeded','failed') and end_time is not null and end_time<now()-interval '30 days'),
 'history_allocated_bytes',pg_total_relation_size('cron.job_run_details'::regclass),
 'history_rows',(select count(*) from cron.job_run_details),
 'current_job_count',(select count(*) from cron.job)) AS retention_preflight;
ROLLBACK;
