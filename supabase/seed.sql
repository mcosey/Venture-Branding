-- Synthetic baseline only. No auth users, memberships or invitations.
insert into public.vb_clients (id,name,client_type,contact_name,portal_enabled)
values ('10000000-0000-0000-0000-000000000001','Cotivate LLC','business','Mario Cosey',true)
on conflict (id) do nothing;
insert into public.vb_marks(id,client_id,name)
values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Cotivate')
on conflict(id) do nothing;
