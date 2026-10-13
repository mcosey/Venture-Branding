-- Read-only after installation: false, null, zero and RLS true are expected.
select (select ready from vb_private.bcm_ai_config) as ai_ready,
 (select pilot_client_id from vb_private.bcm_ai_config) is null as no_pilot_selected,
 (select max_runs from vb_private.bcm_ai_config) as pilot_attempt_ceiling,
 (select count(*) from public.vb_bcm_ai_runs) as runs,
 (select count(*) from cron.job where jobname in ('vb-bcm-due-tick','vb-bcm-ai-pilot-tick') and active) as active_bcm_jobs;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('vb_bcm_ai_runs','vb_bcm_ai_observations','vb_bcm_ai_reviews','vb_bcm_ai_publications');
select has_function_privilege('anon','public.vb_begin_bcm_ai_run(uuid,integer)','EXECUTE') as anon_can_scan,
 has_function_privilege('authenticated','public.vb_finish_bcm_ai_run(uuid,jsonb,boolean)','EXECUTE') as client_can_finish,
 has_function_privilege('service_role','public.vb_finish_bcm_ai_run(uuid,jsonb,boolean)','EXECUTE') as worker_can_finish;
