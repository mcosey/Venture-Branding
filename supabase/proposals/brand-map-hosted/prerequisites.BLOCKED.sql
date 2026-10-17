-- REVIEW ONLY. NOT EXECUTED. This expands the prior approved test change list.
-- Proposed only for BCM Test, inside the existing inner rollback block.
-- The current host wrapper still refuses these missing dependencies.
-- Do not run a selection, replay old migrations, or commit these changes.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
do $vb_prerequisite_proposal$
begin
  if false is not true then
    raise exception 'Prerequisite changes have not been approved: review copy is blocked.';
  end if;
  if current_database()<>'postgres' or current_user<>'postgres'
    or (select system_identifier::text from pg_control_system())<>'7692130048193495360' then
    raise exception 'Wrong test database identity: stop.';
  end if;
end;
$vb_prerequisite_proposal$;

-- Exactly three nullable date fields. No existing records are populated/edited.
alter table public.vb_marks
  add column filing_date date,
  add column registration_date date,
  add column uspto_status_date date;

-- Supabase-supported database test extension; no Mac software installation.
create extension pgtap with schema extensions;

-- In the future approved integrated test, run the draft/assertions here,
-- with before/after preservation checks around the inner rollback block.
-- Keep all of these additions INSIDE that rollback block, never persistent.
rollback;
