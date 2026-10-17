-- Executed with approval in BCM Test on 2026-10-10; trial job removed afterward.
-- Production untouched. One-time function creation: do not rerun blindly; dispatcher is retained.
-- Preflight: approved pg_cron + pg_net capabilities are enabled inside Supabase (no local installation).
-- Deploy bcm-schedule with legacy JWT verification OFF: it uses a private scheduler header, rejects browser origins,
-- and does not accept client targets. BCM_SCHEDULER_SECRET must match the private Vault secret below.
-- Store a randomly generated >=32-character secret privately as bcm_scheduler_secret in Vault and worker secrets.
-- Store https://imvkhicfmidzbzsbhkzs.supabase.co as bcm_scheduler_project_url in Vault. Never paste secret values into this file/chat.
begin;
create function vb_private.dispatch_bcm_tick() returns bigint
language plpgsql security definer set search_path='' as $$
declare endpoint text; credential text;
begin
 if not coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false) then return null; end if;
 if not exists(select 1 from public.vb_bcm_schedules where enabled and next_run_at<=now())
 or exists(select 1 from public.vb_bcm_scans where schedule_revision is not null and status='running' and started_at>now()-interval '2 minutes') then return null; end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='bcm_scheduler_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='bcm_scheduler_secret';
 if endpoint is distinct from 'https://imvkhicfmidzbzsbhkzs.supabase.co' or credential is null or length(credential)<32 then raise exception 'Scheduler configuration unavailable'; end if;
 return net.http_post(url:=endpoint||'/functions/v1/bcm-schedule',body:='{}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json','x-bcm-scheduler-secret',credential),timeout_milliseconds:=110000);
end; $$;
revoke all on function vb_private.dispatch_bcm_tick() from public,anon,authenticated;
grant execute on function vb_private.dispatch_bcm_tick() to service_role;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test database required'; end if;
 if not exists(select 1 from pg_extension where extname='pg_cron') or not exists(select 1 from pg_extension where extname='pg_net') then raise exception 'Approve and enable existing Supabase scheduling capabilities first'; end if;
 if (select count(*) from vault.decrypted_secrets where name='bcm_scheduler_project_url' and decrypted_secret='https://imvkhicfmidzbzsbhkzs.supabase.co')<>1
 or (select count(*) from vault.decrypted_secrets where name='bcm_scheduler_secret' and length(decrypted_secret)>=32)<>1 then raise exception 'Private scheduler configuration required'; end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-due-tick') then raise exception 'Existing BCM job: inspect before changing it'; end if;
 perform cron.schedule('vb-bcm-due-tick','*/2 * * * *','select vb_private.dispatch_bcm_tick();');
 update vb_private.bcm_scheduler_config set ready=true where singleton;
end; $$;
commit;
