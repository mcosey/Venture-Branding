-- Non-destructive Test fallback: stop progress writes without deleting saved data.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
revoke all on function public.vb_save_member_progress(uuid,text,jsonb,timestamptz) from public,anon,authenticated;
commit;
