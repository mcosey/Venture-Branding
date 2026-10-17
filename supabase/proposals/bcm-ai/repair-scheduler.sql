-- Test-only correction: distinguish the schedule table alias from the local schedule record.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required';end if;
end; $$;
create or replace function public.vb_claim_bcm_ai_due_run() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; cfg public.vb_bcm_settings; s public.vb_bcm_schedules; result jsonb; cap integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 select max_runs into cap from vb_private.bcm_ai_config where singleton and ready for update;
 if cap is null or not public.vb_bcm_ai_ready() or (select count(*) from public.vb_bcm_ai_runs)>=cap then return null; end if;
 select c.id into target from public.vb_clients c join public.vb_bcm_schedules due_schedule on due_schedule.client_id=c.id
 where due_schedule.enabled and due_schedule.next_run_at<=now() and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')
 order by due_schedule.next_run_at,c.id for update of c skip locked limit 1;
 if target is null then return null; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 select * into s from public.vb_bcm_schedules where client_id=target for update;
 if cfg.version is distinct from s.settings_version or not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,s.authorized_by) then
  update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,last_status='access_unavailable',updated_at=now() where client_id=target;
  return null;
 end if;
 result:=vb_private.reserve_bcm_ai(target,s.authorized_by,s.revision);
 update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,last_status='running',updated_at=now() where client_id=target;
 return result;
end; $$;
commit;
