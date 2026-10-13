-- REVIEW ONLY: read-only Production prerequisites. Does not retrieve secrets/client information.
select (select system_identifier::text from pg_control_system())='7690937621030482216' as correct_production,
 to_regclass('public.vb_bcm_settings') is not null as settings_exist,
 to_regclass('public.vb_bcm_schedules') is not null as schedules_exist,
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='vb_bcm_settings' and column_name='discovery_mode') as one_link_schema_exists,
 to_regprocedure('vb_private.bcm_actor_has_access(uuid,uuid)') is not null as actor_access_check_exists,
 to_regclass('public.vb_bcm_ai_runs') is not null as ai_schema_already_exists,
 (select count(*) from cron.job where jobname='vb-bcm-due-tick' and active) as active_legacy_jobs,
 (select count(*) from public.vb_bcm_schedules where enabled) as saved_legacy_enabled_choices,
 (select ready from vb_private.bcm_scheduler_config where singleton) as legacy_ready;
