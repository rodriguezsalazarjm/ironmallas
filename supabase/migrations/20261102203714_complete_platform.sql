-- Extension of Fase 2A. No prices, company tax settings or testimonials are invented.
begin;
alter table public.contacts alter column phone drop not null;
alter table public.contacts add column whatsapp text check (length(whatsapp)<=30), add column unit text check(length(unit)<=80), add column region text check(length(region)<=120), add column location_url text check(length(location_url)<=1000), add column latitude numeric check(latitude between -90 and 90), add column longitude numeric check(longitude between -180 and 180), add column notes text check(length(notes)<=10000), add column source text not null default 'manual', add column first_contact_at timestamptz not null default now(), add column consent boolean not null default false, add column consent_at timestamptz, add column updated_at timestamptz not null default now();
alter table public.contacts add constraint contacts_consent_date check (not consent or consent_at is not null);
alter table public.leads add column assigned_to uuid references public.profiles(id);
create index leads_assigned_idx on public.leads(assigned_to);
create index contacts_name_idx on public.contacts(lower(name));
create index contacts_phone_idx on public.contacts(phone);
create index contacts_email_idx on public.contacts(email);
create index contacts_commune_idx on public.contacts(commune);
alter table public.lead_activities alter column responsible_id drop not null;
alter table public.lead_activities drop constraint lead_activities_type_check;
alter table public.lead_activities add constraint lead_activities_type_check check(type in ('note','call','whatsapp','email','status_change','created'));
update public.lead_statuses set position=5 where key='follow_up';
update public.lead_statuses set position=6,is_final=false where key='won';
update public.lead_statuses set position=10 where key='lost';
insert into public.lead_statuses(key,name,position,is_final) values ('evaluation','Evaluación pendiente',2,false),('visit_scheduled','Visita agendada',3,false),('quoted','Cotizado',4,false),('installation_scheduled','Instalación programada',7,false),('installed','Instalado',8,false),('closed','Cerrado',9,true),('rejected','Rechazado',11,true),('cancelled','Cancelado',12,true) on conflict(key) do nothing;

create table public.tasks(id uuid primary key default gen_random_uuid(),contact_id uuid not null references public.contacts(id),lead_id uuid references public.leads(id),title text not null check(length(title) between 1 and 200),due_at timestamptz not null,status text not null default 'pending' check(status in ('pending','completed','cancelled')),assigned_to uuid references public.profiles(id),notes text check(length(notes)<=5000),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),completed_at timestamptz,updated_at timestamptz not null default now());
create table public.appointments(id uuid primary key default gen_random_uuid(),contact_id uuid not null references public.contacts(id),lead_id uuid references public.leads(id),kind text not null check(kind in ('visit','evaluation','installation')),service text not null check(length(service) between 1 and 160),starts_at timestamptz not null,ends_at timestamptz not null,address text not null check(length(address)<=240),commune text not null check(length(commune)<=60),technician_id uuid references public.profiles(id),status text not null default 'scheduled' check(status in ('scheduled','rescheduled','completed','cancelled')),notes text check(length(notes)<=5000),result text check(length(result)<=5000),cal_booking_uid text unique,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at>starts_at),check(ends_at<=starts_at+interval '7 days'));
create table public.services(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 160),description text not null default '' check(length(description)<=3000),unit text not null check(unit in ('m2','unit','hour','fixed')),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.pricing_rules(id uuid primary key default gen_random_uuid(),service_id uuid references public.services(id),name text not null check(length(name) between 1 and 160),unit text not null check(unit in ('m2','unit','hour','fixed')),material text check(length(material)<=160),unit_price integer not null check(unit_price>0),min_price integer not null default 0 check(min_price>=0),surcharge_bps integer not null default 0 check(surcharge_bps between 0 and 100000),max_discount_bps integer not null default 0 check(max_discount_bps between 0 and 10000),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.settings(key text primary key check(length(key) between 1 and 80),value jsonb not null default '{}' check(jsonb_typeof(value)='object'),updated_by uuid references public.profiles(id),updated_at timestamptz not null default now());
create table public.quotes(id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,contact_id uuid not null references public.contacts(id),lead_id uuid references public.leads(id),status text not null default 'draft' check(status in ('draft','sent','accepted','rejected','expired')),current_version integer not null default 0 check(current_version>=0),subtotal integer not null default 0 check(subtotal>=0),discount_bps integer not null default 0 check(discount_bps between 0 and 10000),discount_amount integer not null default 0 check(discount_amount>=0),net integer not null default 0 check(net>=0),tax_bps integer not null check(tax_bps between 0 and 10000),tax integer not null default 0 check(tax>=0),total integer not null default 0 check(total>=0),valid_until date not null,notes text check(length(notes)<=5000),payment_terms text not null,warranty text,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),sent_at timestamptz,accepted_at timestamptz);
create table public.quote_items(id uuid primary key default gen_random_uuid(),quote_id uuid not null references public.quotes(id),version integer not null check(version>0),rule_id uuid references public.pricing_rules(id),description text not null check(length(description) between 1 and 500),unit text not null check(unit in ('m2','unit','hour','fixed')),width_mm integer,height_mm integer,quantity_milli integer not null check(quantity_milli between 1 and 1000000000),unit_price integer not null,min_price integer not null,surcharge_bps integer not null,line_total integer not null check(line_total>=0),material text,location text check(length(location)<=240),check(unit<>'m2' or (width_mm between 1 and 10000000 and height_mm between 1 and 10000000)));
create table public.quote_versions(id uuid primary key default gen_random_uuid(),quote_id uuid not null references public.quotes(id),version integer not null check(version>0),snapshot jsonb not null,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),unique(quote_id,version));
create table public.installations(id uuid primary key default gen_random_uuid(),contact_id uuid not null references public.contacts(id),quote_id uuid not null unique references public.quotes(id),lead_id uuid references public.leads(id),appointment_id uuid references public.appointments(id),service text not null,address text not null check(length(address) between 1 and 240),commune text not null check(length(commune) between 1 and 60),scheduled_at timestamptz,completed_at timestamptz,technician_id uuid references public.profiles(id),status text not null default 'pending' check(status in ('pending','scheduled','in_progress','completed','cancelled','rescheduled')),notes text check(length(notes)<=10000),technical_data jsonb not null default '{}' check(jsonb_typeof(technical_data)='object'),approved_amount integer not null check(approved_amount>0),payment_status text not null default 'unpaid' check(payment_status in ('unpaid','partial','paid')),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.installation_photos(id uuid primary key default gen_random_uuid(),installation_id uuid not null references public.installations(id),path text not null unique check(path ~ '^installations/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$'),stage text not null check(stage in ('before','during','after','detail','incident')),caption text check(length(caption)<=500),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),check(split_part(path,'/',2)=installation_id::text));
create table public.warranties(id uuid primary key default gen_random_uuid(),installation_id uuid not null unique references public.installations(id),starts_on date not null,duration_months integer not null check(duration_months between 1 and 240),terms text not null check(length(terms) between 1 and 10000),status text not null default 'active' check(status in ('active','expired','claimed','void')),notes text check(length(notes)<=5000),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.payments(id uuid primary key default gen_random_uuid(),installation_id uuid not null references public.installations(id),amount integer not null check(amount>0),method text not null check(length(method) between 1 and 80),reference text check(length(reference)<=200),paid_at timestamptz not null,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
create table public.reviews(id uuid primary key default gen_random_uuid(),contact_id uuid references public.contacts(id),display_name text not null check(length(display_name) between 1 and 100),rating integer not null check(rating between 1 and 5),original_text text not null check(length(original_text) between 1 and 3000),presentation_text text check(length(presentation_text)<=3000),photo_paths text[] not null default '{}',publication_consent boolean not null default false,image_consent boolean not null default false,published boolean not null default false,featured boolean not null default false,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(not published or publication_consent),check(cardinality(photo_paths)=0 or image_consent));
create table public.content_entries(key text primary key check(length(key) between 1 and 100),title text check(length(title)<=200),data jsonb not null,published boolean not null default false,created_by uuid references public.profiles(id),updated_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),kind text not null,recipient text,subject text not null,body text not null,payload jsonb not null default '{}',status text not null default 'pending' check(status in ('pending','sent','failed')),attempts integer not null default 0 check(attempts>=0),last_error text,created_at timestamptz not null default now(),sent_at timestamptz);
create table public.audit_logs(id bigint generated always as identity primary key,actor_id uuid references public.profiles(id),entity text not null,entity_id text not null,action text not null,changes jsonb not null default '{}',created_at timestamptz not null default now());
create table public.webhook_events(id uuid primary key default gen_random_uuid(),provider text not null,event_key text not null,event_type text not null,payload jsonb not null,created_at timestamptz not null default now(),processed_at timestamptz,unique(provider,event_key));
create table public.privacy_requests(id uuid primary key default gen_random_uuid(),contact_id uuid not null references public.contacts(id),type text not null check(type in ('correction','deletion','export')),status text not null default 'pending' check(status in ('pending','reviewed','completed','rejected')),reason text not null check(length(reason) between 1 and 3000),resolution text check(length(resolution)<=5000),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());

-- Foreign-key and operational search indexes.
create index tasks_contact_idx on public.tasks(contact_id); create index tasks_lead_idx on public.tasks(lead_id); create index tasks_assigned_due_idx on public.tasks(assigned_to,due_at) where status='pending'; create index tasks_created_by_idx on public.tasks(created_by);
create index appointments_contact_idx on public.appointments(contact_id); create index appointments_lead_idx on public.appointments(lead_id); create index appointments_technician_idx on public.appointments(technician_id); create index appointments_starts_idx on public.appointments(starts_at); create index appointments_created_by_idx on public.appointments(created_by);
create index pricing_rules_service_idx on public.pricing_rules(service_id); create index settings_updated_by_idx on public.settings(updated_by);
create index quotes_contact_idx on public.quotes(contact_id); create index quotes_lead_idx on public.quotes(lead_id); create index quotes_status_created_idx on public.quotes(status,created_at); create index quotes_created_by_idx on public.quotes(created_by); create index quote_items_quote_version_idx on public.quote_items(quote_id,version); create index quote_items_rule_idx on public.quote_items(rule_id); create index quote_versions_created_by_idx on public.quote_versions(created_by);
create index installations_contact_idx on public.installations(contact_id); create index installations_lead_idx on public.installations(lead_id); create index installations_appointment_idx on public.installations(appointment_id); create index installations_technician_idx on public.installations(technician_id); create index installations_scheduled_idx on public.installations(status,scheduled_at); create index installations_created_by_idx on public.installations(created_by);
create index photos_installation_idx on public.installation_photos(installation_id); create index photos_created_by_idx on public.installation_photos(created_by); create index warranties_created_by_idx on public.warranties(created_by); create index payments_installation_idx on public.payments(installation_id); create index payments_paid_idx on public.payments(paid_at); create index payments_created_by_idx on public.payments(created_by);
create index reviews_contact_idx on public.reviews(contact_id); create index reviews_created_by_idx on public.reviews(created_by); create index content_created_by_idx on public.content_entries(created_by); create index content_updated_by_idx on public.content_entries(updated_by); create index audit_actor_idx on public.audit_logs(actor_id); create index audit_entity_idx on public.audit_logs(entity,entity_id,created_at desc); create index privacy_contact_idx on public.privacy_requests(contact_id); create index privacy_created_by_idx on public.privacy_requests(created_by); create index notifications_status_idx on public.notifications(status,created_at);
create index webhook_booking_uid_idx on public.webhook_events(provider,(payload->>'uid'));
create index webhook_old_uid_idx on public.webhook_events(provider,(payload->>'old_uid')) where event_type='BOOKING_RESCHEDULED';

-- Apply explicit grants and policies; authenticated is not authorization on its own.
do $$ declare t text; begin
  foreach t in array array['tasks','appointments','services','pricing_rules','settings','quotes','quote_items','quote_versions','installations','installation_photos','warranties','payments','reviews','content_entries','notifications','audit_logs','webhook_events','privacy_requests'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_admin()))',t||'_admin_read',t);
  end loop;
  foreach t in array array['tasks','appointments','installation_photos','warranties','reviews','content_entries','privacy_requests'] loop
    execute format('grant insert,update on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',t||'_admin_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t||'_admin_update',t);
  end loop;
  foreach t in array array['services','pricing_rules','settings'] loop
    execute format('grant insert,update on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin(true)))',t||'_super_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin(true))) with check ((select private.is_admin(true)))',t||'_super_update',t);
  end loop;
end $$;
grant select on public.reviews,public.content_entries to anon;
create policy reviews_public_read on public.reviews for select to anon using(published and publication_consent);
create policy content_public_read on public.content_entries for select to anon using(published);
-- Only safe public review columns: contact references and private original submissions are never public.
revoke select on public.reviews from anon;
grant select(id,display_name,rating,presentation_text,photo_paths,published,featured,publication_consent,image_consent,created_at) on public.reviews to anon;
revoke select on public.content_entries from anon;
grant select(key,title,data,published,created_at,updated_at) on public.content_entries to anon;

create function private.touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
revoke all on function private.touch_updated() from public,anon,authenticated;
create function private.redact_audit(value jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
  if jsonb_typeof(value)='object' then
    select coalesce(jsonb_object_agg(e.key,case when e.key ~* '(password|secret|token|api[_-]?key|authorization|cookie)' then to_jsonb('[REDACTED]'::text) else private.redact_audit(e.value) end),'{}'::jsonb) into result from jsonb_each(value) e;
    return result;
  elsif jsonb_typeof(value)='array' then
    select coalesce(jsonb_agg(private.redact_audit(e.value)),'[]'::jsonb) into result from jsonb_array_elements(value) e;
    return result;
  end if;
  return value;
end $$;
revoke all on function private.redact_audit(jsonb) from public,anon,authenticated;
create function private.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
declare old_json jsonb; new_json jsonb; actor uuid;
begin
  if tg_op <> 'INSERT' then old_json=private.redact_audit(to_jsonb(old)); end if;
  if tg_op <> 'DELETE' then new_json=private.redact_audit(to_jsonb(new)); end if;
  select id into actor from public.profiles where id=auth.uid();
  insert into public.audit_logs(actor_id,entity,entity_id,action,changes) values(actor,tg_table_name,coalesce(new_json->>'id',new_json->>'key',old_json->>'id',old_json->>'key',''),lower(tg_op),jsonb_build_object('before',old_json,'after',new_json));
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.audit_row() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['contacts','tasks','appointments','services','pricing_rules','settings','quotes','installations','warranties','reviews','content_entries','privacy_requests'] loop
    execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated()',t);
  end loop;
  foreach t in array array['profiles','contacts','leads','lead_activities','tasks','appointments','services','pricing_rules','settings','quotes','quote_versions','installations','installation_photos','warranties','payments','reviews','content_entries','privacy_requests'] loop
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function private.audit_row()',t);
  end loop;
end $$;

-- Relation integrity for cross-entity IDs; do not trust an unrelated lead supplied by an API caller.
create function private.check_contact_relation() returns trigger language plpgsql set search_path='' as $$
begin
  if new.lead_id is not null and not exists(select 1 from public.leads where id=new.lead_id and contact_id=new.contact_id) then raise exception 'Lead does not belong to contact'; end if;
  return new;
end $$;
revoke all on function private.check_contact_relation() from public,anon,authenticated;
create trigger task_contact_relation before insert or update on public.tasks for each row execute function private.check_contact_relation();
create trigger appointment_contact_relation before insert or update on public.appointments for each row execute function private.check_contact_relation();
create trigger quote_contact_relation before insert or update on public.quotes for each row execute function private.check_contact_relation();

-- Finance is writable only through checked transactions. Public wrappers are SECURITY INVOKER;
-- private definer implementations enforce live authorization before touching restricted tables.
create function private.save_quote(p_contact_id uuid,p_lead_id uuid,p_quote_id uuid,p_items jsonb,p_discount_bps integer,p_notes text,p_expected_version integer) returns uuid language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg jsonb; rule public.pricing_rules%rowtype; q public.quotes%rowtype; item jsonb; qid uuid; ver integer; qty integer; w integer; h integer; line numeric; subtotal numeric=0; discount numeric; net numeric; tax numeric; tax_rate integer; days integer; max_discount integer=10000; items_snapshot jsonb; contact_snapshot jsonb;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  if p_discount_bps is null or p_discount_bps not between 0 and 10000 or length(coalesce(p_notes,''))>5000 then raise exception 'Invalid discount or note'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'At least one configured pricing rule is required'; end if;
  select value into cfg from public.settings where key='commercial';
  if cfg is null or cfg->>'tax_bps' is null or cfg->>'validity_days' is null or length(coalesce(cfg->>'payment_terms',''))=0 or length(coalesce(cfg->'company'->>'name',''))=0 then raise exception 'Commercial settings are not configured'; end if;
  tax_rate=(cfg->>'tax_bps')::integer; days=(cfg->>'validity_days')::integer;
  if tax_rate not between 0 and 10000 or days not between 1 and 365 then raise exception 'Invalid commercial settings'; end if;
  select to_jsonb(c) into contact_snapshot from public.contacts c where id=p_contact_id;
  if contact_snapshot is null then raise exception 'Contact unavailable'; end if;
  if p_quote_id is null then
    insert into public.quotes(contact_id,lead_id,tax_bps,valid_until,payment_terms,warranty,created_by) values(p_contact_id,p_lead_id,tax_rate,(now() at time zone 'America/Santiago')::date+days,cfg->>'payment_terms',nullif(cfg->>'warranty',''),auth.uid()) returning * into q;
    qid=q.id; ver=1;
  else
    select * into strict q from public.quotes where id=p_quote_id for update;
    if q.status not in ('draft','sent') or p_expected_version is distinct from q.current_version then raise exception 'Quote changed or cannot be edited'; end if;
    if q.contact_id<>p_contact_id then raise exception 'A saved quote cannot change contact'; end if;
    qid=q.id; ver=q.current_version+1;
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into strict rule from public.pricing_rules where id=(item->>'rule_id')::uuid and active for share;
    if rule.service_id is not null and not exists(select 1 from public.services where id=rule.service_id and active) then raise exception 'Service inactive'; end if;
    qty=(item->>'quantity_milli')::integer; w=nullif(item->>'width_mm','')::integer; h=nullif(item->>'height_mm','')::integer;
    if qty is null or qty not between 1 and 1000000000 then raise exception 'Invalid quantity'; end if;
    if rule.unit='m2' then
      if w is null or h is null or w not between 1 and 10000000 or h not between 1 and 10000000 then raise exception 'Invalid dimensions'; end if;
      line=round(rule.unit_price::numeric*w*h*qty/1000000000);
    else line=round(rule.unit_price::numeric*qty/1000); end if;
    line=greatest(line,rule.min_price); line=line+round(line*rule.surcharge_bps/10000);
    if line>2147483647 then raise exception 'Amount exceeds CLP integer limit'; end if;
    max_discount=least(max_discount,rule.max_discount_bps); subtotal=subtotal+line;
    insert into public.quote_items(quote_id,version,rule_id,description,unit,width_mm,height_mm,quantity_milli,unit_price,min_price,surcharge_bps,line_total,material,location)
    values(qid,ver,rule.id,coalesce(nullif(item->>'description',''),rule.name),rule.unit,w,h,qty,rule.unit_price,rule.min_price,rule.surcharge_bps,line::integer,rule.material,nullif(item->>'location',''));
  end loop;
  if not private.is_admin(true) and p_discount_bps>max_discount then raise exception 'Discount exceeds authorized limit'; end if;
  discount=round(subtotal*p_discount_bps/10000); net=subtotal-discount; tax=round(net*tax_rate/10000);
  if subtotal>2147483647 or net+tax>2147483647 or net+tax<=0 then raise exception 'Invalid quote total'; end if;
  update public.quotes set lead_id=p_lead_id,status='draft',current_version=ver,subtotal=subtotal::integer,discount_bps=p_discount_bps,discount_amount=discount::integer,net=net::integer,tax_bps=tax_rate,tax=tax::integer,total=(net+tax)::integer,valid_until=(now() at time zone 'America/Santiago')::date+days,notes=nullif(p_notes,''),payment_terms=cfg->>'payment_terms',warranty=nullif(cfg->>'warranty',''),sent_at=null,accepted_at=null where id=qid returning * into q;
  select coalesce(jsonb_agg(to_jsonb(i) order by i.id),'[]'::jsonb) into items_snapshot from public.quote_items i where quote_id=qid and version=ver;
  insert into public.quote_versions(quote_id,version,snapshot,created_by) values(qid,ver,jsonb_build_object('quote',to_jsonb(q),'items',items_snapshot,'contact',contact_snapshot,'company',cfg->'company','created_at',now()),auth.uid());
  return qid;
end $$;
revoke all on function private.save_quote(uuid,uuid,uuid,jsonb,integer,text,integer) from public,anon;
grant execute on function private.save_quote(uuid,uuid,uuid,jsonb,integer,text,integer) to authenticated;
create function public.save_quote(p_contact_id uuid,p_lead_id uuid,p_quote_id uuid,p_items jsonb,p_discount_bps integer,p_notes text,p_expected_version integer) returns uuid language sql security invoker set search_path='' as $$select private.save_quote(p_contact_id,p_lead_id,p_quote_id,p_items,p_discount_bps,p_notes,p_expected_version)$$;
revoke all on function public.save_quote(uuid,uuid,uuid,jsonb,integer,text,integer) from public,anon; grant execute on function public.save_quote(uuid,uuid,uuid,jsonb,integer,text,integer) to authenticated;

create function private.set_quote_status(p_quote_id uuid,p_status text,p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare q public.quotes%rowtype;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  select * into strict q from public.quotes where id=p_quote_id for update;
  if q.current_version<>p_expected_version then raise exception 'Quote changed'; end if;
  if p_status not in ('draft','sent','accepted','rejected','expired') then raise exception 'Invalid quote status'; end if;
  if q.status in ('accepted','rejected','expired') and p_status<>q.status then raise exception 'Final quote cannot change'; end if;
  if p_status='accepted' and (q.status<>'sent' or q.valid_until<(now() at time zone 'America/Santiago')::date) then raise exception 'Only an unexpired sent quote can be accepted'; end if;
  if p_status='sent' and (q.current_version=0 or q.total<=0 or q.valid_until<(now() at time zone 'America/Santiago')::date) then raise exception 'Quote cannot be sent'; end if;
  update public.quotes set status=p_status,sent_at=case when p_status='sent' then now() else sent_at end,accepted_at=case when p_status='accepted' then now() else accepted_at end where id=q.id;
  if p_status='accepted' then update public.contacts set is_client=true where id=q.contact_id; end if;
end $$;
revoke all on function private.set_quote_status(uuid,text,integer) from public,anon; grant execute on function private.set_quote_status(uuid,text,integer) to authenticated;
create function public.set_quote_status(p_quote_id uuid,p_status text,p_expected_version integer) returns void language sql security invoker set search_path='' as $$select private.set_quote_status(p_quote_id,p_status,p_expected_version)$$;
revoke all on function public.set_quote_status(uuid,text,integer) from public,anon; grant execute on function public.set_quote_status(uuid,text,integer) to authenticated;

create function private.create_installation(p_quote_id uuid,p_scheduled_at timestamptz,p_technician_id uuid,p_address text,p_commune text,p_technical_data jsonb,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.quotes%rowtype; result uuid; services_text text;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  select * into strict q from public.quotes where id=p_quote_id for update;
  if q.status<>'accepted' then raise exception 'Quote must be accepted'; end if;
  if p_technician_id is not null and not exists(select 1 from public.profiles where id=p_technician_id and active) then raise exception 'Technician unavailable'; end if;
  select string_agg(description,', ' order by id) into services_text from public.quote_items where quote_id=q.id and version=q.current_version;
  insert into public.installations(contact_id,quote_id,lead_id,service,address,commune,scheduled_at,technician_id,status,notes,technical_data,approved_amount,created_by)
  values(q.contact_id,q.id,q.lead_id,left(services_text,1000),p_address,p_commune,p_scheduled_at,p_technician_id,case when p_scheduled_at is null then 'pending' else 'scheduled' end,p_notes,p_technical_data,q.total,auth.uid()) returning id into result;
  return result;
end $$;
revoke all on function private.create_installation(uuid,timestamptz,uuid,text,text,jsonb,text) from public,anon; grant execute on function private.create_installation(uuid,timestamptz,uuid,text,text,jsonb,text) to authenticated;
create function public.create_installation(p_quote_id uuid,p_scheduled_at timestamptz,p_technician_id uuid,p_address text,p_commune text,p_technical_data jsonb,p_notes text) returns uuid language sql security invoker set search_path='' as $$select private.create_installation(p_quote_id,p_scheduled_at,p_technician_id,p_address,p_commune,p_technical_data,p_notes)$$;
revoke all on function public.create_installation(uuid,timestamptz,uuid,text,text,jsonb,text) from public,anon; grant execute on function public.create_installation(uuid,timestamptz,uuid,text,text,jsonb,text) to authenticated;

create function private.set_installation_status(p_id uuid,p_status text,p_notes text) returns void language plpgsql security definer set search_path='' as $$
declare old_status text;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  select status into strict old_status from public.installations where id=p_id for update;
  if old_status in ('completed','cancelled') and old_status<>p_status then raise exception 'Closed installation cannot change'; end if;
  if p_status not in ('pending','scheduled','in_progress','completed','cancelled','rescheduled') then raise exception 'Invalid status'; end if;
  update public.installations set status=p_status,notes=p_notes,completed_at=case when p_status='completed' then coalesce(completed_at,now()) else completed_at end where id=p_id;
end $$;
revoke all on function private.set_installation_status(uuid,text,text) from public,anon; grant execute on function private.set_installation_status(uuid,text,text) to authenticated;
create function public.set_installation_status(p_id uuid,p_status text,p_notes text) returns void language sql security invoker set search_path='' as $$select private.set_installation_status(p_id,p_status,p_notes)$$;
revoke all on function public.set_installation_status(uuid,text,text) from public,anon; grant execute on function public.set_installation_status(uuid,text,text) to authenticated;
-- Operational fields may be edited while immutable financial and ownership fields remain restricted.
grant update(address,commune,scheduled_at,technician_id,technical_data,appointment_id) on public.installations to authenticated;
create policy installations_operational_update on public.installations for update to authenticated using ((select private.is_admin()) and status not in ('completed','cancelled')) with check ((select private.is_admin()));

create function private.record_payment(p_installation_id uuid,p_amount integer,p_method text,p_reference text,p_paid_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare expected integer; received bigint; result uuid;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  select approved_amount into strict expected from public.installations where id=p_installation_id and status<>'cancelled' for update;
  select coalesce(sum(amount),0) into received from public.payments where installation_id=p_installation_id;
  if p_amount is null or p_amount<=0 or received+p_amount>expected then raise exception 'Payment exceeds outstanding amount'; end if;
  insert into public.payments(installation_id,amount,method,reference,paid_at,created_by) values(p_installation_id,p_amount,p_method,p_reference,p_paid_at,auth.uid()) returning id into result;
  update public.installations set payment_status=case when received+p_amount=expected then 'paid' else 'partial' end where id=p_installation_id;
  return result;
end $$;
revoke all on function private.record_payment(uuid,integer,text,text,timestamptz) from public,anon; grant execute on function private.record_payment(uuid,integer,text,text,timestamptz) to authenticated;
create function public.record_payment(p_installation_id uuid,p_amount integer,p_method text,p_reference text,p_paid_at timestamptz) returns uuid language sql security invoker set search_path='' as $$select private.record_payment(p_installation_id,p_amount,p_method,p_reference,p_paid_at)$$;
revoke all on function public.record_payment(uuid,integer,text,text,timestamptz) from public,anon; grant execute on function public.record_payment(uuid,integer,text,text,timestamptz) to authenticated;

create function private.manage_profile(p_user_id uuid,p_full_name text,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin(true) then raise exception 'Forbidden'; end if;
  -- Serialize all role changes so concurrent requests cannot remove the final active SUPERADMIN.
  perform pg_advisory_xact_lock(43891922);
  if not private.is_admin(true) then raise exception 'Forbidden'; end if;
  if p_user_id=auth.uid() then raise exception 'Self role/status changes are not permitted'; end if;
  if exists(select 1 from public.profiles where id=p_user_id and role='SUPERADMIN' and active) and (p_role<>'SUPERADMIN' or not p_active) and (select count(*) from public.profiles where role='SUPERADMIN' and active)<=1 then raise exception 'Last SUPERADMIN cannot be removed'; end if;
  insert into public.profiles(id,full_name,role,active) values(p_user_id,p_full_name,p_role,p_active) on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,active=excluded.active;
end $$;
revoke all on function private.manage_profile(uuid,text,text,boolean) from public,anon; grant execute on function private.manage_profile(uuid,text,text,boolean) to authenticated;
create function public.manage_profile(p_user_id uuid,p_full_name text,p_role text,p_active boolean) returns void language sql security invoker set search_path='' as $$select private.manage_profile(p_user_id,p_full_name,p_role,p_active)$$;
revoke all on function public.manage_profile(uuid,text,text,boolean) from public,anon; grant execute on function public.manage_profile(uuid,text,text,boolean) to authenticated;

create unique index contacts_email_phone_normalized_idx on public.contacts(email,coalesce(phone,''));
grant update(notes) on public.installations to authenticated;

create function private.lead_created() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
  select id into actor from public.profiles where id=auth.uid() and active;
  insert into public.lead_activities(lead_id,type,note,responsible_id) values(new.id,'created','Oportunidad registrada desde '||new.source,actor);
  insert into public.notifications(kind,subject,body,payload) values('lead_created','Nueva oportunidad Iron Mallas','Se registró una nueva solicitud de contacto.',jsonb_build_object('lead_id',new.id));
  return new;
end $$;
revoke all on function private.lead_created() from public,anon,authenticated;
create trigger lead_created_activity after insert on public.leads for each row execute function private.lead_created();
create function private.lead_status_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; before_name text; after_name text;
begin
  if new.status_id is distinct from old.status_id then
    select id into actor from public.profiles where id=auth.uid() and active;
    select name into before_name from public.lead_statuses where id=old.status_id;
    select name into after_name from public.lead_statuses where id=new.status_id;
    insert into public.lead_activities(lead_id,type,note,responsible_id) values(new.id,'status_change',before_name||' → '||after_name,actor);
  end if;
  return new;
end $$;
revoke all on function private.lead_status_changed() from public,anon,authenticated;
create trigger lead_status_activity after update of status_id on public.leads for each row execute function private.lead_status_changed();

create or replace function public.submit_public_lead(payload jsonb, rate_key text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare contact uuid; status uuid; result uuid; hits integer;
begin
  if payload->>'consent' is distinct from 'on' or length(rate_key) <> 64 then raise exception 'Invalid submission'; end if;
  insert into private.intake_limits as limits values(rate_key,now(),1) on conflict(key) do update set
    starts_at=case when limits.starts_at<now()-interval '10 minutes' then now() else limits.starts_at end,
    attempts=case when limits.starts_at<now()-interval '10 minutes' then 1 else limits.attempts+1 end returning attempts into hits;
  if hits>5 then return null; end if;
  delete from private.intake_limits where starts_at<now()-interval '1 day';
  select id into strict status from public.lead_statuses where key='new' and active;
  insert into public.contacts(name,phone,email,commune,source,consent,consent_at) values(payload->>'name',regexp_replace(payload->>'phone','[^0-9]','','g'),lower(trim(payload->>'email')),nullif(payload->>'commune',''),'web_form',true,now()) on conflict(email,phone) do nothing returning id into contact;
  if contact is null then select id into strict contact from public.contacts where email=lower(trim(payload->>'email')) and phone=regexp_replace(payload->>'phone','[^0-9]','','g'); end if;
  update public.contacts set consent=true,consent_at=coalesce(consent_at,now()) where id=contact;
  insert into public.leads(contact_id,service,message,status_id,tracking,consent) values(contact,payload->>'service',payload->>'message',status,coalesce(payload->'tracking','{}'),true) returning id into result;
  return result;
end $$;

-- Signature verified in the HTTP handler; service key is required, no anonymous RPC permission.
create function public.sync_cal_booking(p_event_key text,p_event_type text,p_payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
declare event_id uuid; appt uuid; contact uuid; mail text; phone text; uid text; n integer; incoming_at timestamptz;
begin
  if p_event_type not in ('BOOKING_CREATED','BOOKING_RESCHEDULED','BOOKING_CANCELLED') or length(p_event_key) not between 1 and 200 then raise exception 'Unsupported webhook'; end if;
  uid=p_payload->>'uid';
  if uid is null or length(uid) not between 1 and 200 then raise exception 'Booking UID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cal:'||uid,0));
  incoming_at=coalesce(nullif(p_payload->>'occurred_at','')::timestamptz,now());
  insert into public.webhook_events(provider,event_key,event_type,payload) values('cal',p_event_key,p_event_type,p_payload||jsonb_build_object('occurred_at',incoming_at)) on conflict(provider,event_key) do nothing returning id into event_id;
  if event_id is null then select id into appt from public.appointments where cal_booking_uid=uid; return appt; end if;
  -- Network retries may arrive out of order. A late create must not revive a cancellation
  -- or recreate the old UID of a reservation that has already been rescheduled.
  if exists(select 1 from public.webhook_events e where e.provider='cal' and e.id<>event_id and e.payload->>'uid'=uid and ((e.payload->>'occurred_at')::timestamptz>incoming_at or ((e.payload->>'occurred_at')::timestamptz=incoming_at and e.event_type='BOOKING_CANCELLED' and p_event_type<>'BOOKING_CANCELLED')))
     or (p_event_type='BOOKING_CREATED' and exists(select 1 from public.webhook_events e where e.provider='cal' and e.id<>event_id and e.event_type='BOOKING_RESCHEDULED' and e.payload->>'old_uid'=uid)) then
    select id into appt from public.appointments where cal_booking_uid=uid;
    update public.webhook_events set processed_at=now() where id=event_id;
    return appt;
  end if;
  if p_event_type='BOOKING_CANCELLED' then
    update public.appointments set status='cancelled' where cal_booking_uid=uid returning id into appt;
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
      insert into public.contacts(name,email,phone,address,commune,source) values(p_payload->'contact'->>'name',mail,phone,nullif(p_payload->'contact'->>'address',''),nullif(p_payload->'contact'->>'commune',''),'cal_booking') returning id into contact;
    end if;
    if p_payload->>'old_uid' is not null then select id into appt from public.appointments where cal_booking_uid=p_payload->>'old_uid' for update; end if;
    if appt is not null then
      update public.appointments set cal_booking_uid=uid,starts_at=(p_payload->>'starts_at')::timestamptz,ends_at=(p_payload->>'ends_at')::timestamptz,status='rescheduled' where id=appt;
    else
      insert into public.appointments(contact_id,lead_id,kind,service,starts_at,ends_at,address,commune,status,notes,cal_booking_uid)
      values(contact,nullif(p_payload->>'lead_id','')::uuid,'visit',coalesce(nullif(p_payload->>'service',''),'Visita técnica'),(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,coalesce(p_payload->'contact'->>'address',''),coalesce(p_payload->'contact'->>'commune',''),case when p_event_type='BOOKING_RESCHEDULED' then 'rescheduled' else 'scheduled' end,p_payload->>'notes',uid)
      on conflict(cal_booking_uid) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,status=excluded.status,notes=excluded.notes returning id into appt;
    end if;
  end if;
  update public.webhook_events set processed_at=now() where id=event_id;
  return appt;
end $$;
revoke all on function public.sync_cal_booking(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sync_cal_booking(text,text,jsonb) to service_role;
grant select,insert,update on public.webhook_events,public.appointments to service_role;
grant select,insert,update on public.notifications to service_role;
grant select on public.tasks to service_role;
grant select on public.settings,public.quotes,public.quote_items,public.quote_versions,public.installations,public.installation_photos,public.warranties,public.payments,public.reviews,public.content_entries,public.services,public.pricing_rules to service_role;

-- All customer installation evidence stays private. Only explicit CMS uploads use public-media.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('public-media','public-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do nothing;
create policy installation_storage_insert on storage.objects for insert to authenticated with check(bucket_id='admin-documents' and (select private.is_admin()) and name ~ '^installations/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$' and exists(select 1 from public.installations i where i.id::text=split_part(name,'/',2)));
create policy installation_storage_update on storage.objects for update to authenticated using(bucket_id='admin-documents' and (select private.is_admin()) and name ~ '^installations/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$') with check(bucket_id='admin-documents' and (select private.is_admin()) and name ~ '^installations/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$' and exists(select 1 from public.installations i where i.id::text=split_part(name,'/',2)));
create policy public_media_admin_read on storage.objects for select to authenticated using(bucket_id='public-media' and (select private.is_admin()));
create policy public_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='public-media' and (select private.is_admin()) and name ~ '^content/[0-9a-f-]{36}[.](jpg|jpeg|png|webp|mp4|webm)$');
create policy public_media_admin_update on storage.objects for update to authenticated using(bucket_id='public-media' and (select private.is_admin())) with check(bucket_id='public-media' and (select private.is_admin()) and name ~ '^content/[0-9a-f-]{36}[.](jpg|jpeg|png|webp|mp4|webm)$');
grant select,insert,update on public.profiles,public.settings,public.services,public.content_entries to service_role;
grant update(consent,consent_at) on public.contacts to service_role;
grant insert,update on public.notifications to authenticated;
create policy notifications_admin_insert on public.notifications for insert to authenticated with check((select private.is_admin()) and kind='quote_email' and status='pending' and attempts=0);
create policy notifications_admin_update on public.notifications for update to authenticated using((select private.is_admin()) and kind='quote_email') with check((select private.is_admin()) and kind='quote_email');
create trigger notifications_audit after insert or update on public.notifications for each row execute function private.audit_row();

-- Administrative metrics stay in SQL to avoid PostgREST row caps and client-side financial sums.
create function public.dashboard_metrics(p_from timestamptz,p_to timestamptz,p_now timestamptz) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  if p_from is null or p_to is null or p_now is null or p_to<=p_from then raise exception 'Invalid date range'; end if;
  return jsonb_build_object(
    'fresh_leads',(select count(*) from public.leads l join public.lead_statuses s on s.id=l.status_id where s.key='new' and l.created_at>=p_from and l.created_at<p_to),
    'pending_contact_leads',(select count(*) from public.leads l join public.lead_statuses s on s.id=l.status_id where s.key='new' and l.created_at>=p_from and l.created_at<p_to),
    'sent_quotes',(select count(*) from public.quotes where sent_at>=p_from and sent_at<p_to),
    'awaiting_quotes',(select count(*) from public.quotes where status='sent' and valid_until>=(p_now at time zone 'America/Santiago')::date and sent_at>=p_from and sent_at<p_to),
    'accepted_quotes',(select count(*) from public.quotes where status='accepted' and accepted_at>=p_from and accepted_at<p_to),
    'approved_amount',(select coalesce(sum(total),0) from public.quotes where status='accepted' and accepted_at>=p_from and accepted_at<p_to),
    'upcoming_visits',(select count(*) from public.appointments where kind in ('visit','evaluation') and status in ('scheduled','rescheduled') and starts_at>=p_now and starts_at>=p_from and starts_at<p_to),
    'scheduled_installations',(select count(*) from public.installations where status in ('scheduled','rescheduled') and scheduled_at>=p_now and scheduled_at>=p_from and scheduled_at<p_to),
    'completed_installations',(select count(*) from public.installations where status='completed' and completed_at>=p_from and completed_at<p_to),
    'income',(select coalesce(sum(amount),0) from public.payments where paid_at>=p_from and paid_at<p_to),
    'overdue_tasks',(select count(*) from public.tasks where status='pending' and due_at<p_now),
    'overdue_leads',(select count(*) from public.leads l join public.lead_statuses s on s.id=l.status_id where not s.is_final and l.next_follow_up_at<p_now)
  );
end $$;
revoke all on function public.dashboard_metrics(timestamptz,timestamptz,timestamptz) from public,anon;
grant execute on function public.dashboard_metrics(timestamptz,timestamptz,timestamptz) to authenticated;

-- Provision the first profile as a trusted operator only. No auth user is silently escalated.
create function public.bootstrap_admin_profile(p_user_id uuid,p_full_name text) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(43891922);
  if exists(select 1 from public.profiles where active and id<>p_user_id) then raise exception 'An administrator already exists'; end if;
  if exists(select 1 from public.profiles where id=p_user_id and active and role='SUPERADMIN') then return; end if;
  if exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Existing profile requires an authorized role change'; end if;
  insert into public.profiles(id,full_name,role,active) values(p_user_id,p_full_name,'SUPERADMIN',true);
end $$;
revoke all on function public.bootstrap_admin_profile(uuid,text) from public,anon,authenticated;
grant execute on function public.bootstrap_admin_profile(uuid,text) to service_role;

-- Cleanup may remove only an unregistered temporary upload, never registered customer evidence.
grant delete on storage.objects to authenticated;
create policy orphan_installation_storage_delete on storage.objects for delete to authenticated using(bucket_id='admin-documents' and (select private.is_admin()) and name ~ '^installations/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$' and not exists(select 1 from public.installation_photos p where p.path=name));

-- A scheduling edit changes operational status but never reopens a closed installation.
create function private.installation_schedule_status() returns trigger language plpgsql set search_path='' as $$
begin
  if old.status in ('completed','cancelled') then raise exception 'Closed installation cannot be rescheduled'; end if;
  if new.scheduled_at is distinct from old.scheduled_at and new.scheduled_at is not null then
    if old.status='pending' then new.status='scheduled';
    elsif old.status in ('scheduled','rescheduled') then new.status='rescheduled'; end if;
  end if;
  return new;
end $$;
revoke all on function private.installation_schedule_status() from public,anon,authenticated;
create trigger installation_schedule_status before update of scheduled_at on public.installations for each row execute function private.installation_schedule_status();

drop policy privacy_requests_admin_update on public.privacy_requests;
create policy privacy_requests_super_update on public.privacy_requests for update to authenticated using((select private.is_admin(true))) with check((select private.is_admin(true)));
-- Administrators may capture requests, but cannot pre-resolve them at insertion.
create policy privacy_requests_initial on public.privacy_requests as restrictive for insert to authenticated with check(status='pending' and resolution is null and created_by=(select auth.uid()));
-- Privacy publication is separated from routine marketing content and always requires SUPERADMIN.
create policy content_privacy_insert on public.content_entries as restrictive for insert to authenticated with check((key not in ('privacy','privacy_draft') or (select private.is_admin(true))) and (key<>'privacy_draft' or not published));
create policy content_privacy_update on public.content_entries as restrictive for update to authenticated using(key not in ('privacy','privacy_draft') or (select private.is_admin(true))) with check((key not in ('privacy','privacy_draft') or (select private.is_admin(true))) and (key<>'privacy_draft' or not published));

create unique index notifications_dedupe_key_idx on public.notifications(kind,(payload->>'dedupe_key')) where payload->>'dedupe_key' is not null;
create function private.log_contact_export(p_contact_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  if not exists(select 1 from public.contacts where id=p_contact_id) then raise exception 'Contact unavailable'; end if;
  insert into public.audit_logs(actor_id,entity,entity_id,action,changes) values(auth.uid(),'contacts',p_contact_id::text,'export',jsonb_build_object('format','json'));
end $$;
revoke all on function private.log_contact_export(uuid) from public,anon;
grant execute on function private.log_contact_export(uuid) to authenticated;
create function public.log_contact_export(p_contact_id uuid) returns void language sql security invoker set search_path='' as $$select private.log_contact_export(p_contact_id)$$;
revoke all on function public.log_contact_export(uuid) from public,anon;
grant execute on function public.log_contact_export(uuid) to authenticated;
commit;
