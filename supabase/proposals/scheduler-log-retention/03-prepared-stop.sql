-- LOCAL PROPOSAL ONLY. Not applied. Main VB dashboard omvkwiosonatswocbdgx only.
-- Verify the dashboard URL independently; identity drift must stop execution.
-- Stops future expiry only. Cannot restore history already deleted.
-- Replace only the receipt placeholder with the reviewed installed_job_id before use.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';
DO $stop$
DECLARE
 expected_job_id constant bigint := '__REVIEWED_INSTALL_JOB_ID__'::bigint;
 removed boolean;
BEGIN
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216'
 then raise exception 'Expected main Venture Branding database and postgres executor'; end if;
 if expected_job_id<=0 then raise exception 'Reviewed installation receipt required'; end if;
 if to_regclass('cron.job') is null or to_regprocedure('cron.unschedule(bigint)') is null
 then raise exception 'Expected existing cron objects required'; end if;
 if (select count(*) from cron.job where jobname='vb-ops-cron-history-retention-30d')<>1
 or not exists(select 1 from cron.job where jobid=expected_job_id
   and jobname='vb-ops-cron-history-retention-30d' and schedule='17 3 * * *'
   and md5(command)='9a68d8518c38c2cacc1b9ebbf7780818' and database=current_database() and username=current_user
   and nodename in ('localhost','127.0.0.1','::1') and nodeport=current_setting('port')::integer)
 then raise exception 'Installed retention job differs from reviewed receipt; stop without changing it'; end if;
 removed:=cron.unschedule(expected_job_id);
 if removed is distinct from true or exists(select 1 from cron.job where jobid=expected_job_id)
 then raise exception 'Unable to verify owned-job removal'; end if;
END;
$stop$;
SELECT 'Owned retention schedule removed; expired history is not restored' AS retention_stop;
COMMIT;
