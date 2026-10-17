-- Test-only Member onboarding, no final policy acceptance, no legacy client grants.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
end $$;
create table vb_private.portal_test_onboarding (
 user_id uuid primary key references vb_private.portal_accounts(user_id),
 company_id uuid not null unique references public.vb_member_companies(id),
 notice_version text not null check(notice_version='member-signup-test-2026-10-16'),
 record_type text not null default 'test-only' check(record_type='test-only'),
 terms_version text check(terms_version is null),
 privacy_version text check(privacy_version is null),
 recorded_at timestamptz not null default now()
);
alter table vb_private.portal_test_onboarding enable row level security;
revoke all on vb_private.portal_test_onboarding from public,anon,authenticated;
create trigger portal_lifecycle_audit after insert or update on vb_private.portal_test_onboarding for each row execute function vb_private.audit_portal_lifecycle();
create function public.vb_onboard_test_member(profile jsonb,notice text,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); company uuid; v_full_name text; company_name text; v_industry text; launch date;
begin
 if uid is null or not exists(select 1 from auth.users u where u.id=uid and u.email_confirmed_at is not null) then raise exception 'Verified email required' using errcode='42501'; end if;
 if exists(select 1 from vb_private.staff_members s where s.user_id=uid) then raise exception 'Use the staff entrance' using errcode='42501'; end if;
 if notice is distinct from 'member-signup-test-2026-10-16' or confirmed is distinct from true then raise exception 'Current acknowledgment required' using errcode='22023'; end if;
 if jsonb_typeof(profile) is distinct from 'object' then raise exception 'Invalid profile' using errcode='22023'; end if;
 v_full_name:=btrim(profile->>'full_name'); company_name:=btrim(profile->>'name'); v_industry:=coalesce(btrim(profile->>'industry'),'');
 if coalesce(length(v_full_name),0) not between 1 and 120 or coalesce(length(company_name),0) not between 1 and 120 or length(v_industry)>100 then raise exception 'Invalid profile' using errcode='22023'; end if;
 if nullif(profile->>'launch_date','') is not null then
  if (profile->>'launch_date') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid launch date' using errcode='22023'; end if;
  launch:=(profile->>'launch_date')::date;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from vb_private.portal_accounts a where a.user_id=uid and a.status<>'active') then raise exception 'Account unavailable' using errcode='42501'; end if;
 select company_id into company from vb_private.portal_test_onboarding where user_id=uid;
 if company is not null then return company; end if;
 insert into vb_private.portal_accounts(user_id) values(uid) on conflict(user_id) do nothing;
 insert into public.vb_member_profiles(user_id,full_name) values(uid,v_full_name) on conflict(user_id) do nothing;
 insert into public.vb_member_companies(owner_id,name,industry,launch_date) values(uid,company_name,v_industry,launch) returning id into company;
 insert into vb_private.portal_test_onboarding(user_id,company_id,notice_version) values(uid,company,notice);
 return company;
end $$;
create function public.vb_portal_entry() returns text
language sql stable security definer set search_path='' as $$
 select case
 when auth.uid() is null then 'denied'
 when exists(select 1 from vb_private.staff_members s where s.user_id=auth.uid()) then case when vb_private.is_staff() then 'staff' else 'denied' end
 when exists(select 1 from vb_private.portal_accounts a where a.user_id=auth.uid() and a.status<>'active') then 'denied'
 when public.vb_session_role()='client' then 'client'
 when not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) then 'denied'
 when not exists(select 1 from vb_private.portal_accounts a where a.user_id=auth.uid()) then 'onboarding'
 when vb_private.portal_member_active() then 'member'
 else 'denied' end;
$$;
revoke all on function public.vb_onboard_test_member(jsonb,text,boolean),public.vb_portal_entry() from public,anon,authenticated;
grant execute on function public.vb_onboard_test_member(jsonb,text,boolean),public.vb_portal_entry() to authenticated;
commit;
