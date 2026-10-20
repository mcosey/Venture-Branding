-- PREPARED ONLY. Fresh Test inspection on October 19 found these prerequisites absent.
-- No existing records are populated, deduplicated, archived or deleted.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
-- BEGIN HOSTED IDENTITY GUARD (omitted only by the isolated local harness)
do $$ begin
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Expected reviewed BCM Test database and executor'; end if;
end $$;
-- END HOSTED IDENTITY GUARD
-- Prevent a competing write between the duplicate check and index creation.
lock table public.vb_marks in share row exclusive mode;
do $guard$ begin
 if exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname in('filing_date','registration_date','uspto_status_date') and not attisdropped)
  or to_regclass('public.vb_marks_client_application_unique') is not null then
  raise exception 'Import prerequisites changed since inspection; review instead of replacing';
 end if;
 if not (select relrowsecurity from pg_class where oid='public.vb_marks'::regclass) then raise exception 'Expected marks RLS'; end if;
 if exists(select 1 from public.vb_marks where archived_at is null and application_number is not null and application_number<>'' group by client_id,application_number having count(*)>1) then
  raise exception 'Existing duplicate application numbers; no records changed';
 end if;
end $guard$;
-- Same nullable fields and partial uniqueness rule as the maintained import migration.
alter table public.vb_marks add column filing_date date, add column registration_date date, add column uspto_status_date date;
create unique index vb_marks_client_application_unique on public.vb_marks(client_id,application_number)
 where archived_at is null and application_number is not null and application_number<>'';
commit;
