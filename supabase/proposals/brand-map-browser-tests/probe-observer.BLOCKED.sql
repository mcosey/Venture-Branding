-- PREPARED, NOT EXECUTED. Default copy intentionally blocked.
-- Only BCM Test imvkhicfmidzbzsbhkzs; independently verify its exact dashboard URL.
-- Future read-only probe approval and a fresh cluster pin are required.
begin read only;
set local statement_timeout='20s';
set local idle_in_transaction_session_timeout='20s';
do $brand_map_capability_guard$
begin
  if false then null; else raise exception 'Preparation only: probe execution is not approved.'; end if;
  if current_database()<>'postgres' or current_user<>'postgres' then raise exception 'Unexpected executor/database'; end if;
  if (select system_identifier::text from pg_control_system()) is distinct from '__FRESH_BCM_TEST_CLUSTER_PIN__' then raise exception 'Wrong database cluster'; end if;
end;
$brand_map_capability_guard$;
set local application_name='brand-map-capability-20261010-observer';
select jsonb_build_object(
  'own_backend_pid',pg_backend_pid(),
  'simultaneously_active_probe_connections',count(*),
  'distinct_probe_backend_pids',count(distinct pid),
  'probe_pids',coalesce(jsonb_agg(pid order by application_name),'[]'::jsonb),
  'both_waiting_in_bounded_pause',count(*)=2 and bool_and(wait_event='PgSleep'),
  'all_different_from_observer',count(*)=2 and bool_and(pid<>pg_backend_pid())
) as readonly_transport_capability
from pg_stat_activity
where datname=current_database() and usename=current_user and state='active'
and application_name in ('brand-map-capability-20261010-first','brand-map-capability-20261010-second');
rollback;
