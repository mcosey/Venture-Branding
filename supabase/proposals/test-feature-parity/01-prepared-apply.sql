-- PREPARED ONLY. No hosted application approved. Run the whole transaction.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
-- BEGIN HOSTED IDENTITY GUARD (omitted only by the isolated local harness)
do $$ begin
 if current_database()<>'postgres' or current_user<>'postgres' or (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Expected reviewed BCM Test database and executor'; end if;
end $$;
-- END HOSTED IDENTITY GUARD
-- Stop on existing functions or changed access logic; never overwrite newer work.
do $guard$ declare signature text; expected text; actual text; col text; begin
 if to_regprocedure('public.vb_update_my_contact(uuid,timestamp with time zone,text,text)') is not null or to_regprocedure('public.vb_save_uspto_mark(uuid,uuid,timestamp with time zone,jsonb)') is not null then raise exception 'Parity functions already exist; review instead of replacing'; end if;
 for signature,expected in select * from jsonb_each_text('{"vb_private.is_client_member(uuid)":"7e1c49dee63d24377d6786686ba04265","vb_private.is_staff()":"1915518237df2b15289d6faf69174e5a","vb_private.portal_actor_scope(uuid,uuid,text)":"978d63fa47d9e0edf516146188a6f6a8","vb_private.portal_row_read(uuid,text,jsonb,text)":"9a15f15931b35c3d0efe4c3a603f75c6","vb_private.portal_scope_new_record()":"9b7606f3c21fe22844131475330fa15b"}'::jsonb) loop
  select md5(prosrc) into actual from pg_proc where oid=to_regprocedure(signature);
  if actual is distinct from expected then raise exception 'Changed or missing access prerequisite: %',signature; end if;
 end loop;
 foreach col in array array['filing_date','registration_date','uspto_status_date'] loop
  if not exists(select 1 from pg_attribute where attrelid='public.vb_marks'::regclass and attname=col and atttypid='date'::regtype and not attisdropped) then raise exception 'Missing date prerequisite; prepare a separate reviewed change: %',col; end if;
 end loop;
 if not exists(select 1 from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.vb_marks'::regclass and c.relname='vb_marks_client_application_unique' and i.indisvalid and i.indisunique and pg_get_indexdef(i.indexrelid) = 'CREATE UNIQUE INDEX vb_marks_client_application_unique ON public.vb_marks USING btree (client_id, application_number) WHERE ((archived_at IS NULL) AND (application_number IS NOT NULL) AND (application_number <> '||quote_literal('')||'::text))') then raise exception 'Missing or changed application-number uniqueness prerequisite; review first'; end if;
 if not exists(select 1 from pg_trigger t where t.tgrelid='public.vb_marks'::regclass and t.tgfoid='vb_private.portal_scope_new_record()'::regprocedure and t.tgenabled='O' and not t.tgisinternal) then raise exception 'Expected enabled record-scope trigger'; end if;
 if not (select relrowsecurity from pg_class where oid='public.vb_marks'::regclass) or not (select relrowsecurity from pg_class where oid='public.vb_clients'::regclass) then raise exception 'Expected RLS'; end if;
end $guard$;
create function public.vb_update_my_contact(target_client uuid, expected_updated_at timestamptz, contact_name text, contact_email text)
returns public.vb_clients language plpgsql security definer set search_path='' as $$
declare saved public.vb_clients; clean_name text:=btrim(contact_name); clean_email text:=nullif(btrim(contact_email),'');
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 if clean_name is null or length(clean_name) not between 1 and 200 or (clean_email is not null and (length(clean_email)>254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then
 raise exception 'Invalid contact details' using errcode='22023'; end if;
 -- Lock before rechecking access so concurrent archive/disable cannot race a save.
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 update public.vb_clients c set contact_name=clean_name,contact_email=clean_email
 where c.id=target_client and c.updated_at=expected_updated_at returning c.* into saved;
 if not found then raise exception 'Client record changed; reload first' using errcode='40001'; end if;
 return saved;
end; $$;
revoke all on function public.vb_update_my_contact(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.vb_update_my_contact(uuid,timestamptz,text,text) to authenticated;

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

commit;
