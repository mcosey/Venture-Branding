-- Apply only after scheduler privacy tests pass. Uses existing Supabase pg_cron.
begin;
create extension if not exists pg_cron;
do $$begin if exists(select 1 from cron.job where jobname='vb-test-inbox-digests') then raise exception 'Digest job already exists; inspect before replacing';end if;end$$;
select cron.schedule('vb-test-inbox-digests','*/5 * * * *','select vb_private.deliver_due_digests();');
commit;
