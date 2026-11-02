-- Fase 2A only. No public administrator registration or profile creation trigger.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) between 2 and 120),
  role text not null check (role in ('SUPERADMIN','ADMIN')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create function private.is_admin(super_only boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = (select auth.uid()) and active
    and (not super_only or role = 'SUPERADMIN')
  );
$$;
revoke all on function private.is_admin(boolean) from public, anon;
grant execute on function private.is_admin(boolean) to authenticated;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  phone text not null check (length(phone) between 8 and 15),
  email text not null check (length(email) between 3 and 120),
  address text check (length(address) <= 240),
  commune text check (length(commune) <= 60),
  is_client boolean not null default false,
  created_at timestamptz not null default now(),
  unique(email, phone)
);
create table public.lead_statuses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (length(key) between 1 and 50),
  name text not null check (length(name) between 1 and 80),
  position integer not null check (position >= 0),
  active boolean not null default true,
  is_final boolean not null default false,
  check (key <> 'new' or (active and not is_final))
);
insert into public.lead_statuses(key,name,position,is_final) values
 ('new','Nuevo',0,false), ('contacted','Contactado',1,false),
 ('follow_up','En seguimiento',2,false), ('won','Aprobado',3,true), ('lost','Perdido',4,true);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id),
  service text not null check (length(service) between 1 and 160),
  message text check (length(message) <= 1500),
  status_id uuid not null references public.lead_statuses(id),
  source text not null default 'web_form',
  tracking jsonb not null default '{}' check (jsonb_typeof(tracking) = 'object'),
  consent boolean not null check (consent),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  next_follow_up_at timestamptz
);
create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id),
  type text not null check (type in ('note','call','whatsapp','email')),
  note text not null check (length(note) between 1 and 2000),
  responsible_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  next_follow_up_at timestamptz
);
create index leads_contact_idx on public.leads(contact_id);
create index leads_status_created_idx on public.leads(status_id,created_at desc);
create index leads_follow_up_idx on public.leads(next_follow_up_at) where next_follow_up_at is not null;
create index activities_lead_created_idx on public.lead_activities(lead_id,created_at desc);
create index activities_responsible_idx on public.lead_activities(responsible_id);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.lead_statuses enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
revoke all on public.profiles, public.contacts, public.lead_statuses, public.leads, public.lead_activities from anon, authenticated;
grant select on public.profiles to authenticated;
-- Profiles are provisioned only through a trusted operator, never through the app.
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
grant select,insert,update on public.contacts, public.leads to authenticated;
grant select,insert on public.lead_activities to authenticated;
grant select,insert on public.lead_statuses to authenticated;
grant update(name,position,active,is_final) on public.lead_statuses to authenticated;
create policy contacts_read on public.contacts for select to authenticated using ((select private.is_admin()));
create policy contacts_insert on public.contacts for insert to authenticated with check ((select private.is_admin()));
create policy contacts_update on public.contacts for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy leads_read on public.leads for select to authenticated using ((select private.is_admin()));
create policy leads_insert on public.leads for insert to authenticated with check ((select private.is_admin()));
create policy leads_update on public.leads for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy statuses_read on public.lead_statuses for select to authenticated using ((select private.is_admin()));
create policy statuses_insert on public.lead_statuses for insert to authenticated with check ((select private.is_admin(true)));
create policy statuses_update on public.lead_statuses for update to authenticated using ((select private.is_admin(true))) with check ((select private.is_admin(true)));
create policy activities_read on public.lead_activities for select to authenticated using ((select private.is_admin()));
create policy activities_insert on public.lead_activities for insert to authenticated with check ((select private.is_admin()) and responsible_id = (select auth.uid()));

-- Shared rate limiter; only server secret role can invoke public intake.
create table private.intake_limits (key text primary key, starts_at timestamptz not null, attempts integer not null);
revoke all on private.intake_limits from public, anon, authenticated;
create function public.submit_public_lead(payload jsonb, rate_key text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare contact uuid; status uuid; result uuid; hits integer;
begin
  if payload->>'consent' is distinct from 'on' or length(rate_key) <> 64 then
    raise exception 'Invalid submission';
  end if;
  insert into private.intake_limits as limits values(rate_key,now(),1)
  on conflict(key) do update set
    starts_at = case when limits.starts_at < now()-interval '10 minutes' then now() else limits.starts_at end,
    attempts = case when limits.starts_at < now()-interval '10 minutes' then 1 else limits.attempts+1 end
  returning attempts into hits;
  if hits > 5 then return null; end if;
  delete from private.intake_limits where starts_at < now()-interval '1 day';
  select id into strict status from public.lead_statuses where key='new' and active;
  -- Exact normalized email + phone reuse; never overwrite an existing contact from public input.
  insert into public.contacts(name,phone,email,commune) values
    (payload->>'name', regexp_replace(payload->>'phone','[^0-9]','','g'),lower(trim(payload->>'email')),nullif(payload->>'commune',''))
  on conflict(email,phone) do nothing returning id into contact;
  if contact is null then
    select id into strict contact from public.contacts where email=lower(trim(payload->>'email'))
    and phone=regexp_replace(payload->>'phone','[^0-9]','','g');
  end if;
  insert into public.leads(contact_id,service,message,status_id,tracking,consent)
  values(contact,payload->>'service',payload->>'message',status,coalesce(payload->'tracking','{}'),true)
  returning id into result;
  return result;
end;
$$;
revoke all on function public.submit_public_lead(jsonb,text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.intake_limits to service_role;
grant select,insert on public.contacts, public.leads to service_role;
grant select on public.lead_statuses to service_role;
grant execute on function public.submit_public_lead(jsonb,text) to service_role;

create function public.record_lead_activity(target uuid,new_status uuid,activity_type text,body text,follow_up timestamptz) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  if not private.is_admin() then raise exception 'Forbidden'; end if;
  if not exists(select 1 from public.lead_statuses where id=new_status and active) then raise exception 'Invalid status'; end if;
  update public.leads set status_id=new_status,last_activity_at=now(),next_follow_up_at=follow_up where id=target;
  if not found then raise exception 'Lead unavailable'; end if;
  insert into public.lead_activities(lead_id,type,note,responsible_id,next_follow_up_at)
  values(target,activity_type,body,auth.uid(),follow_up) returning id into result;
  return result;
end;
$$;
revoke all on function public.record_lead_activity(uuid,uuid,text,text,timestamptz) from public,anon;
grant execute on function public.record_lead_activity(uuid,uuid,text,text,timestamptz) to authenticated;

-- Private bucket only; future media features must add path/size/MIME rules before upload UI.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admin-documents','admin-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy admin_storage_read on storage.objects for select to authenticated
using (bucket_id='admin-documents' and (select private.is_admin()));
commit;
