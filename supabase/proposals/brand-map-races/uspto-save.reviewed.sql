create function public.vb_save_uspto_mark(target_client uuid,target_mark uuid,expected_updated_at timestamptz,details jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare saved uuid;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 -- Serialize imports per client and prevent concurrent archive during the save.
 perform 1 from public.vb_clients where id=target_client and archived_at is null for update;
 if not found then raise exception 'Client unavailable' using errcode='42501'; end if;
 if coalesce(details->>'application_number','') !~ '^[0-9]{8}$' or nullif(details->>'source_checked_at','') is null then raise exception 'Invalid USPTO record'; end if;
 if target_mark is null then
  insert into public.vb_marks(client_id,name,mark_type,status,uspto_status_text,application_number,registration_number,record_owner,source,source_checked_at,filing_date,registration_date,uspto_status_date)
  values(target_client,details->>'name',details->>'mark_type',details->>'status',details->>'uspto_status_text',details->>'application_number',details->>'registration_number',details->>'record_owner','uspto',(details->>'source_checked_at')::timestamptz,(details->>'filing_date')::date,(details->>'registration_date')::date,(details->>'uspto_status_date')::date) returning id into saved;
 else
  update public.vb_marks set name=details->>'name',mark_type=details->>'mark_type',status=details->>'status',uspto_status_text=details->>'uspto_status_text',application_number=details->>'application_number',registration_number=details->>'registration_number',record_owner=details->>'record_owner',source='uspto',source_checked_at=(details->>'source_checked_at')::timestamptz,filing_date=(details->>'filing_date')::date,registration_date=(details->>'registration_date')::date,uspto_status_date=(details->>'uspto_status_date')::date
  where id=target_mark and client_id=target_client and archived_at is null and updated_at=expected_updated_at returning id into saved;
  if saved is null then raise exception 'Mark changed or unavailable' using errcode='40001'; end if;
 end if;
 return saved;
end;
$$;
revoke all on function public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb) to authenticated;
