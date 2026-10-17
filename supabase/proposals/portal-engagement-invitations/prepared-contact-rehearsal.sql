-- Test dependency repair: existing staff writes, security INVOKER and original RLS.
begin;
do $$ begin if (select system_identifier::text from pg_control_system())<>'7692130048193495360' or to_regprocedure('public.vb_save_client(uuid,jsonb,timestamptz)') is not null then raise exception 'Wrong database or save function already installed';end if;end $$;
create function public.vb_save_client(record_id uuid, details jsonb, expected_updated_at timestamptz default null) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare saved uuid;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 if record_id is null then
  insert into public.vb_clients(name,client_type,contact_name,contact_email,portal_enabled)
  values(details->>'name',details->>'client_type',details->>'contact_name',nullif(details->>'contact_email',''),(details->>'portal_enabled')::boolean) returning id into saved;
 else
  update public.vb_clients set name=details->>'name',client_type=details->>'client_type',contact_name=details->>'contact_name',contact_email=nullif(details->>'contact_email',''),portal_enabled=(details->>'portal_enabled')::boolean
  where id=record_id and updated_at=expected_updated_at returning id into saved;
  if saved is null then raise exception 'Record changed or unavailable. Reload and try again.' using errcode='40001'; end if;
 end if;
 insert into public.vb_client_references(client_id,clio_contact_reference,clio_matter_reference,quickbooks_customer_reference)
 values(saved,nullif(details->>'clio_contact_reference',''),nullif(details->>'clio_matter_reference',''),nullif(details->>'quickbooks_customer_reference',''))
 on conflict(client_id) do update set clio_contact_reference=excluded.clio_contact_reference,clio_matter_reference=excluded.clio_matter_reference,quickbooks_customer_reference=excluded.quickbooks_customer_reference;
 return saved;
end;
$$;
revoke all on function public.vb_save_client(uuid,jsonb,timestamptz) from public, anon;
grant execute on function public.vb_save_client(uuid,jsonb,timestamptz) to authenticated;
create temporary table contact_context as select id,updated_at,contact_name,contact_email,name,client_type,portal_enabled from public.vb_clients where id='b9100000-0000-0000-0000-000000000001';
grant select on contact_context to authenticated;
create function pg_temp.contact_denied() returns void language plpgsql as $$ declare actual text:='00000';begin begin perform public.vb_save_client(id,jsonb_build_object('name',name,'client_type',client_type,'contact_name',contact_name,'contact_email','denied@example.test','portal_enabled',portal_enabled),updated_at) from contact_context;exception when others then get stacked diagnostics actual=returned_sqlstate;end;if actual<>'42501' then raise exception 'Nonstaff/MFA contact write unexpectedly allowed: %',actual;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from vb_private.portal_test_onboarding limit 1),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;select pg_temp.contact_denied();reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from vb_private.staff_members where active limit 1),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;select pg_temp.contact_denied();reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from vb_private.staff_members where active limit 1),'role','authenticated','aal','aal2')::text,true);
set local role authenticated;
select public.vb_save_client(id,jsonb_build_object('name',name,'client_type',client_type,'contact_name',contact_name,'contact_email','rollback-contact@example.test','portal_enabled',portal_enabled),updated_at) from contact_context;
do $$declare actual text:='00000';begin begin perform public.vb_save_client(id,jsonb_build_object('name',name,'client_type',client_type,'contact_name',contact_name,'contact_email','stale@example.test','portal_enabled',portal_enabled),updated_at) from contact_context;exception when others then get stacked diagnostics actual=returned_sqlstate;end;if actual<>'40001' then raise exception 'Stale edit unexpectedly allowed: %',actual;end if;end $$;
reset role;
select (select contact_email='rollback-contact@example.test' from public.vb_clients where id=(select id from contact_context)) as staff_save_passed,4 as passed_checks;
rollback;
