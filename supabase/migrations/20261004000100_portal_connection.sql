-- Session role is server-derived; browser metadata and selected entrance grant nothing.
begin;
create function public.vb_session_role() returns text
language sql stable security definer set search_path = '' as $$
 select case
 when exists(select 1 from vb_private.staff_members where user_id=auth.uid()) then
   case when vb_private.is_staff() then 'staff' else 'denied' end
 when exists(select 1 from vb_private.client_memberships m where m.user_id=auth.uid() and vb_private.is_client_member(m.client_id)) then 'client'
 else 'denied' end;
$$;
revoke all on function public.vb_session_role() from public, anon;
grant execute on function public.vb_session_role() to authenticated;

-- Save client and internal references atomically, using the caller's RLS policies.
create function public.vb_save_client(record_id uuid, details jsonb, expected_updated_at timestamptz default null) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare saved uuid;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 if record_id is null then
  insert into public.vb_clients(name,client_type,contact_name,contact_email,portal_enabled)
  values(details->>'name',details->>'client_type',details->>'contact_name',nullif(details->>'contact_email',''),(details->>'portal_enabled')::boolean) returning id into saved;
 else
  update public.vb_clients set name=details->>'name',client_type=details->>'client_type',contact_name=details->>'contact_name',contact_email=nullif(details->>'contact_email',''),portal_enabled=(details->>'portal_enabled')::boolean
  where id=record_id and updated_at=expected_updated_at returning id into saved;
  if saved is null then raise exception 'Record changed or unavailable. Reload and try again.' using errcode='40001'; end if;
 end if;
 insert into public.vb_client_references(client_id,clio_contact_reference,clio_matter_reference,quickbooks_customer_reference)
 values(saved,nullif(details->>'clio_contact_reference',''),nullif(details->>'clio_matter_reference',''),nullif(details->>'quickbooks_customer_reference',''))
 on conflict(client_id) do update set clio_contact_reference=excluded.clio_contact_reference,clio_matter_reference=excluded.clio_matter_reference,quickbooks_customer_reference=excluded.quickbooks_customer_reference;
 return saved;
end;
$$;
revoke all on function public.vb_save_client(uuid,jsonb,timestamptz) from public, anon;
grant execute on function public.vb_save_client(uuid,jsonb,timestamptz) to authenticated;
commit;
