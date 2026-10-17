-- Prepared, NOT applied. Fail-closed fallback; never restore permissive membership access.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if (select count(*) from vb_private.legacy_test_mappings where enforcement_enabled)<>4 then raise exception 'Unexpected cutover state'; end if;
end $$;
-- Disables only the four converted fictional client workspaces. Retains every legal record,
-- engagement lifecycle, Member account/company/progress and unrelated client workspace.
update public.vb_clients set portal_enabled=false where id in(select client_id from vb_private.legacy_test_mappings);
-- Existing worker and record guards now deny work for these disabled clients.
-- Leave global scheduler/research configuration and other clients unchanged.
commit;
