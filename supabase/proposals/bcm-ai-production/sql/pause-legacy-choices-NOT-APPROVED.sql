-- Only if preflight finds enabled legacy choices. Explicit approval required.
-- Keeps websites/categories/frequency/history; changes enabled choices to paused.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 if exists(select 1 from vb_private.bcm_scheduler_config where ready) then raise exception 'Pause legacy readiness first';end if;
end; $$;
update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,updated_at=now() where enabled;
commit;
