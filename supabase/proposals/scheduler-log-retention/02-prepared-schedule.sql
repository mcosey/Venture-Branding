-- LOCAL PROPOSAL ONLY. Not applied. Main VB dashboard omvkwiosonatswocbdgx only.
-- Verify the dashboard URL independently; identity drift must stop execution.
-- Scheduling this job enables irreversible expiry on its next run. Separate approval required.
-- No immediate cleanup is invoked by this installer. No grants/functions/tables are created.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';
DO $install$
DECLARE
 expected_command constant text := $cleanup_command$-- VB scheduler-history retention v1: no application data or helper functions.
-- Cron executes this command batch atomically; no explicit transaction-control statements.
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';
DO $runtime$
BEGIN
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216'
 then raise exception 'Expected main Venture Branding database and postgres executor'; end if;
 if to_regclass('cron.job_run_details') is null or to_regclass('cron.job') is null
 then raise exception 'Existing cron metadata required; do not install anything'; end if;
 -- Hold the history schema stable through validation and deletion.
 LOCK TABLE cron.job_run_details IN ROW EXCLUSIVE MODE;
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
END;
$runtime$;
WITH eligible AS MATERIALIZED (
 SELECT runid FROM cron.job_run_details
 WHERE status IN ('succeeded','failed') AND end_time IS NOT NULL
 AND end_time < now() - interval '30 days'
 ORDER BY end_time,runid LIMIT 5000
 FOR UPDATE SKIP LOCKED
)
DELETE FROM cron.job_run_details d USING eligible e
WHERE d.runid=e.runid AND d.status IN ('succeeded','failed')
AND d.end_time IS NOT NULL AND d.end_time < now() - interval '30 days';
$cleanup_command$;
 installed bigint;
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
 installed:=cron.schedule('vb-ops-cron-history-retention-30d','17 3 * * *',expected_command);
 if installed is null or not exists(select 1 from cron.job where jobid=installed
   and jobname='vb-ops-cron-history-retention-30d' and schedule='17 3 * * *'
   and command=expected_command and active and database=current_database() and username=current_user
   and nodename in ('localhost','127.0.0.1','::1') and nodeport=current_setting('port')::integer)
 then raise exception 'Native job metadata mismatch; scheduling rolled back'; end if;
END;
$install$;
SELECT jobid AS installed_job_id,jobname,schedule,active,md5(command) AS command_md5
FROM cron.job WHERE jobname='vb-ops-cron-history-retention-30d';
COMMIT;
