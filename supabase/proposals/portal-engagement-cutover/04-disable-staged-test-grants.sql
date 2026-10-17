-- Non-destructive fallback, NOT applied. Does not revoke existing legacy access.
-- Only for this staged mapping checkpoint, before any legacy authorization cutover.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if (select count(*) from vb_private.legacy_test_mappings where engagement_id::text like 'f1700000-%' and label='Fictional Test mapping — October 16, 2026' and not enforcement_enabled)<>4 then raise exception 'Mapping changed: review fallback'; end if;
end $$;
update vb_private.engagement_grants set status='revoked'
 where engagement_id in(select engagement_id from vb_private.legacy_test_mappings);
update vb_private.engagement_services set enabled=false
 where engagement_id in(select engagement_id from vb_private.legacy_test_mappings);
update public.vb_engagements set status='closed',closed_at=clock_timestamp()
 where id in(select engagement_id from vb_private.legacy_test_mappings) and status='active';
-- Keep mapping, matters, accounts, original legal records and Member data intact.
commit;
