-- TEST ONLY: additive foundation. Does NOT replace legacy portal authorization.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then
  raise exception 'Wrong database: this package is restricted to Venture Branding BCM Test';
 end if;
end $$;

create table vb_private.portal_accounts (
 user_id uuid primary key references auth.users(id),
 status text not null default 'active' check(status in ('active','suspended','archived')),
 created_at timestamptz not null default now()
);
create table public.vb_member_profiles (
 user_id uuid primary key references vb_private.portal_accounts(user_id),
 full_name text not null check(length(btrim(full_name)) between 1 and 120),
 updated_at timestamptz not null default now()
);
create table public.vb_member_companies (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references vb_private.portal_accounts(user_id),
 name text not null check(length(btrim(name)) between 1 and 120),
 launch_date date,
 industry text not null default '' check(length(industry)<=100),
 stage text not null default '' check(length(stage)<=40),
 entity_type text not null default '' check(length(entity_type)<=80),
 country text not null default '' check(length(country)<=80),
 region text not null default '' check(length(region)<=80),
 updated_at timestamptz not null default now()
);
-- No automatic link from a Member company name/email to a legal client.
create table public.vb_member_progress (
 company_id uuid not null references public.vb_member_companies(id),
 milestone_id text not null check(milestone_id ~ '^[a-z0-9-]{1,80}$'),
 progress jsonb not null default '{}' check(jsonb_typeof(progress)='object' and octet_length(progress::text)<=65536),
 updated_at timestamptz not null default now(),
 primary key(company_id,milestone_id)
);
create table vb_private.portal_policy_versions (
 notice_version text primary key,
 terms_version text not null,
 privacy_version text not null,
 published_at timestamptz not null,
 retired_at timestamptz,
 check(retired_at is null or retired_at>=published_at)
);
-- No policy versions or acceptance records are invented by this migration.
create table vb_private.portal_acceptances (
 user_id uuid not null references vb_private.portal_accounts(user_id),
 notice_version text not null references vb_private.portal_policy_versions(notice_version),
 accepted_at timestamptz not null default now(),
 primary key(user_id,notice_version)
);
create table public.vb_engagements (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.vb_clients(id),
 title text not null check(length(btrim(title)) between 1 and 200),
 status text not null default 'draft' check(status in ('draft','active','closed')),
 activated_at timestamptz,
 closed_at timestamptz,
 created_at timestamptz not null default now(),
 check((status='draft' and activated_at is null and closed_at is null) or
       (status='active' and activated_at is not null and closed_at is null) or
       (status='closed' and activated_at is not null and closed_at is not null and closed_at>=activated_at))
);
create table public.vb_matters (
 id uuid primary key default gen_random_uuid(),
 engagement_id uuid not null references public.vb_engagements(id),
 title text not null check(length(btrim(title)) between 1 and 200),
 created_at timestamptz not null default now()
);
create table vb_private.engagement_grants (
 engagement_id uuid not null references public.vb_engagements(id),
 user_id uuid not null references vb_private.portal_accounts(user_id),
 status text not null default 'invited' check(status in ('invited','active','revoked')),
 accepted_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(engagement_id,user_id),
 check(status<>'active' or accepted_at is not null)
);
create index vb_engagement_grants_user on vb_private.engagement_grants(user_id,engagement_id);
create table vb_private.engagement_services (
 engagement_id uuid not null references public.vb_engagements(id),
 service text not null check(service in ('brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest')),
 enabled boolean not null default false,
 primary key(engagement_id,service)
);
create table vb_private.portal_lifecycle_events (
 id bigint generated always as identity primary key,
 table_name text not null,
 actor_id uuid,
 occurred_at timestamptz not null default now(),
 operation text not null,
 previous_data jsonb,
 current_data jsonb
);

create function vb_private.portal_member_active() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from vb_private.portal_accounts a where a.user_id=auth.uid() and a.status='active')
 and not exists(select 1 from vb_private.staff_members s where s.user_id=auth.uid());
$$;
create function vb_private.owns_member_company(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select vb_private.portal_member_active() and exists(select 1 from public.vb_member_companies c where c.id=target and c.owner_id=auth.uid());
$$;
create function vb_private.can_access_engagement(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select vb_private.portal_member_active() and exists(
  select 1 from vb_private.engagement_grants g join public.vb_engagements e on e.id=g.engagement_id
  join public.vb_clients c on c.id=e.client_id
  where e.id=target and e.status='active' and g.user_id=auth.uid() and g.status='active' and g.accepted_at is not null
  and c.portal_enabled and c.archived_at is null);
$$;
create function vb_private.can_use_engagement_service(target uuid,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select vb_private.can_access_engagement(target) and exists(select 1 from vb_private.engagement_services s where s.engagement_id=target and s.service=feature and s.enabled);
$$;
create function public.vb_account_access() returns text
language sql stable security definer set search_path='' as $$
 select case
 when exists(select 1 from vb_private.staff_members s where s.user_id=auth.uid()) then case when vb_private.is_staff() then 'staff' else 'denied' end
 when not vb_private.portal_member_active() then 'denied'
 when exists(select 1 from vb_private.engagement_grants g where g.user_id=auth.uid() and vb_private.can_access_engagement(g.engagement_id)) then 'client'
 when exists(select 1 from vb_private.engagement_grants g join public.vb_engagements e on e.id=g.engagement_id where g.user_id=auth.uid() and g.accepted_at is not null and e.activated_at is not null) then 'alumni'
 else 'member' end;
$$;
create function vb_private.audit_portal_lifecycle() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into vb_private.portal_lifecycle_events(table_name,actor_id,operation,previous_data,current_data)
 values(tg_table_name,auth.uid(),tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;

-- Deny by default on every new table, including private administrative records.
do $$ declare t text; begin
 foreach t in array array['portal_accounts','portal_policy_versions','portal_acceptances','engagement_grants','engagement_services','portal_lifecycle_events'] loop
  execute format('alter table vb_private.%I enable row level security',t);
  execute format('revoke all on vb_private.%I from public,anon,authenticated',t);
 end loop;
 foreach t in array array['vb_member_profiles','vb_member_companies','vb_member_progress','vb_engagements','vb_matters'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 foreach t in array array['portal_accounts','engagement_grants','engagement_services','portal_policy_versions','portal_acceptances'] loop
  execute format('create trigger portal_lifecycle_audit after insert or update on vb_private.%I for each row execute function vb_private.audit_portal_lifecycle()',t);
 end loop;
 foreach t in array array['vb_engagements','vb_matters'] loop
  execute format('create trigger portal_lifecycle_audit after insert or update on public.%I for each row execute function vb_private.audit_portal_lifecycle()',t);
 end loop;
end $$;
revoke all on sequence vb_private.portal_lifecycle_events_id_seq from public,anon,authenticated;
revoke all on function vb_private.portal_member_active(),vb_private.owns_member_company(uuid),vb_private.can_access_engagement(uuid),vb_private.can_use_engagement_service(uuid,text),public.vb_account_access(),vb_private.audit_portal_lifecycle() from public,anon,authenticated;
grant execute on function vb_private.portal_member_active(),vb_private.owns_member_company(uuid),vb_private.can_access_engagement(uuid),vb_private.can_use_engagement_service(uuid,text),public.vb_account_access() to authenticated;
-- Only owners access private Member planning data; staff do not inherit access.
create policy member_profile_read on public.vb_member_profiles for select to authenticated using(user_id=auth.uid() and vb_private.portal_member_active());
create policy member_profile_update on public.vb_member_profiles for update to authenticated using(user_id=auth.uid() and vb_private.portal_member_active()) with check(user_id=auth.uid() and vb_private.portal_member_active());
create policy member_company_read on public.vb_member_companies for select to authenticated using(owner_id=auth.uid() and vb_private.portal_member_active());
create policy member_company_create on public.vb_member_companies for insert to authenticated with check(owner_id=auth.uid() and vb_private.portal_member_active());
create policy member_company_update on public.vb_member_companies for update to authenticated using(owner_id=auth.uid() and vb_private.portal_member_active()) with check(owner_id=auth.uid() and vb_private.portal_member_active());
create policy member_progress_read on public.vb_member_progress for select to authenticated using(vb_private.owns_member_company(company_id));
create policy member_progress_create on public.vb_member_progress for insert to authenticated with check(vb_private.owns_member_company(company_id));
create policy member_progress_update on public.vb_member_progress for update to authenticated using(vb_private.owns_member_company(company_id)) with check(vb_private.owns_member_company(company_id));
create policy engagement_read on public.vb_engagements for select to authenticated using(vb_private.is_staff() or vb_private.can_access_engagement(id));
create policy matter_read on public.vb_matters for select to authenticated using(vb_private.is_staff() or vb_private.can_access_engagement(engagement_id));
grant select on public.vb_member_profiles,public.vb_member_companies,public.vb_member_progress,public.vb_engagements,public.vb_matters to authenticated;
grant update(full_name,updated_at) on public.vb_member_profiles to authenticated;
grant insert on public.vb_member_companies,public.vb_member_progress to authenticated;
grant update(name,launch_date,industry,stage,entity_type,country,region,updated_at) on public.vb_member_companies to authenticated;
grant update(progress,updated_at) on public.vb_member_progress to authenticated;
commit;
