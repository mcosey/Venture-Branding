-- Final approved Test activation, after successful manual/API and access checks.
-- Uses the existing private scheduler credential. Creates no account or local software.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required';end if;
 if not exists(select 1 from pg_extension where extname='pg_cron') or not exists(select 1 from pg_extension where extname='pg_net') then raise exception 'Existing scheduling capabilities required; do not install anything';end if;
 if exists(select 1 from cron.job where jobname in ('vb-bcm-ai-test-tick','vb-bcm-due-tick') and active) then raise exception 'Inspect existing jobs';end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-ai-test-tick') then raise exception 'AI job already exists; inspect before reactivating';end if;
 if not (select ready from vb_private.bcm_ai_config where singleton) then raise exception 'Complete manual trial first';end if;
 if (select count(*) from vault.decrypted_secrets where name='bcm_scheduler_project_url' and decrypted_secret='https://imvkhicfmidzbzsbhkzs.supabase.co')<>1
 or (select count(*) from vault.decrypted_secrets where name='bcm_scheduler_secret' and length(decrypted_secret)>=32 and decrypted_secret !~ '[[:space:]]')<>1 then raise exception 'Existing private scheduler configuration unavailable';end if;
end; $$;
create function vb_private.dispatch_bcm_ai_tick() returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text; credential text;
begin
 if not coalesce((select ready from vb_private.bcm_ai_config where singleton),false)
 or (select count(*) from public.vb_bcm_ai_runs)>=(select max_runs from vb_private.bcm_ai_config where singleton)
 or not coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false)
 or not exists(select 1 from public.vb_bcm_schedules where enabled and next_run_at<=now())
 or exists(select 1 from public.vb_bcm_ai_runs where status='running' and started_at>now()-interval '5 minutes') then return null;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='bcm_scheduler_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='bcm_scheduler_secret';
 if endpoint is distinct from 'https://imvkhicfmidzbzsbhkzs.supabase.co' or credential is null or length(credential)<32 or credential ~ '[[:space:]]' then raise exception 'Private scheduler unavailable';end if;
 return net.http_post(url:=endpoint||'/functions/v1/bcm-ai-schedule',body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','x-bcm-scheduler-secret',credential),timeout_milliseconds:=110000);
end; $$;
revoke all on function vb_private.dispatch_bcm_ai_tick() from public,anon,authenticated;
grant execute on function vb_private.dispatch_bcm_ai_tick() to service_role;
select cron.schedule('vb-bcm-ai-test-tick','*/2 * * * *','select vb_private.dispatch_bcm_ai_tick();');
commit;
