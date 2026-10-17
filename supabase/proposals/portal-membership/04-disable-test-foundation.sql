-- Non-destructive fallback. Leaves all records and legacy access untouched.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
revoke all on function public.vb_account_access() from public,anon,authenticated;
revoke all on public.vb_member_profiles,public.vb_member_companies,public.vb_member_progress,public.vb_engagements,public.vb_matters from public,anon,authenticated;
-- Also remove column-level write privileges, which table-level revokes do not remove.
revoke update(full_name,updated_at) on public.vb_member_profiles from authenticated;
revoke update(name,launch_date,industry,stage,entity_type,country,region,updated_at) on public.vb_member_companies from authenticated;
revoke update(progress,updated_at) on public.vb_member_progress from authenticated;
commit;
