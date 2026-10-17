-- Test only. Preserve the same owner-only scope; require checked revisions for writes.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
create function public.vb_save_member_progress(company uuid,milestone text,details jsonb,expected_updated_at timestamptz default null) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare current_row public.vb_member_progress%rowtype; clean jsonb; saved_at timestamptz;
begin
 if not vb_private.owns_member_company(company) then raise exception 'Company unavailable' using errcode='42501'; end if;
 if milestone not in ('entity','founders','governance','equity','consents') or milestone is null then raise exception 'Unknown milestone' using errcode='22023'; end if;
 if jsonb_typeof(details) is distinct from 'object' or details->'version' is distinct from '1'::jsonb
  or jsonb_typeof(details->'tasks') is distinct from 'array' or jsonb_typeof(details->'notes') is distinct from 'string' then raise exception 'Invalid progress' using errcode='22023'; end if;
 if jsonb_array_length(details->'tasks')>100 or length(details->>'notes')>3000
  or exists(select 1 from jsonb_array_elements(details->'tasks') x where jsonb_typeof(x)<>'boolean') then raise exception 'Invalid progress' using errcode='22023'; end if;
 clean:=jsonb_build_object('version',1,'tasks',details->'tasks','notes',details->>'notes');
 perform pg_advisory_xact_lock(hashtextextended(company::text||':'||milestone,0));
 select * into current_row from public.vb_member_progress p where p.company_id=company and p.milestone_id=milestone for update;
 if found then
  -- A retry after a lost response is safe if the intended value is already saved.
  if current_row.progress=clean then return current_row.updated_at; end if;
  if expected_updated_at is distinct from current_row.updated_at then raise exception 'Progress changed elsewhere; reload before saving' using errcode='40001'; end if;
  update public.vb_member_progress p set progress=clean,updated_at=greatest(clock_timestamp(),current_row.updated_at+interval '1 microsecond')
  where p.company_id=company and p.milestone_id=milestone returning p.updated_at into saved_at;
 else
  if expected_updated_at is not null then raise exception 'Progress changed elsewhere; reload before saving' using errcode='40001'; end if;
  insert into public.vb_member_progress(company_id,milestone_id,progress,updated_at) values(company,milestone,clean,clock_timestamp()) returning updated_at into saved_at;
 end if;
 return saved_at;
end $$;
revoke all on function public.vb_save_member_progress(uuid,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.vb_save_member_progress(uuid,text,jsonb,timestamptz) to authenticated;
-- Replace direct writes with the same owner's checked-write operation, not broader access.
revoke insert,update on public.vb_member_progress from authenticated;
revoke update(progress,updated_at) on public.vb_member_progress from authenticated;
commit;
