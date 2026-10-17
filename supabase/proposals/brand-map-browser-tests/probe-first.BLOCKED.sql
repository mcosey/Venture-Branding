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
set local application_name='brand-map-capability-20261010-first';
select pg_backend_pid() as probe_backend_pid,pg_sleep(15) as bounded_readonly_pause;
rollback;
