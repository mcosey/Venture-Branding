-- Production verification only: existing identity, no record writes; transaction rolls back.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 if not exists(select 1 from vb_private.client_memberships where client_id='10000000-0000-0000-0000-000000000001' and active) then raise exception 'Existing client identity required';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',(select user_id from vb_private.client_memberships where client_id='10000000-0000-0000-0000-000000000001' and active limit 1),'role','authenticated','aal','aal1')::text,true);
end; $$;
set local role authenticated;
do $$ begin
 if public.vb_session_role()<>'client' then raise exception 'Expected client scope';end if;
 if public.vb_bcm_ai_ready() then raise exception 'Monitoring must stay off';end if;
 if public.vb_bcm_ai_client_history('10000000-0000-0000-0000-000000000001')<>'[]'::jsonb then raise exception 'Expected no paid runs';end if;
 begin
  perform public.vb_bcm_ai_client_history('ffffffff-ffff-ffff-ffff-ffffffffffff');
  raise exception 'Cross-client history was not denied';
 exception when insufficient_privilege then null;end;
 begin
  perform public.vb_begin_bcm_ai_run('10000000-0000-0000-0000-000000000001',1);
  raise exception 'Paused reservation was not denied';
 exception when others then if sqlerrm<>'Research is paused' then raise;end if;end;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='vb_bcm_ai_observations' and qual not like '%is_staff%') then raise exception 'Unexpected client finding policy';end if;
end; $$;
reset role;
rollback;
select true as client_scope_checked,true as other_client_history_denied,true as paused_reservation_denied,true as no_persistent_changes;
