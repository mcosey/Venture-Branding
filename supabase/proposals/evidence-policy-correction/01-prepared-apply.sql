-- PREPARED ONLY. Hosted rehearsal/application requires separate approval.
-- Forward correction: preserve historical migrations and all other permissions.
begin;
set local search_path = pg_catalog, public;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.vb_evidence in access exclusive mode;

do $guard$
declare p record;
begin
 select * into p from pg_policy
 where polrelid='public.vb_evidence'::regclass and polname='evidence_read';
 if not found then raise exception 'Expected evidence_read policy is missing'; end if;
 if p.polcmd <> 'r' or not p.polpermissive
 or p.polroles is distinct from array['authenticated'::regrole::oid]
 or p.polwithcheck is not null
 then raise exception 'Evidence policy metadata changed; stop for review'; end if;
 if not (select relrowsecurity from pg_class where oid=p.polrelid)
 or not (select relrowsecurity from pg_class where oid='public.vb_marks'::regclass)
 then raise exception 'Expected evidence/mark row security is disabled'; end if;
 -- Compare the installed, parsed expression, not the ambiguous migration text.
 -- A repeat application or any intervening policy edit must stop for review.
 if regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]','','g') is distinct from
 regexp_replace($expected$
 ((removed_at IS NULL) AND (uploaded_at IS NOT NULL) AND
 (( SELECT vb_private.is_staff() AS is_staff) OR
 (vb_private.is_client_member(client_id) AND (EXISTS
 ( SELECT 1 FROM vb_marks m WHERE ((m.id = vb_evidence.mark_id)
 AND (m.client_id = m.client_id) AND (m.archived_at IS NULL)))))))
 $expected$,'[[:space:]]','','g')
 then raise exception 'Evidence policy expression changed; stop for review'; end if;
end;
$guard$;

-- ALTER preserves the policy identity, role, permissive mode and SELECT command.
-- The staff/MFA branch, upload/removal checks and mark archive check are unchanged.
-- In Test, portal_scoped_read remains an additional restrictive requirement.
alter policy evidence_read on public.vb_evidence using (
 removed_at is null and uploaded_at is not null and (
 (select vb_private.is_staff()) or (
 vb_private.is_client_member(client_id) and exists (
 select 1 from public.vb_marks m
 where m.id=vb_evidence.mark_id
 and m.client_id=vb_evidence.client_id
 and m.archived_at is null))));
commit;
