-- Saved configuration only. This migration creates no scanner, job, or credential store.
begin;
create table public.vb_bcm_settings (
 client_id uuid primary key references public.vb_clients(id) on delete cascade,
 urls text[] not null,
 exclusions text[] not null default '{}',
 access_mode text not null check(access_mode in ('public','account')),
 frequency text not null check(frequency in ('weekly','monthly')),
 categories text[] not null,
 version integer not null default 1 check(version>0),
 authorized_by uuid not null references auth.users(id),
 authorized_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.vb_bcm_settings enable row level security;
revoke all on public.vb_bcm_settings from public,anon,authenticated;
grant select on public.vb_bcm_settings to authenticated;
grant all on public.vb_bcm_settings to service_role;
create policy bcm_read on public.vb_bcm_settings for select to authenticated
 using(vb_private.is_client_member(client_id) or (select vb_private.is_staff()));
create trigger vb_bcm_touch before update on public.vb_bcm_settings
 for each row execute function vb_private.touch_record();
create trigger vb_bcm_audit after insert or update on public.vb_bcm_settings
 for each row execute function vb_private.audit_record();

create function public.vb_save_bcm_settings(target_client uuid, expected_version integer, details jsonb, authorized boolean)
returns public.vb_bcm_settings language plpgsql security definer set search_path='' as $$
declare
 saved public.vb_bcm_settings;
 sources text[]; exclusion_paths text[]; kinds text[]; item text;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 if authorized is distinct from true or expected_version is null or expected_version<0
 or details is null or jsonb_typeof(details)<>'object' then raise exception 'Invalid settings' using errcode='22023'; end if;
 if details - array['urls','exclusions','access_mode','frequency','categories'] <> '{}'::jsonb
 or not(details ?& array['urls','exclusions','access_mode','frequency','categories'])
 or jsonb_typeof(details->'urls') is distinct from 'array'
 or jsonb_typeof(details->'exclusions') is distinct from 'array'
 or jsonb_typeof(details->'categories') is distinct from 'array'
 or coalesce(details->>'access_mode','') not in ('public','account')
 or coalesce(details->>'frequency','') not in ('weekly','monthly') then raise exception 'Invalid settings' using errcode='22023'; end if;
 if jsonb_array_length(details->'urls') not between 1 and 20
 or jsonb_array_length(details->'exclusions')>50
 or jsonb_array_length(details->'categories') not between 1 and 7 then raise exception 'Invalid settings' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements((details->'urls')||(details->'exclusions')||(details->'categories')) as elems(value) where jsonb_typeof(value)<>'string') then raise exception 'Invalid settings' using errcode='22023'; end if;
 select array_agg(btrim(value)) into sources from jsonb_array_elements_text(details->'urls');
 select coalesce(array_agg(btrim(value)),'{}'::text[]) into exclusion_paths from jsonb_array_elements_text(details->'exclusions');
 select array_agg(value) into kinds from jsonb_array_elements_text(details->'categories');
 foreach item in array sources loop
  -- Configuration syntax only: future fetcher MUST enforce network/redirect/DNS restrictions.
  if length(item)>2048 or item !~ '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]?#@]*)?$'
  then raise exception 'Invalid URL; omit credentials, query strings and fragments' using errcode='22023'; end if;
 end loop;
 foreach item in array exclusion_paths loop
  if length(item) not between 1 and 512 or item !~ '^/[^[:space:]?#]*$' then raise exception 'Invalid excluded path' using errcode='22023'; end if;
 end loop;
 if not(kinds <@ array['product_names','feature_names','slogans','logos','sub_brands','renames','presentation']::text[])
 or cardinality(kinds)<>(select count(distinct x) from unnest(kinds) x)
 or cardinality(sources)<>(select count(distinct x) from unnest(sources) x)
 then raise exception 'Invalid or duplicate settings' using errcode='22023'; end if;
 -- Serialize creates and updates for this client, also against portal disable/archive.
 perform 1 from public.vb_clients where id=target_client for update;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 select * into saved from public.vb_bcm_settings where client_id=target_client;
 if (found and saved.version<>expected_version) or (not found and expected_version<>0)
 then raise exception 'Settings changed; reload first' using errcode='40001'; end if;
 insert into public.vb_bcm_settings as existing(client_id,urls,exclusions,access_mode,frequency,categories,authorized_by)
 values(target_client,sources,exclusion_paths,details->>'access_mode',details->>'frequency',kinds,auth.uid())
 on conflict(client_id) do update set urls=excluded.urls,exclusions=excluded.exclusions,
 access_mode=excluded.access_mode,frequency=excluded.frequency,categories=excluded.categories,
 version=existing.version+1,authorized_by=auth.uid(),authorized_at=now()
 returning * into saved;
 return saved;
end; $$;
revoke all on function public.vb_save_bcm_settings(uuid,integer,jsonb,boolean) from public,anon;
grant execute on function public.vb_save_bcm_settings(uuid,integer,jsonb,boolean) to authenticated;
commit;
