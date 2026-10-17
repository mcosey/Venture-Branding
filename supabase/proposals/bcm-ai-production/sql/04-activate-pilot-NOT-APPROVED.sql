-- DRAFT ONLY / SEPARATE USER APPROVAL REQUIRED. NOT PART OF DISABLED INSTALLATION.
-- Replace the invalid placeholder only after naming/approving the pilot client.
-- Worker release switch and paid frontend controls also require separate approval.
begin;
do $$ declare pilot uuid:='REPLACE_WITH_APPROVED_CLIENT_UUID'::uuid; begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 if not exists(select 1 from public.vb_clients where id=pilot and portal_enabled and archived_at is null) then raise exception 'Approved active pilot client required';end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-due-tick' and active) then raise exception 'Legacy crawler job must remain inactive';end if;
 if exists(select 1 from public.vb_bcm_schedules where enabled) then raise exception 'Existing legacy choices must be explicitly paused first; no automatic restart';end if;
 update vb_private.bcm_ai_config set pilot_client_id=pilot,ready=true where singleton;
 update vb_private.bcm_scheduler_config set ready=true where singleton;
end; $$;
commit;
-- No cron or client schedule is enabled by this script.
-- Client must re-save website/consent and choose Start monitoring separately.
