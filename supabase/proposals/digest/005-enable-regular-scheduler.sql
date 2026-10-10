-- Approved regular workspace activation; apply after privacy tests pass.
begin;
create extension if not exists pg_cron;
do $$begin if exists(select 1 from cron.job where jobname='vb-inbox-digests') then raise exception 'Digest job already exists; inspect before replacing';end if;end$$;
select cron.schedule('vb-inbox-digests','*/5 * * * *','select vb_private.deliver_due_digests();');
commit;
