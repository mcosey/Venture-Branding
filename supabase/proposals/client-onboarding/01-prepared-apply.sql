-- Prepared locally only. Client agreements are signed separately, not here.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
-- BEGIN HOSTED IDENTITY GUARD
do $guard$ begin
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216'
 then raise exception 'Expected main Venture Branding'; end if;
 if to_regclass('vb_private.portal_client_onboarding') is not null
 or to_regprocedure('public.vb_onboard_client(jsonb,uuid)') is not null
 or to_regprocedure('public.vb_member_onboarding_complete()') is not null
 then raise exception 'Client onboarding already exists; review before reapplying'; end if;
 if (select md5(prosrc) from pg_proc where oid='public.vb_onboard_test_member(jsonb,text,boolean)'::regprocedure) is distinct from 'eba7597ebb94408d2e38cee1259d1f54' then raise exception 'Reviewed vb_onboard_test_member definition changed'; end if;
 if (select md5(prosrc) from pg_proc where oid='public.vb_accept_test_engagement_invite(uuid,boolean)'::regprocedure) is distinct from 'bc2308c3858db647d9e12c3ea5622065' then raise exception 'Reviewed vb_accept_test_engagement_invite definition changed'; end if;
end $guard$;
-- END HOSTED IDENTITY GUARD

-- Completion of basic profile setup only. This is NOT policy acceptance,
-- an engagement agreement, or a grant of access to any legal-client records.
create table vb_private.portal_client_onboarding (
 user_id uuid primary key references vb_private.portal_accounts(user_id),
 company_id uuid not null unique references public.vb_member_companies(id),
 invitation_id uuid references vb_private.engagement_invitations(id),
 source text not null check(source in ('existing-client','invitation')),
 completed_at timestamptz not null default now(),
 check((source='invitation')=(invitation_id is not null))
);
alter table vb_private.portal_client_onboarding enable row level security;
revoke all on vb_private.portal_client_onboarding from public,anon,authenticated;
create trigger portal_lifecycle_audit after insert or update on vb_private.portal_client_onboarding
 for each row execute function vb_private.audit_portal_lifecycle();

create function public.vb_member_onboarding_complete() returns boolean
language sql stable security definer set search_path='' as $$
 select vb_private.portal_member_active()
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 and exists(select 1 from vb_private.portal_test_onboarding o
 join public.vb_member_companies c on c.id=o.company_id and c.owner_id=o.user_id
 where o.user_id=auth.uid());
$$;

create function public.vb_onboard_client(profile jsonb,invitation_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); company uuid; full_name_value text; name_value text; industry_value text;
 i vb_private.engagement_invitations; cid uuid;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 or exists(select 1 from vb_private.staff_members where user_id=uid)
 or exists(select 1 from vb_private.portal_accounts where user_id=uid and status<>'active')
 then raise exception 'Verified account required' using errcode='42501'; end if;
 if exists(select 1 from auth.mfa_factors where user_id=uid and status='verified')
 and coalesce(auth.jwt()->>'aal','')<>'aal2'
 then raise exception 'MFA required' using errcode='42501'; end if;
 if jsonb_typeof(profile) is distinct from 'object' or profile - array['full_name','name','industry','launch_date'] <> '{}'::jsonb
 then raise exception 'Invalid profile' using errcode='22023'; end if;
 full_name_value:=btrim(profile->>'full_name'); name_value:=btrim(profile->>'name'); industry_value:=coalesce(btrim(profile->>'industry'),'');
 if coalesce(length(full_name_value),0) not between 1 and 120 or coalesce(length(name_value),0) not between 1 and 120
 or length(industry_value)>100 or nullif(profile->>'launch_date','') is not null
 then raise exception 'Invalid profile' using errcode='22023'; end if;
 if invitation_id is not null then
  -- Same client -> draft -> invitation order as invitation acceptance/revocation.
  select client_id into cid from vb_private.engagement_invitations where id=invitation_id;
  perform 1 from public.vb_clients where id=cid for update;
  perform 1 from vb_private.portal_engagement_drafts where id=(select draft_id from vb_private.engagement_invitations where id=invitation_id) for update;
  select * into i from vb_private.engagement_invitations where id=invitation_id for update;
  if not coalesce(vb_private.test_invite_recipient(i),false)
  then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 elsif public.vb_account_access()<>'client' then
  raise exception 'Client access or matching invitation required' using errcode='42501';
 end if;
 perform 1 from auth.users where id=uid for share;
 perform 1 from vb_private.portal_accounts where user_id=uid for share;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 -- Recheck suspension after waiting for other setup attempts.
 if exists(select 1 from vb_private.portal_accounts where user_id=uid and status<>'active')
 then raise exception 'Account unavailable' using errcode='42501'; end if;
 select c.id into company from vb_private.portal_client_onboarding o
 join public.vb_member_companies c on c.id=o.company_id and c.owner_id=uid where o.user_id=uid;
 if company is not null then return company; end if;
 if exists(select 1 from vb_private.portal_client_onboarding where user_id=uid)
 then raise exception 'Profile ownership mismatch' using errcode='42501'; end if;
 insert into vb_private.portal_accounts(user_id) values(uid) on conflict(user_id) do nothing;
 insert into public.vb_member_profiles(user_id,full_name) values(uid,full_name_value) on conflict(user_id) do nothing;
 select id into company from public.vb_member_companies where owner_id=uid order by id limit 1;
 if company is null then
  insert into public.vb_member_companies(owner_id,name,industry) values(uid,name_value,industry_value) returning id into company;
 end if;
 insert into vb_private.portal_client_onboarding(user_id,company_id,invitation_id,source)
 values(uid,company,invitation_id,case when invitation_id is null then 'existing-client' else 'invitation' end);
 return company;
end $$;

revoke all on function public.vb_onboard_client(jsonb,uuid),public.vb_member_onboarding_complete() from public,anon,authenticated;
grant execute on function public.vb_onboard_client(jsonb,uuid),public.vb_member_onboarding_complete() to authenticated;

create or replace function public.vb_onboard_test_member(profile jsonb,notice text,confirmed boolean) returns uuid
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
 select id into company from public.vb_member_companies where owner_id=uid order by id limit 1;
 if company is null then
 insert into public.vb_member_companies(owner_id,name,industry,launch_date) values(uid,company_name,v_industry,launch) returning id into company;
 end if;
 insert into vb_private.portal_test_onboarding(user_id,company_id,notice_version) values(uid,company,notice);
 return company;
end $$;

create or replace function public.vb_accept_test_engagement_invite(invitation_id uuid,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare i vb_private.engagement_invitations;cid uuid;eid uuid;mid uuid;
begin
 if confirmed is distinct from true then raise exception 'Explicit acceptance required' using errcode='22023';end if;
 select client_id into cid from vb_private.engagement_invitations where id=invitation_id;
 perform 1 from public.vb_clients where id=cid for update;
 -- Match the same client -> draft -> invitation ordering used by send/revoke.
 perform 1 from vb_private.portal_engagement_drafts where id=(select draft_id from vb_private.engagement_invitations where id=invitation_id) for update;
 select * into i from vb_private.engagement_invitations where id=invitation_id for update;
 perform 1 from auth.users where id=auth.uid() for share;
 perform 1 from vb_private.portal_accounts where user_id=auth.uid() for share;
 if not coalesce(vb_private.test_invite_recipient(i),false) or not vb_private.portal_member_active()
 or (not exists(select 1 from vb_private.portal_test_onboarding where user_id=auth.uid()) and not exists(select 1 from vb_private.engagement_grants where user_id=auth.uid() and accepted_at is not null)
 and not exists(select 1 from vb_private.portal_client_onboarding o join public.vb_member_companies c on c.id=o.company_id and c.owner_id=o.user_id where o.user_id=auth.uid())) then raise exception 'Invitation unavailable or account setup required' using errcode='42501';end if;
 insert into public.vb_engagements(client_id,title,status,activated_at) values(cid,i.engagement_title,'active',now()) returning id into eid;
 insert into public.vb_matters(engagement_id,title) values(eid,i.matter_title) returning id into mid;
 insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values(eid,auth.uid(),'active',now());
 -- New client relationship: bind future records to the first engagement. Do not
 -- remap retained records or service configuration belonging to an earlier one.
 if not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) then
  if exists(select 1 from public.vb_marks where client_id=cid) or exists(select 1 from vb_private.client_memberships where client_id=cid) then raise exception 'Existing records require scope review' using errcode='42501';end if;
  insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled) values(cid,eid,mid,'Reviewed existing portal relationship',true);
  insert into vb_private.portal_service_bindings(client_id,service,engagement_id,matter_id) select cid,service,eid,mid from vb_private.engagement_services where engagement_id=eid;
 end if;
 update public.vb_clients set portal_enabled=true where id=cid and not portal_enabled;
 update vb_private.engagement_invitations set state='accepted',accepted_by=auth.uid(),accepted_at=now(),engagement_id=eid,matter_id=mid where id=i.id;
 return eid;
end $$;
notify pgrst,'reload schema';
commit;
