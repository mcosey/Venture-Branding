-- Narrow client contact editing; no change to table write policies or access grants.
begin;
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
commit;
