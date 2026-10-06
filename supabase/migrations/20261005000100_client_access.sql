-- Invitation/access administration. No invitations sent or existing access changed.
begin;
create table vb_private.portal_invitations (
 client_id uuid primary key references public.vb_clients(id),
 email text not null unique,
 request_id uuid not null,
 requested_by uuid not null references auth.users(id),
 requested_at timestamptz not null default now(),
 state text not null check(state in ('sending','sent','failed')),
 user_id uuid references auth.users(id),
 sent_at timestamptz
);
alter table vb_private.portal_invitations enable row level security;
revoke all on vb_private.portal_invitations from public,anon,authenticated;
grant all on vb_private.portal_invitations to service_role;

create function public.vb_portal_access_status() returns table(client_id uuid, access_status text, login_email text, last_invited_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 return query select c.id,
 case when c.archived_at is not null then 'archived'
 when not c.portal_enabled then 'disabled'
 when exists(select 1 from vb_private.client_memberships m join auth.users u on u.id=m.user_id where m.client_id=c.id and m.active and u.email_confirmed_at is not null) then 'active'
 when i.state='sending' then 'sending'
 when i.state='failed' then 'failed'
 when i.state='sent' or exists(select 1 from vb_private.client_memberships m where m.client_id=c.id and m.active) then 'pending'
 else 'not_invited' end,
 coalesce((select u.email::text from vb_private.client_memberships m join auth.users u on u.id=m.user_id where m.client_id=c.id and m.active order by m.created_at limit 1),i.email),i.sent_at
 from public.vb_clients c left join vb_private.portal_invitations i on i.client_id=c.id;
end;
$$;

-- Reserve a single destination before sending. Browser cannot attach arbitrary existing users.
create function public.vb_prepare_client_invite(target_client uuid, recipient text, expected_updated_at timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.vb_clients; i vb_private.portal_invitations; u auth.users; email_value text:=lower(btrim(recipient)); ticket uuid:=gen_random_uuid();
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 if email_value is null or length(email_value)>254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid invitation email'; end if;
 select * into c from public.vb_clients where id=target_client for update;
 if c.id is null or c.archived_at is not null or not c.portal_enabled then raise exception 'Enable access for an active client first' using errcode='42501'; end if;
 if c.updated_at is distinct from expected_updated_at then raise exception 'Client changed. Reload and try again.' using errcode='40001'; end if;
 perform pg_advisory_xact_lock(hashtextextended(email_value,0));
 select * into i from vb_private.portal_invitations where client_id=target_client;
 if i.requested_at>now()-interval '60 seconds' then raise exception 'Wait one minute before retrying'; end if;
 if i.email is not null and i.email<>email_value then raise exception 'Existing invitation uses a different email. Review access before changing recipients.'; end if;
 if exists(select 1 from vb_private.portal_invitations where email=email_value and client_id<>target_client) then raise exception 'Email belongs to another client invitation'; end if;
 select * into u from auth.users where lower(email)=email_value;
 if u.id is not null then
  if exists(select 1 from vb_private.staff_members where user_id=u.id) or exists(select 1 from vb_private.client_memberships where user_id=u.id and (client_id<>target_client or not active)) then raise exception 'Email cannot be used for this invitation'; end if;
  if u.email_confirmed_at is not null then raise exception 'This account already exists. No invitation sent.'; end if;
  if not exists(select 1 from vb_private.client_memberships where user_id=u.id and client_id=target_client and active) and (i.email is null or u.invited_at is null) then raise exception 'Existing account requires administrator review'; end if;
 end if;
 if exists(select 1 from vb_private.client_memberships m join auth.users a on a.id=m.user_id where m.client_id=target_client and lower(a.email)<>email_value) then raise exception 'This client already has a different sign-in account'; end if;
 insert into vb_private.portal_invitations(client_id,email,request_id,requested_by,state)
 values(target_client,email_value,ticket,auth.uid(),'sending')
 on conflict(client_id) do update set request_id=ticket,requested_by=auth.uid(),requested_at=now(),state='sending';
 return ticket;
end;
$$;

-- Service-only completion: ticket came from an MFA-checked caller; revalidate identity,
-- client and membership after email delivery. An email alone never grants data access.
create function public.vb_complete_client_invite(ticket uuid, invited_user uuid, succeeded boolean) returns void
language plpgsql security definer set search_path='' as $$
declare i vb_private.portal_invitations; c public.vb_clients; u auth.users;
begin
 select * into i from vb_private.portal_invitations where request_id=ticket;
 if i.client_id is null then raise exception 'Invitation unavailable'; end if;
 select * into c from public.vb_clients where id=i.client_id for update;
 select * into i from vb_private.portal_invitations where request_id=ticket for update;
 if i.client_id is null or i.state<>'sending' or i.requested_at<now()-interval '5 minutes' then raise exception 'Invitation expired or changed'; end if;
 if not succeeded then update vb_private.portal_invitations set state='failed' where request_id=ticket; return; end if;
 if c.archived_at is not null or not c.portal_enabled or not exists(select 1 from vb_private.staff_members where user_id=i.requested_by and active) then raise exception 'Access changed. Invitation cannot be completed'; end if;
 select * into u from auth.users where id=invited_user for update;
 if u.id is null or lower(u.email)<>i.email or u.invited_at is null then raise exception 'Invited identity mismatch'; end if;
 if exists(select 1 from vb_private.staff_members where user_id=u.id) or exists(select 1 from vb_private.client_memberships where user_id=u.id and (client_id<>c.id or not active)) or exists(select 1 from vb_private.client_memberships where client_id=c.id and user_id<>u.id) then raise exception 'Membership conflict'; end if;
 insert into vb_private.client_memberships(client_id,user_id) values(c.id,u.id) on conflict(client_id,user_id) do nothing;
 update vb_private.portal_invitations set state='sent',user_id=u.id,sent_at=now() where request_id=ticket;
 insert into vb_private.audit_events(client_id,record_id,table_name,operation,actor_id,current_data) values(c.id,c.id,'portal_invitations','INSERT',i.requested_by,jsonb_build_object('user_id',u.id,'email',i.email,'request_id',ticket));
end;
$$;

create function public.vb_set_portal_access(target_client uuid, enabled boolean, expected_updated_at timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 if enabled is null then raise exception 'Access choice required'; end if;
 update public.vb_clients set portal_enabled=enabled where id=target_client and archived_at is null and updated_at=expected_updated_at;
 if not found then raise exception 'Client changed or archived. Reload and try again.' using errcode='40001'; end if;
end;
$$;
-- Restore never silently restores portal access, including older archived clients.
create function vb_private.archive_disables_portal() returns trigger language plpgsql set search_path='' as $$
begin
 if new.archived_at is not null or (old.archived_at is not null and new.archived_at is null) then new.portal_enabled:=false; end if;
 return new;
end;
$$;
create trigger archive_disables_portal before update on public.vb_clients for each row execute function vb_private.archive_disables_portal();
revoke all on function vb_private.archive_disables_portal() from public,anon,authenticated;
revoke all on function public.vb_portal_access_status(),public.vb_prepare_client_invite(uuid,text,timestamptz),public.vb_set_portal_access(uuid,boolean,timestamptz) from public,anon;
grant execute on function public.vb_portal_access_status(),public.vb_prepare_client_invite(uuid,text,timestamptz),public.vb_set_portal_access(uuid,boolean,timestamptz) to authenticated;
revoke all on function public.vb_complete_client_invite(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.vb_complete_client_invite(uuid,uuid,boolean) to service_role;
commit;
