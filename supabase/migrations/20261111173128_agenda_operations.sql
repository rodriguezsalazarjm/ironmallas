-- Iron Mallas 2.0 · Agenda operativa, fichas técnicas, sincronización Cal.com, avisos y cotizador flexible (11-11-2026).
-- Migración ADITIVA. No elimina tablas, columnas ni filas. Preparada localmente: aplicar en remoto solo con autorización.
-- Contratos conservados:
--   * installations.scheduled_at sigue siendo la única fuente de programación de instalaciones.
--   * Una cita vinculada mediante installations.appointment_id es histórica y no se muestra como segundo evento.
--   * La cadena comercial visita → cotización → instalación usa quotes.appointment_id + installations.quote_id
--     (no installations.appointment_id), para no ocultar la visita en la agenda.
begin;

-- 1. Datos operativos de la cita / visita técnica.
alter table public.appointments
  add column building text check (length(building) <= 120),
  add column unit text check (length(unit) <= 40),
  add column floor text check (length(floor) <= 20),
  add column access_notes text check (length(access_notes) <= 1000),
  add column zone_kind text check (zone_kind in ('balcon','ventana','logia','terraza','otra')),
  add column source text not null default 'admin' check (source in ('admin','cal_booking','web')),
  add column cal_sync_status text not null default 'none' check (cal_sync_status in ('none','synced','pending','failed')),
  add column cal_sync_error text check (length(cal_sync_error) <= 500),
  add column cal_synced_at timestamptz,
  add column attendance_status text not null default 'pending' check (attendance_status in ('pending','confirmed')),
  add column attendance_confirmed_at timestamptz;
update public.appointments set source = 'cal_booking', cal_sync_status = 'synced' where cal_booking_uid is not null;

-- 2. Instalaciones: duración solo cuando se informa (nunca se inventa) y confirmación de asistencia.
alter table public.installations
  add column duration_minutes integer check (duration_minutes between 15 and 1440),
  add column building text check (length(building) <= 120),
  add column unit text check (length(unit) <= 40),
  add column floor text check (length(floor) <= 20),
  add column access_notes text check (length(access_notes) <= 1000),
  add column attendance_status text not null default 'pending' check (attendance_status in ('pending','confirmed')),
  add column attendance_confirmed_at timestamptz;

-- 3. Cotización originada en una visita técnica.
alter table public.quotes add column appointment_id uuid references public.appointments(id);
create index quotes_appointment_idx on public.quotes(appointment_id);

-- 4. Ficha técnica (evaluación) para una visita o una instalación.
create table public.technical_assessments(
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid unique references public.appointments(id),
  installation_id uuid unique references public.installations(id),
  zones jsonb not null default '[]' check (jsonb_typeof(zones) = 'array' and jsonb_array_length(zones) <= 30),
  mesh_type text check (length(mesh_type) <= 120),
  pillars_200 integer not null default 0 check (pillars_200 between 0 and 100),
  pillars_240 integer not null default 0 check (pillars_240 between 0 and 100),
  anchoring text check (length(anchoring) <= 1000),
  wall_condition text check (length(wall_condition) <= 1000),
  access_difficulties text check (length(access_difficulties) <= 1000),
  additional_materials text check (length(additional_materials) <= 1000),
  observations text check (length(observations) <= 4000),
  recommendations text check (length(recommendations) <= 4000),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(appointment_id, installation_id) = 1)
);
create index assessments_created_by_idx on public.technical_assessments(created_by);
create index assessments_updated_by_idx on public.technical_assessments(updated_by);

create function private.check_assessment_zones() returns trigger language plpgsql set search_path='' as $$
declare z jsonb;
begin
  for z in select * from jsonb_array_elements(new.zones) loop
    if jsonb_typeof(z) <> 'object'
      or coalesce(z->>'kind','') not in ('balcon','ventana','logia','terraza','otra')
      or jsonb_typeof(z->'width_mm') <> 'number' or jsonb_typeof(z->'height_mm') <> 'number' or jsonb_typeof(z->'quantity') <> 'number'
      or (z->>'width_mm')::numeric not between 1 and 100000 or (z->>'height_mm')::numeric not between 1 and 100000
      or (z->>'quantity')::numeric not between 1 and 1000
      or (z->>'width_mm')::numeric <> trunc((z->>'width_mm')::numeric) or (z->>'height_mm')::numeric <> trunc((z->>'height_mm')::numeric)
      or (z->>'quantity')::numeric <> trunc((z->>'quantity')::numeric)
      or length(coalesce(z->>'description','')) > 200 or length(coalesce(z->>'notes','')) > 500 then
      raise exception 'Invalid assessment zone';
    end if;
  end loop;
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
revoke all on function private.check_assessment_zones() from public, anon, authenticated;
create trigger assessment_zones before insert or update on public.technical_assessments for each row execute function private.check_assessment_zones();

create table public.assessment_photos(
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.technical_assessments(id),
  path text not null unique check (path ~ '^assessments/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$'),
  stage text not null check (stage in ('before','after','detail','incident')),
  caption text check (length(caption) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (split_part(path,'/',2) = assessment_id::text)
);
create index assessment_photos_assessment_idx on public.assessment_photos(assessment_id);
create index assessment_photos_created_by_idx on public.assessment_photos(created_by);

do $$ declare t text; begin
  foreach t in array array['technical_assessments','assessment_photos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_admin()))', t||'_admin_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))', t||'_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t||'_admin_update', t);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function private.audit_row()', t);
  end loop;
end $$;
create trigger touch_updated before update on public.technical_assessments for each row execute function private.touch_updated();
grant select on public.technical_assessments, public.assessment_photos to service_role;

-- Fotografías de evaluación: bucket privado existente, ruta validada y ficha existente.
create policy assessment_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'admin-documents' and (select private.is_admin())
  and name ~ '^assessments/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$'
  and exists (select 1 from public.technical_assessments a where a.id::text = split_part(name,'/',2)));
create policy orphan_assessment_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'admin-documents' and (select private.is_admin())
  and name ~ '^assessments/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$'
  and not exists (select 1 from public.assessment_photos p where p.path = name));

-- 5. Conflictos de horario por técnico. Márgenes configurables en settings.agenda:
--    {buffer_minutes, default_installation_minutes}. Sin duración conocida ni predeterminada,
--    una instalación se trata como un punto (1 minuto) solo para detectar choques, sin mostrar duración inventada.
create function private.agenda_minutes(k text) returns integer language sql stable security definer set search_path='' as $$
  select case when (value->>k) ~ '^[0-9]{1,4}$' then (value->>k)::integer end from public.settings where key = 'agenda'
$$;
revoke all on function private.agenda_minutes(text) from public, anon, authenticated;

create function public.schedule_conflict(p_technician uuid, p_starts timestamptz, p_ends timestamptz, p_appointment uuid default null, p_installation uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare buffer interval; default_job interval; hit jsonb;
begin
  if auth.uid() is not null and not private.is_admin() then raise exception 'Forbidden'; end if;
  if p_technician is null or p_starts is null then return null; end if;
  buffer = make_interval(mins => coalesce(private.agenda_minutes('buffer_minutes'), 0));
  default_job = make_interval(mins => coalesce(private.agenda_minutes('default_installation_minutes'), 1));
  p_ends = greatest(coalesce(p_ends, p_starts + interval '1 minute'), p_starts + interval '1 minute');
  select jsonb_build_object('source','appointment','id',a.id,'starts_at',a.starts_at) into hit
    from public.appointments a
   where a.technician_id = p_technician and a.status in ('scheduled','rescheduled')
     and (p_appointment is null or a.id <> p_appointment)
     and not exists (select 1 from public.installations i where i.appointment_id = a.id)
     and a.starts_at < p_ends + buffer and p_starts < a.ends_at + buffer
   order by a.starts_at limit 1;
  if hit is not null then return hit; end if;
  select jsonb_build_object('source','installation','id',i.id,'starts_at',i.scheduled_at) into hit
    from public.installations i
   where i.technician_id = p_technician and i.scheduled_at is not null and i.status in ('scheduled','rescheduled','in_progress')
     and (p_installation is null or i.id <> p_installation)
     and i.scheduled_at < p_ends + buffer
     and p_starts < i.scheduled_at + coalesce(make_interval(mins => i.duration_minutes), default_job) + buffer
   order by i.scheduled_at limit 1;
  return hit;
end $$;
revoke all on function public.schedule_conflict(uuid,timestamptz,timestamptz,uuid,uuid) from public, anon;
grant execute on function public.schedule_conflict(uuid,timestamptz,timestamptz,uuid,uuid) to authenticated, service_role;

create function private.guard_schedule() returns trigger language plpgsql security definer set search_path='' as $$
declare s timestamptz; e timestamptz; active boolean; hit jsonb; moved boolean = false; unchanged boolean = false;
begin
  -- PL/pgSQL no evalúa en cortocircuito los campos de NEW: cada tabla se trata en su propia rama.
  if tg_table_name = 'appointments' then
    s = new.starts_at; e = new.ends_at; active = new.status in ('scheduled','rescheduled');
    -- Una cita vinculada a una instalación es histórica: la instalación es la que ocupa al técnico.
    if exists (select 1 from public.installations i where i.appointment_id = new.id) then active = false; end if;
    if tg_op = 'UPDATE' then
      moved = new.starts_at is distinct from old.starts_at;
      unchanged = not moved and new.ends_at = old.ends_at;
    end if;
  else
    s = new.scheduled_at;
    e = new.scheduled_at + coalesce(make_interval(mins => new.duration_minutes), make_interval(mins => coalesce(private.agenda_minutes('default_installation_minutes'), 1)));
    active = new.scheduled_at is not null and new.status in ('scheduled','rescheduled','in_progress');
    if tg_op = 'UPDATE' then
      moved = new.scheduled_at is distinct from old.scheduled_at;
      unchanged = not moved and new.duration_minutes is not distinct from old.duration_minutes;
    end if;
  end if;
  if moved and new.status in ('scheduled','rescheduled') then
    new.attendance_status = 'pending'; new.attendance_confirmed_at = null;
  end if;
  if not active or new.technician_id is null then return new; end if;
  if tg_op = 'UPDATE' and unchanged and new.technician_id is not distinct from old.technician_id and new.status is not distinct from old.status then
    return new;
  end if;
  -- Serializa reservas concurrentes del mismo técnico (dos administradores, panel + webhook).
  perform pg_advisory_xact_lock(hashtextextended('technician:' || new.technician_id::text, 0));
  if tg_table_name = 'appointments' then hit = public.schedule_conflict(new.technician_id, s, e, new.id, null);
  else hit = public.schedule_conflict(new.technician_id, s, e, null, new.id); end if;
  if hit is not null then
    raise exception 'Schedule conflict for technician' using errcode = '23P01', detail = hit::text;
  end if;
  return new;
end $$;
revoke all on function private.guard_schedule() from public, anon, authenticated;
create trigger schedule_guard before insert or update on public.appointments for each row execute function private.guard_schedule();
create trigger schedule_guard before insert or update on public.installations for each row execute function private.guard_schedule();

-- 6. Cola de avisos de agenda sobre la tabla notifications existente (sin segundo sistema de correo).
alter table public.notifications
  add column send_after timestamptz not null default now(),
  add column entity text check (entity in ('appointment','installation')),
  add column entity_id uuid,
  add column event_starts_at timestamptz;
alter table public.notifications drop constraint notifications_status_check;
alter table public.notifications add constraint notifications_status_check check (status in ('pending','sent','failed','cancelled'));
create index notifications_queue_idx on public.notifications(status, send_after) where status in ('pending','failed');
create index notifications_entity_idx on public.notifications(entity, entity_id) where entity is not null;

create function private.queue_agenda_notice(p_kind text, p_entity text, p_id uuid, p_starts timestamptz, p_send_after timestamptz, p_near boolean) returns void
language plpgsql security definer set search_path='' as $$
declare audience text; subject text;
begin
  foreach audience in array array['client','admin'] loop
    subject = case p_kind
      when 'agenda_scheduled' then case when p_entity = 'appointment' then 'Tu visita técnica con Iron Mallas está agendada' else 'Tu instalación con Iron Mallas está programada' end
      when 'agenda_rescheduled' then 'Cambio de horario · Iron Mallas'
      when 'agenda_cancelled' then 'Cancelación · Iron Mallas'
      when 'agenda_reminder' then 'Recordatorio: mañana te visita Iron Mallas' end;
    if audience = 'admin' then subject = '[Agenda] ' || subject; end if;
    insert into public.notifications(kind, recipient, subject, body, payload, send_after, entity, entity_id, event_starts_at)
    values (p_kind, null, subject, 'Contenido generado al enviar desde el estado vigente del evento.',
      jsonb_build_object('dedupe_key', p_entity||':'||p_id||':'||p_kind||':'||audience||':'||extract(epoch from p_starts)::bigint,
                         'audience', audience, 'near', p_near),
      p_send_after, p_entity, p_id, p_starts)
    on conflict do nothing;
  end loop;
end $$;
revoke all on function private.queue_agenda_notice(text,text,uuid,timestamptz,timestamptz,boolean) from public, anon, authenticated;

create function private.enqueue_agenda_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare ent text; s timestamptz; old_s timestamptz; now_active boolean; was_active boolean = false; reminder_at timestamptz; near boolean;
begin
  if tg_table_name = 'appointments' then
    ent = 'appointment'; s = new.starts_at; now_active = new.status in ('scheduled','rescheduled');
    if tg_op = 'UPDATE' then old_s = old.starts_at; was_active = old.status in ('scheduled','rescheduled'); end if;
    -- La cita histórica de una instalación no genera avisos propios.
    if exists (select 1 from public.installations i where i.appointment_id = new.id) then return new; end if;
  else
    ent = 'installation'; s = new.scheduled_at; now_active = new.scheduled_at is not null and new.status in ('scheduled','rescheduled');
    if tg_op = 'UPDATE' then old_s = old.scheduled_at; was_active = old.scheduled_at is not null and old.status in ('scheduled','rescheduled','in_progress'); end if;
    if new.status = 'in_progress' then return new; end if;
  end if;

  if was_active and not now_active and new.status = 'cancelled' then
    update public.notifications set status = 'cancelled', last_error = 'Evento cancelado'
     where entity = ent and entity_id = new.id and status in ('pending','failed') and kind <> 'agenda_cancelled';
    perform private.queue_agenda_notice('agenda_cancelled', ent, new.id, coalesce(old_s, now()), now(), false);
    return new;
  end if;
  if not now_active then
    if was_active then
      update public.notifications set status = 'cancelled', last_error = 'Evento cerrado'
       where entity = ent and entity_id = new.id and status in ('pending','failed') and kind in ('agenda_reminder','agenda_scheduled','agenda_rescheduled');
    end if;
    return new;
  end if;
  if was_active and s is not distinct from old_s then return new; end if;

  -- Invalidar avisos de horarios anteriores.
  update public.notifications set status = 'cancelled', last_error = 'Horario reemplazado'
   where entity = ent and entity_id = new.id and status in ('pending','failed')
     and kind in ('agenda_reminder','agenda_scheduled','agenda_rescheduled') and event_starts_at is distinct from s;

  near = s - now() < interval '24 hours';
  perform private.queue_agenda_notice(case when was_active then 'agenda_rescheduled' else 'agenda_scheduled' end, ent, new.id, s, now(), near);
  reminder_at = s - interval '24 hours';
  -- Regla de aviso cercano: si faltan menos de 24 h (o el evento ya pasó), no se envía recordatorio retrospectivo;
  -- el aviso de agenda incluye directamente el enlace de confirmación.
  if not near then perform private.queue_agenda_notice('agenda_reminder', ent, new.id, s, reminder_at, false); end if;
  return new;
end $$;
revoke all on function private.enqueue_agenda_notifications() from public, anon, authenticated;
create trigger enqueue_agenda_notifications after insert or update on public.appointments for each row execute function private.enqueue_agenda_notifications();
create trigger enqueue_agenda_notifications after insert or update on public.installations for each row execute function private.enqueue_agenda_notifications();

-- 7. Confirmación de asistencia mediante enlace temporal. Solo se guarda el hash del token.
create table private.attendance_tokens(
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  entity text not null check (entity in ('appointment','installation')),
  entity_id uuid not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index attendance_tokens_entity_idx on private.attendance_tokens(entity, entity_id);
revoke all on private.attendance_tokens from public, anon, authenticated;

create function public.issue_attendance_token(p_token_hash text, p_entity text, p_entity_id uuid, p_starts timestamptz, p_expires timestamptz) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_entity not in ('appointment','installation') or p_expires <= now() or p_expires > p_starts + interval '1 day' then raise exception 'Invalid token'; end if;
  insert into private.attendance_tokens(token_hash, entity, entity_id, starts_at, expires_at) values (p_token_hash, p_entity, p_entity_id, p_starts, p_expires);
end $$;
revoke all on function public.issue_attendance_token(text,text,uuid,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.issue_attendance_token(text,text,uuid,timestamptz,timestamptz) to service_role;

-- p_commit=false solo inspecciona (página GET sin efectos); true registra la confirmación (POST).
create function public.confirm_attendance(p_token_hash text, p_commit boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t private.attendance_tokens%rowtype; s timestamptz; st text; kind_label text;
begin
  select * into t from private.attendance_tokens where token_hash = p_token_hash for update;
  if not found or t.expires_at < now() then return jsonb_build_object('state','invalid'); end if;
  if t.entity = 'appointment' then
    select starts_at, status, case when kind = 'installation' then 'Instalación' else 'Visita técnica' end into s, st, kind_label from public.appointments where id = t.entity_id;
  else
    select scheduled_at, status, 'Instalación' into s, st, kind_label from public.installations where id = t.entity_id;
  end if;
  if s is null or st not in ('scheduled','rescheduled') then return jsonb_build_object('state','unavailable'); end if;
  if s <> t.starts_at then return jsonb_build_object('state','outdated'); end if;
  if t.used_at is not null then return jsonb_build_object('state','confirmed','starts_at',s,'kind',kind_label); end if;
  if not p_commit then return jsonb_build_object('state','ready','starts_at',s,'kind',kind_label); end if;
  update private.attendance_tokens set used_at = now() where token_hash = p_token_hash;
  if t.entity = 'appointment' then
    update public.appointments set attendance_status = 'confirmed', attendance_confirmed_at = now() where id = t.entity_id;
  else
    update public.installations set attendance_status = 'confirmed', attendance_confirmed_at = now() where id = t.entity_id;
  end if;
  return jsonb_build_object('state','confirmed','starts_at',s,'kind',kind_label);
end $$;
revoke all on function public.confirm_attendance(text,boolean) from public, anon, authenticated;
grant execute on function public.confirm_attendance(text,boolean) to service_role;
grant update(attendance_status, attendance_confirmed_at, cal_sync_status, cal_sync_error, cal_synced_at) on public.appointments to service_role;
grant update(attendance_status, attendance_confirmed_at) on public.installations to service_role;
grant select on public.contacts, public.profiles to service_role;

-- 8. Reserva pública Cal.com: dirección, comuna, zona, consentimiento y oportunidad vinculada.
create or replace function public.sync_cal_booking(p_event_key text,p_event_type text,p_payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
declare event_id uuid; appt uuid; contact uuid; mail text; phone text; uid text; n integer; incoming_at timestamptz; lead uuid; status_new uuid; root_uid text;
begin
  if p_event_type not in ('BOOKING_CREATED','BOOKING_RESCHEDULED','BOOKING_CANCELLED') or length(p_event_key) not between 1 and 200 then raise exception 'Unsupported webhook'; end if;
  uid=p_payload->>'uid';
  if uid is null or length(uid) not between 1 and 200 then raise exception 'Booking UID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cal:'||uid,0));
  incoming_at=coalesce(nullif(p_payload->>'occurred_at','')::timestamptz,now());
  insert into public.webhook_events(provider,event_key,event_type,payload) values('cal',p_event_key,p_event_type,p_payload||jsonb_build_object('occurred_at',incoming_at)) on conflict(provider,event_key) do nothing returning id into event_id;
  if event_id is null then select id into appt from public.appointments where cal_booking_uid=uid; return appt; end if;
  if exists(select 1 from public.webhook_events e where e.provider='cal' and e.id<>event_id and e.payload->>'uid'=uid and ((e.payload->>'occurred_at')::timestamptz>incoming_at or ((e.payload->>'occurred_at')::timestamptz=incoming_at and e.event_type='BOOKING_CANCELLED' and p_event_type<>'BOOKING_CANCELLED')))
     or (p_event_type='BOOKING_CREATED' and exists(select 1 from public.webhook_events e where e.provider='cal' and e.id<>event_id and e.event_type='BOOKING_RESCHEDULED' and e.payload->>'old_uid'=uid)) then
    select id into appt from public.appointments where cal_booking_uid=uid;
    update public.webhook_events set processed_at=now() where id=event_id;
    return appt;
  end if;
  if p_event_type='BOOKING_CANCELLED' then
    update public.appointments set status='cancelled',cal_sync_status='synced',cal_sync_error=null,cal_synced_at=now() where cal_booking_uid=uid and status<>'cancelled' returning id into appt;
    if appt is null then select id into appt from public.appointments where cal_booking_uid=uid; end if;
  else
    mail=lower(trim(p_payload->'contact'->>'email')); phone=nullif(regexp_replace(coalesce(p_payload->'contact'->>'phone',''),'[^0-9]','','g'),'');
    if mail is null or length(mail) not between 3 and 120 then raise exception 'Attendee email required'; end if;
    perform pg_advisory_xact_lock(hashtextextended(mail,0));
    if phone is not null then select id into contact from public.contacts where email=mail and contacts.phone=phone order by created_at limit 1; end if;
    if contact is null then
      select count(*) into n from public.contacts where email=mail;
      if n=1 then select id into contact from public.contacts where email=mail;
      elsif n>1 then raise exception 'Ambiguous contact, manual review required'; end if;
    end if;
    if contact is null then
      insert into public.contacts(name,email,phone,whatsapp,address,commune,source,consent,consent_at)
      values(p_payload->'contact'->>'name',mail,phone,phone,nullif(left(p_payload->'contact'->>'address',240),''),nullif(left(p_payload->'contact'->>'commune',60),''),'cal_booking',
             coalesce((p_payload->>'consent')::boolean,false),case when coalesce((p_payload->>'consent')::boolean,false) then now() end) returning id into contact;
    end if;
    if p_payload->>'old_uid' is not null then select id into appt from public.appointments where cal_booking_uid=p_payload->>'old_uid' for update; end if;
    if appt is not null then
      update public.appointments set cal_booking_uid=uid,starts_at=(p_payload->>'starts_at')::timestamptz,ends_at=(p_payload->>'ends_at')::timestamptz,
        status=case when status='cancelled' then status else 'rescheduled' end,cal_sync_status='synced',cal_sync_error=null,cal_synced_at=now() where id=appt;
    else
      -- Oportunidad idempotente por la UID original de la reserva (una reprogramación conserva la misma oportunidad).
      root_uid=coalesce(p_payload->>'old_uid',uid);
      select id into lead from public.leads where source='CAL_BOOKING' and external_id=root_uid and contact_id=contact;
      if lead is null then
        select id into strict status_new from public.lead_statuses where key='new' and active;
        insert into public.leads(contact_id,service,message,status_id,source,tracking,consent,external_id,source_confidence,campaign_attribution,legal_basis,next_action)
        values(contact,left(coalesce(nullif(p_payload->>'service',''),'Visita técnica'),160),nullif(left(coalesce(p_payload->>'notes',''),1500),''),status_new,'CAL_BOOKING','{}'::jsonb,true,root_uid,
               'self_declared','none',case when coalesce((p_payload->>'consent')::boolean,false) then 'consent' else 'precontractual' end,'Realizar visita técnica')
        on conflict (source, external_id) where external_id is not null do nothing returning id into lead;
        if lead is null then select id into lead from public.leads where source='CAL_BOOKING' and external_id=root_uid and contact_id=contact;
        else
          -- El aviso de agenda al administrador ya informa la reserva: evita un segundo correo por la misma solicitud.
          update public.notifications set status='cancelled',last_error='Cubierto por el aviso de agenda' where kind='lead_created' and payload->>'lead_id'=lead::text and status='pending';
        end if;
      end if;
      insert into public.appointments as ap(contact_id,lead_id,kind,service,starts_at,ends_at,address,commune,zone_kind,status,notes,cal_booking_uid,source,cal_sync_status,cal_synced_at)
      values(contact,lead,'visit',coalesce(nullif(p_payload->>'service',''),'Visita técnica'),(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,
        left(coalesce(p_payload->'contact'->>'address',''),240),left(coalesce(p_payload->'contact'->>'commune',''),60),
        case when p_payload->>'zone_kind' in ('balcon','ventana','logia','terraza','otra') then p_payload->>'zone_kind' end,
        case when p_event_type='BOOKING_RESCHEDULED' then 'rescheduled' else 'scheduled' end,p_payload->>'notes',uid,'cal_booking','synced',now())
      on conflict(cal_booking_uid) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,
        status=case when ap.status='cancelled' then ap.status else excluded.status end,
        notes=excluded.notes,cal_sync_status='synced',cal_sync_error=null,cal_synced_at=now() returning id into appt;
    end if;
  end if;
  update public.webhook_events set processed_at=now() where id=event_id;
  return appt;
end $$;
revoke all on function public.sync_cal_booking(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sync_cal_booking(text,text,jsonb) to service_role;
grant select,insert on public.leads, public.contacts to service_role;
grant select on public.lead_statuses to service_role;

-- 9. Configuración de agenda inicial sin inventar duraciones de instalaciones (solo márgenes neutros).
insert into public.settings(key,value) values ('agenda', jsonb_build_object('buffer_minutes',0,'client_emails_for_cal',false)) on conflict (key) do nothing;

-- 10. Cotizador: precio excepcional por metro lineal y tratamiento tributario justificado.
--     * pricing.mode='custom_rate' (solo SUPERADMIN): toma una tarifa ml/m² vigente, aplica un precio unitario
--       excepcional con motivo, sin modificar pricing_rules. El snapshot de cada versión conserva ambos precios.
--     * apply_tax=false exige tax_exemption = clave de settings.commercial.tax_exemptions[] (SUPERADMIN).
--       Un cliente empresa o la solicitud de factura NO bastan para omitir el IVA.
create or replace function private.save_quick_quote(p_contact_id uuid,p_lead_id uuid,p_quote_id uuid,p_expected_version integer,p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg jsonb; rule public.pricing_rules%rowtype; xr public.pricing_rules%rowtype; q public.quotes%rowtype; qid uuid; ver integer; z jsonb; e jsonb;
  w numeric; h numeric; n numeric; area_mm2 numeric = 0; linear_mm numeric = 0; measure text; definitive boolean; main_label text; area_milli numeric; zones jsonb = '[]'; extras_json jsonb = '[]';
  main numeric; surcharge numeric = 0; extras numeric = 0; amount numeric; qty numeric; subtotal numeric; discount numeric; net numeric; tax numeric;
  tax_rate integer; days integer; disc integer; mode text; super boolean; max_discount integer = 10000; pricing jsonb; apply_tax boolean; area_label text; items_snapshot jsonb; contact_snapshot jsonb; unit_price numeric; tax_treatment jsonb; ex jsonb; appt uuid;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  super = private.is_admin(true);
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'Invalid payload'; end if;
  mode = p->'pricing'->>'mode'; disc = coalesce((p->>'discount_bps')::integer,0); apply_tax = coalesce((p->>'apply_tax')::boolean,true); definitive = coalesce((p->>'definitive')::boolean,false);
  if disc not between 0 and 10000 then raise exception 'Invalid discount'; end if;
  if length(coalesce(p->>'service','')) not between 2 and 160 or length(coalesce(p->>'notes','')) > 3000 or length(coalesce(p->>'work_address','')) > 300
     or length(coalesce(p->>'mesh_type','')) > 120 then raise exception 'Invalid text'; end if;
  if jsonb_typeof(p->'zones') <> 'array' or jsonb_array_length(p->'zones') not between 1 and 30 then raise exception 'Zones required'; end if;
  if jsonb_typeof(coalesce(p->'extras','[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p->'extras','[]'::jsonb)) > 20 then raise exception 'Invalid extras'; end if;
  if not apply_tax and not super then raise exception 'Only SUPERADMIN can omit VAT'; end if;
  select value into cfg from public.settings where key='commercial';
  if cfg is null or cfg->>'tax_bps' is null or cfg->>'validity_days' is null or length(coalesce(cfg->>'payment_terms',''))=0 or length(coalesce(cfg->'company'->>'name',''))=0 then raise exception 'Commercial settings are not configured'; end if;
  if not apply_tax then
    select x into ex from jsonb_array_elements(case when jsonb_typeof(cfg->'tax_exemptions')='array' then cfg->'tax_exemptions' else '[]'::jsonb end) x
     where x->>'key' = p->>'tax_exemption' and x->>'kind' in ('exempt','not_affected') and length(coalesce(x->>'legal_basis','')) between 10 and 500 limit 1;
    if ex is null then raise exception 'Tax exemption requires a configured legal basis'; end if;
    tax_treatment = jsonb_build_object('kind',ex->>'kind','key',ex->>'key','label',ex->>'label','legal_basis',ex->>'legal_basis','approved_by',auth.uid());
  else
    tax_treatment = jsonb_build_object('kind','affected','tax_bps',(cfg->>'tax_bps')::integer);
  end if;
  appt = nullif(p->>'appointment_id','')::uuid;
  if appt is not null and not exists(select 1 from public.appointments a where a.id=appt and a.contact_id=p_contact_id) then raise exception 'Appointment does not belong to contact'; end if;
  tax_rate = case when apply_tax then (cfg->>'tax_bps')::integer else 0 end; days = (cfg->>'validity_days')::integer;
  if tax_rate not between 0 and 10000 or days not between 1 and 365 then raise exception 'Invalid commercial settings'; end if;
  select to_jsonb(c) into contact_snapshot from public.contacts c where id=p_contact_id;
  if contact_snapshot is null then raise exception 'Contact unavailable'; end if;
  if p_lead_id is not null and not exists(select 1 from public.leads where id=p_lead_id and contact_id=p_contact_id) then raise exception 'Lead does not belong to contact'; end if;

  for z in select * from jsonb_array_elements(p->'zones') loop
    w = (z->>'width_mm')::numeric; h = (z->>'height_mm')::numeric; n = (z->>'quantity')::numeric;
    if w is null or h is null or n is null or w <> trunc(w) or h <> trunc(h) or n <> trunc(n) or w not between 1 and 100000 or h not between 1 and 100000 or n not between 1 and 1000 then raise exception 'Invalid zone'; end if;
    if coalesce(z->>'kind','') not in ('balcon','ventana','logia','terraza','otra') or length(coalesce(z->>'description','')) > 200 or length(coalesce(z->>'notes','')) > 500 then raise exception 'Invalid zone text'; end if;
    area_mm2 = area_mm2 + w*h*n; linear_mm = linear_mm + (w+h)*n;
    zones = zones || jsonb_build_array(jsonb_build_object('kind',z->>'kind','description',coalesce(z->>'description',''),'width_mm',w,'height_mm',h,'quantity',n,'area_milli_m2',round(w*h*n/1000),'linear_mm',(w+h)*n,'notes',coalesce(z->>'notes','')));
  end loop;
  area_milli = round(area_mm2/1000);
  area_label = trunc(area_milli/1000)::text || ',' || lpad((area_milli % 1000)::text,3,'0');

  if mode in ('rate','custom_rate') then
    select * into rule from public.pricing_rules where id=(p->'pricing'->>'rule_id')::uuid and active for share;
    if not found or rule.unit not in ('m2','ml') then raise exception 'Rate unavailable'; end if;
    if rule.service_id is not null and not exists(select 1 from public.services where id=rule.service_id and active) then raise exception 'Service inactive'; end if;
    measure = rule.unit; unit_price = rule.unit_price;
    if mode = 'custom_rate' then
      if not super then raise exception 'Exceptional rate requires SUPERADMIN'; end if;
      unit_price = (p->'pricing'->>'unit_price')::numeric;
      if unit_price is null or unit_price <> trunc(unit_price) or unit_price not between 1 and 10000000 or length(coalesce(trim(p->'pricing'->>'reason'),'')) not between 5 and 300 then raise exception 'Exceptional rate and reason required'; end if;
    end if;
    main = greatest(case when rule.unit = 'ml' then round(unit_price*linear_mm/1000) else round(unit_price*area_mm2/1000000) end, rule.min_price);
    surcharge = round(main*rule.surcharge_bps/10000);
    max_discount = rule.max_discount_bps;
    pricing = jsonb_build_object('mode',mode,'rule_id',rule.id,'rule_name',rule.name,'unit',rule.unit,'unit_price',unit_price,'base_unit_price',rule.unit_price,'reason',case when mode='custom_rate' then trim(p->'pricing'->>'reason') end,'entered_by',case when mode='custom_rate' then auth.uid() end,'min_price',rule.min_price,'surcharge_bps',rule.surcharge_bps,
      'min_applied',(case when rule.unit = 'ml' then round(unit_price*linear_mm/1000) else round(unit_price*area_mm2/1000000) end) < rule.min_price);
  elsif mode = 'manual' then
    if not super then raise exception 'Manual value requires SUPERADMIN'; end if;
    main = (p->'pricing'->>'manual_net')::numeric; measure = 'manual';
    if main is null or main <> trunc(main) or main not between 1 and 2147483647 or length(coalesce(trim(p->'pricing'->>'manual_source'),'')) not between 5 and 300 then raise exception 'Manual value and source required'; end if;
    pricing = jsonb_build_object('mode','manual','manual_net',main,'manual_source',trim(p->'pricing'->>'manual_source'),'entered_by',auth.uid());
  else raise exception 'Invalid pricing mode'; end if;

  for e in select * from jsonb_array_elements(coalesce(p->'extras','[]'::jsonb)) loop
    if coalesce(e->>'kind','') not in ('adicional','lateral','recargo','pilar') or length(coalesce(trim(e->>'description'),'')) not between 2 and 200 then raise exception 'Invalid extra'; end if;
    if e ? 'rule_id' and nullif(e->>'rule_id','') is not null then
      select * into xr from public.pricing_rules where id=(e->>'rule_id')::uuid and active for share;
      if not found or xr.unit in ('m2','ml') then raise exception 'Extra rate unavailable'; end if;
      qty = (e->>'quantity_milli')::numeric;
      if qty is null or qty <> trunc(qty) or qty not between 1 and 1000000 or (e->>'kind' = 'pilar' and qty % 1000 <> 0) then raise exception 'Invalid extra quantity'; end if;
      amount = greatest(round(xr.unit_price::numeric*qty/1000), xr.min_price); amount = amount + round(amount*xr.surcharge_bps/10000);
      max_discount = least(max_discount, xr.max_discount_bps);
      extras_json = extras_json || jsonb_build_array(jsonb_build_object('kind',e->>'kind','description',trim(e->>'description'),'rule_id',xr.id,'rule_name',xr.name,'quantity_milli',qty,'unit_price',xr.unit_price,'amount',amount,'source','tarifario'));
    else
      if not super then raise exception 'Manual extras require SUPERADMIN'; end if;
      amount = (e->>'amount')::numeric;
      if amount is null or amount <> trunc(amount) or amount not between 1 and 2147483647 or length(coalesce(trim(e->>'source'),'')) not between 3 and 200 then raise exception 'Manual extra requires amount and source'; end if;
      extras_json = extras_json || jsonb_build_array(jsonb_build_object('kind',e->>'kind','description',trim(e->>'description'),'amount',amount,'source',trim(e->>'source')));
    end if;
    extras = extras + amount;
  end loop;

  main_label = p->>'service' || ' · ' || case when measure = 'ml' then trunc(linear_mm/1000)::text || ',' || lpad((linear_mm % 1000)::text,3,'0') || ' m lineales' else area_label || ' m²' end;
  if not super and disc > max_discount then raise exception 'Discount exceeds authorized limit'; end if;
  subtotal = main + surcharge + extras; discount = round(subtotal*disc/10000); net = subtotal - discount; tax = round(net*tax_rate/10000);
  if subtotal > 2147483647 or net + tax > 2147483647 or net + tax <= 0 then raise exception 'Invalid quote total'; end if;

  if p_quote_id is null then
    insert into public.quotes(contact_id,lead_id,appointment_id,tax_bps,valid_until,payment_terms,warranty,created_by) values(p_contact_id,p_lead_id,appt,tax_rate,(now() at time zone 'America/Santiago')::date+days,cfg->>'payment_terms',nullif(cfg->>'warranty',''),auth.uid()) returning * into q;
    qid = q.id; ver = 1;
  else
    select * into strict q from public.quotes where id=p_quote_id for update;
    if q.status not in ('draft','sent') or p_expected_version is distinct from q.current_version then raise exception 'Quote changed or cannot be edited'; end if;
    if q.contact_id <> p_contact_id then raise exception 'A saved quote cannot change contact'; end if;
    qid = q.id; ver = q.current_version + 1;
  end if;

  insert into public.quote_items(quote_id,version,rule_id,description,unit,quantity_milli,unit_price,min_price,surcharge_bps,line_total,material,location)
    values(qid,ver,case when mode in ('rate','custom_rate') then rule.id end,left(main_label,500),'fixed',1000,main::integer,
      case when mode in ('rate','custom_rate') then rule.min_price else 0 end,case when mode in ('rate','custom_rate') then rule.surcharge_bps else 0 end,(main+surcharge)::integer,nullif(left(coalesce(p->>'mesh_type',''),160),''),nullif(left(coalesce(p->>'work_address',''),240),''));
  for e in select * from jsonb_array_elements(extras_json) loop
    insert into public.quote_items(quote_id,version,rule_id,description,unit,quantity_milli,unit_price,min_price,surcharge_bps,line_total)
      values(qid,ver,nullif(e->>'rule_id','')::uuid,left(e->>'description',500),'fixed',1000,(e->>'amount')::integer,0,0,(e->>'amount')::integer);
  end loop;

  update public.quotes set lead_id=p_lead_id,appointment_id=coalesce(appt,appointment_id),status='draft',current_version=ver,subtotal=subtotal::integer,discount_bps=disc,discount_amount=discount::integer,net=net::integer,tax_bps=tax_rate,tax=tax::integer,total=(net+tax)::integer,
    valid_until=(now() at time zone 'America/Santiago')::date+days,notes=nullif(p->>'notes',''),payment_terms=cfg->>'payment_terms',warranty=nullif(cfg->>'warranty',''),sent_at=null,accepted_at=null,
    details=jsonb_build_object('kind','quick','service',p->>'service','mesh_type',coalesce(p->>'mesh_type',''),'features',coalesce(p->'features','[]'::jsonb),'work_address',coalesce(p->>'work_address',''),
      'zones',zones,'area_milli_m2',area_milli,'linear_mm',linear_mm,'measure',measure,'definitive',definitive,'pricing',pricing,'main_amount',main,'surcharge_amount',surcharge,'extras',extras_json,'tax_treatment',tax_treatment,'apply_tax',apply_tax)
    where id=qid returning * into q;
  select coalesce(jsonb_agg(to_jsonb(i) order by i.id),'[]'::jsonb) into items_snapshot from public.quote_items i where quote_id=qid and version=ver;
  insert into public.quote_versions(quote_id,version,snapshot,created_by) values(qid,ver,jsonb_build_object('quote',to_jsonb(q),'items',items_snapshot,'contact',contact_snapshot,'company',cfg->'company','created_at',now()),auth.uid());
  return qid;
end $$;

commit;
