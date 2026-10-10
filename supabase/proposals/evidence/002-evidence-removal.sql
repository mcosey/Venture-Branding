-- Recoverable removal only. Does not delete database rows or storage objects.
begin;
alter table public.vb_evidence add column removed_at timestamptz,add column removed_by uuid references auth.users(id);
alter table public.vb_evidence add constraint evidence_removal_actor check((removed_at is null)=(removed_by is null));
drop policy evidence_read on public.vb_evidence;
create policy evidence_read on public.vb_evidence for select to authenticated using (
 removed_at is null and uploaded_at is not null and ((select vb_private.is_staff()) or (
 vb_private.is_client_member(client_id) and exists(select 1 from public.vb_marks m where m.id=mark_id and m.client_id=client_id and m.archived_at is null))));
create or replace function vb_private.can_read_evidence_object(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vb_evidence e where e.object_path=path and e.uploaded_at is not null and e.removed_at is null
 and (vb_private.is_staff() or (vb_private.is_client_member(e.client_id) and exists(
 select 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null))));
$$;
create function public.vb_remove_evidence(target_id uuid,target_client uuid) returns void
language plpgsql security definer set search_path='' as $$
declare e public.vb_evidence;
begin
 select * into e from public.vb_evidence where id=target_id and client_id=target_client;
 if e.id is null or e.uploaded_at is null then raise exception 'Evidence unavailable' using errcode='42501';end if;
 perform 1 from public.vb_clients c where c.id=e.client_id for share;
 perform 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id for share;
 if not vb_private.is_staff() and not (vb_private.is_client_member(e.client_id) and exists(
 select 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null))
 then raise exception 'Evidence unavailable' using errcode='42501';end if;
 select * into e from public.vb_evidence where id=target_id for update;
 if e.removed_at is null then update public.vb_evidence set removed_at=now(),removed_by=auth.uid() where id=e.id;end if;
end;$$;
revoke all on function public.vb_remove_evidence(uuid,uuid) from public,anon;
grant execute on function public.vb_remove_evidence(uuid,uuid) to authenticated;
create or replace function public.vb_finish_evidence(target_id uuid,actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.vb_evidence; meta jsonb;
begin
 select * into e from public.vb_evidence where id=target_id;
 if e.id is null or e.uploaded_by<>actor then raise exception 'Evidence unavailable' using errcode='42501';end if;
 perform 1 from public.vb_clients c where c.id=e.client_id and c.archived_at is null and c.portal_enabled for share;
 if not found or not exists(select 1 from vb_private.client_memberships m where m.client_id=e.client_id and m.user_id=actor and m.active)
 or exists(select 1 from vb_private.staff_members s where s.user_id=actor)
 then raise exception 'Client access changed' using errcode='42501';end if;
 perform 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null for share;
 if not found then raise exception 'Trademark unavailable' using errcode='42501';end if;
 select * into e from public.vb_evidence where id=target_id for update;
 if e.removed_at is not null then raise exception 'Evidence removed' using errcode='42501';end if;
 select metadata into meta from storage.objects where bucket_id='vb-evidence' and name=e.object_path;
 if meta is null or (meta->>'size')::bigint is distinct from e.byte_size or meta->>'mimetype' is distinct from e.mime_type
 then raise exception 'Upload incomplete' using errcode='22023';end if;
 if e.uploaded_at is null then update public.vb_evidence set uploaded_at=now() where id=e.id returning * into e;end if;
 return to_jsonb(e);
end;$$;
commit;
