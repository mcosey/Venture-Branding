-- Private manual evidence uploads. Apply only to the approved Test project first.
begin;
create table public.vb_evidence (
 id uuid primary key, client_id uuid not null references public.vb_clients(id),
 mark_id uuid not null references public.vb_marks(id), uploaded_by uuid not null references auth.users(id),
 kind text not null check(kind in ('webpage','photo')),
 captured_on date not null, source_url text, notes text not null default '',
 filename text not null, mime_type text not null check(mime_type in ('image/png','image/jpeg')),
 byte_size bigint not null check(byte_size between 1 and 10485760),
 content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),
 object_path text not null unique,
 created_at timestamptz not null default now(), uploaded_at timestamptz,
 check(length(filename) between 1 and 200 and filename !~ '[[:cntrl:]]'),
 check(length(notes)<=1000),
 check(kind<>'webpage' or (source_url ~ '^https?://[^[:space:]]+$' and length(source_url)<=2048))
);
create index vb_evidence_scope_idx on public.vb_evidence(client_id,mark_id,uploaded_at desc);
alter table public.vb_evidence enable row level security;
create policy evidence_read on public.vb_evidence for select to authenticated using (
 uploaded_at is not null and ((select vb_private.is_staff()) or (
 vb_private.is_client_member(client_id) and exists(select 1 from public.vb_marks m where m.id=mark_id and m.client_id=client_id and m.archived_at is null))));
revoke all on public.vb_evidence from public,anon,authenticated;
grant select on public.vb_evidence to authenticated;
grant all on public.vb_evidence to service_role;

-- No client writes to storage: only the validating upload function can store bytes.
-- This does not alter any pre-existing bucket or Storage policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vb-evidence','vb-evidence',false,10485760,array['image/png','image/jpeg']);
create function vb_private.can_read_evidence_object(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vb_evidence e where e.object_path=path and e.uploaded_at is not null
 and (vb_private.is_staff() or (vb_private.is_client_member(e.client_id) and exists(
 select 1 from public.vb_marks m where m.id=e.mark_id and m.client_id=e.client_id and m.archived_at is null))));
$$;
revoke all on function vb_private.can_read_evidence_object(text) from public,anon;
grant execute on function vb_private.can_read_evidence_object(text) to authenticated;
create policy evidence_objects_read on storage.objects for select to authenticated
using(bucket_id='vb-evidence' and vb_private.can_read_evidence_object(name));

-- Reservations are hidden until the backend validates and saves the image.
-- Exact repeated requests are idempotent; originals cannot be edited or overwritten.
create function public.vb_reserve_evidence(target_id uuid,target_client uuid,target_mark uuid,details jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.vb_evidence; k text:=details->>'kind'; mt text:=details->>'mimeType'; d date;
 sz bigint; fname text:=btrim(details->>'filename'); source text:=nullif(btrim(details->>'sourceUrl'),'');
 note text:=coalesce(details->>'notes',''); digest text:=details->>'sha256'; path text;
begin
 perform 1 from public.vb_clients c where c.id=target_client and c.archived_at is null and c.portal_enabled for share;
 if not found or not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 perform 1 from public.vb_marks m where m.id=target_mark and m.client_id=target_client and m.archived_at is null for share;
 if not found then raise exception 'Trademark unavailable' using errcode='42501';end if;
 if target_id is null or k is null or k not in ('webpage','photo') or mt is null or mt not in ('image/png','image/jpeg')
 or fname is null or length(fname) not between 1 and 200 or fname ~ '[[:cntrl:]]'
 or length(note)>1000 or digest is null or digest !~ '^[a-f0-9]{64}$'
 or (k='webpage' and (source is null or source !~ '^https?://[^[:space:]]+$' or length(source)>2048))
 then raise exception 'Check evidence details' using errcode='22023';end if;
 begin d:=(details->>'capturedOn')::date;sz:=(details->>'byteSize')::bigint;
 exception when others then raise exception 'Check capture date and file size' using errcode='22023';end;
 if d is null or d>current_date or d<date '1900-01-01' or sz is null or sz not between 1 and 10485760 then raise exception 'Check capture date and file size' using errcode='22023';end if;
 path:=target_client::text||'/'||target_mark::text||'/'||target_id::text||case when mt='image/png' then '.png' else '.jpg' end;
 perform pg_advisory_xact_lock(hashtextextended(target_id::text,0));
 select * into e from public.vb_evidence where id=target_id;
 if e.id is not null then
  if e.client_id<>target_client or e.mark_id<>target_mark or e.uploaded_by<>auth.uid() then raise exception 'Evidence unavailable' using errcode='42501';end if;
  if (e.kind,e.captured_on,e.source_url,e.notes,e.filename,e.mime_type,e.byte_size,e.content_sha256)
  is distinct from (k,d,source,note,fname,mt,sz,digest) then raise exception 'This upload changed. Choose the file again.' using errcode='22023';end if;
 else
  insert into public.vb_evidence(id,client_id,mark_id,uploaded_by,kind,captured_on,source_url,notes,filename,mime_type,byte_size,content_sha256,object_path)
  values(target_id,target_client,target_mark,auth.uid(),k,d,source,note,fname,mt,sz,digest,path) returning * into e;
 end if;
 return to_jsonb(e);
end;$$;
revoke all on function public.vb_reserve_evidence(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.vb_reserve_evidence(uuid,uuid,uuid,jsonb) to authenticated;

-- Service-only completion rechecks membership and actual saved object metadata.
create function public.vb_finish_evidence(target_id uuid,actor uuid) returns jsonb
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
 select metadata into meta from storage.objects where bucket_id='vb-evidence' and name=e.object_path;
 if meta is null or (meta->>'size')::bigint is distinct from e.byte_size or meta->>'mimetype' is distinct from e.mime_type
 then raise exception 'Upload incomplete' using errcode='22023';end if;
 if e.uploaded_at is null then update public.vb_evidence set uploaded_at=now() where id=e.id returning * into e;end if;
 return to_jsonb(e);
end;$$;
revoke all on function public.vb_finish_evidence(uuid,uuid) from public,anon,authenticated;
grant execute on function public.vb_finish_evidence(uuid,uuid) to service_role;
commit;
