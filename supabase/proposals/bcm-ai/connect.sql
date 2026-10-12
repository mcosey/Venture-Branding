-- Approve only after deploying both new Test workers and privately saving OPENAI_API_KEY.
-- No automatic job is created. Existing client schedules remain paused.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required';end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-due-tick' and active) then raise exception 'Legacy scanner job must remain inactive';end if;
 if exists(select 1 from public.vb_bcm_schedules where enabled) then raise exception 'Inspect existing schedules before connecting AI';end if;
end; $$;
update vb_private.bcm_ai_config set ready=true where singleton;
update vb_private.bcm_scheduler_config set ready=true where singleton;
commit;
