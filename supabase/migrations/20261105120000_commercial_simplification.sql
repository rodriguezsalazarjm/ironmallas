-- Iron Mallas 2.0 · Simplificación comercial (cotizador rápido + captación multi-fuente).
-- Migración ADITIVA: no elimina tablas, columnas ni filas. Revisar antes de aplicar en remoto.

-- 1. Contactos captados por WhatsApp o Meta pueden no tener correo.
alter table public.contacts alter column email drop not null;

-- 2. Oportunidades: fuente normalizada, idempotencia externa, atribución y próxima acción.
alter table public.leads
  add column external_id text check (length(external_id) between 1 and 200),
  add column campaign text check (length(campaign) <= 200),
  add column ad_name text check (length(ad_name) <= 200),
  add column source_confidence text not null default 'observed' check (source_confidence in ('observed','self_declared')),
  add column campaign_attribution text not null default 'none' check (campaign_attribution in ('none','observed','unconfirmed')),
  add column legal_basis text not null default 'consent' check (legal_basis in ('consent','precontractual')),
  add column next_action text check (length(next_action) <= 300);
create unique index leads_source_external_uidx on public.leads(source, external_id) where external_id is not null;
create index if not exists contacts_phone_idx on public.contacts(phone);
create index if not exists contacts_whatsapp_idx on public.contacts(whatsapp);

-- 3. Cotizaciones rápidas: zonas, servicio y procedencia del precio viajan en details (y en cada snapshot).
alter table public.quotes add column details jsonb not null default '{}' check (jsonb_typeof(details) = 'object');

-- 4. Formulario web: misma lógica previa + fuente WEB, id de envío idempotente y atribución UTM no confirmada.
create or replace function public.submit_public_lead(payload jsonb, rate_key text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare contact uuid; status uuid; result uuid; hits integer; ext text = nullif(left(payload->>'submission_id',200),''); campaign text = nullif(left(payload->'tracking'->>'utmCampaign',200),'');
begin
  if payload->>'consent' is distinct from 'on' or length(rate_key) <> 64 then raise exception 'Invalid submission'; end if;
  if ext is not null then
    select id into result from public.leads where source='WEB' and external_id=ext;
    if result is not null then return result; end if;
  end if;
  insert into private.intake_limits as limits values(rate_key,now(),1) on conflict(key) do update set
    starts_at=case when limits.starts_at<now()-interval '10 minutes' then now() else limits.starts_at end,
    attempts=case when limits.starts_at<now()-interval '10 minutes' then 1 else limits.attempts+1 end returning attempts into hits;
  if hits>5 then return null; end if;
  delete from private.intake_limits where starts_at<now()-interval '1 day';
  select id into strict status from public.lead_statuses where key='new' and active;
  insert into public.contacts(name,phone,whatsapp,email,commune,source,consent,consent_at)
    values(payload->>'name',regexp_replace(payload->>'phone','[^0-9]','','g'),regexp_replace(payload->>'phone','[^0-9]','','g'),lower(trim(payload->>'email')),nullif(payload->>'commune',''),'web_form',true,now())
    on conflict(email,phone) do nothing returning id into contact;
  if contact is null then select id into strict contact from public.contacts where email=lower(trim(payload->>'email')) and phone=regexp_replace(payload->>'phone','[^0-9]','','g'); end if;
  update public.contacts set consent=true,consent_at=coalesce(consent_at,now()) where id=contact;
  insert into public.leads(contact_id,service,message,status_id,source,tracking,consent,external_id,campaign,source_confidence,campaign_attribution,legal_basis,next_action)
    values(contact,payload->>'service',payload->>'message',status,'WEB',coalesce(payload->'tracking','{}'),true,ext,campaign,'observed',case when campaign is null then 'none' else 'unconfirmed' end,'consent','Primer contacto')
    on conflict (source, external_id) where external_id is not null do nothing returning id into result;
  if result is null then select id into strict result from public.leads where source='WEB' and external_id=ext; end if;
  return result;
end $$;
revoke all on function public.submit_public_lead(jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_public_lead(jsonb,text) to service_role;

-- 5. Entrada única para fuentes externas verificadas en el servidor (Meta Lead Ads, WhatsApp Cloud API).
create function public.ingest_external_lead(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_source text = p->>'source'; v_ext text = nullif(trim(coalesce(p->>'external_id','')),'');
  v_phone text = regexp_replace(coalesce(p->>'phone',''),'[^0-9]','','g'); v_email text = nullif(lower(trim(coalesce(p->>'email',''))),'');
  v_name text = trim(coalesce(p->>'name','')); v_campaign text = nullif(left(coalesce(p->>'campaign',''),200),'');
  v_contact uuid; v_lead uuid; v_status uuid;
begin
  if v_source is null or v_source not in ('META_LEAD_AD','META_WHATSAPP') then raise exception 'Unsupported source'; end if;
  if v_ext is null or length(v_ext) > 200 then raise exception 'External id required'; end if;
  if length(v_phone) not between 8 and 15 then v_phone = null; end if;
  if v_email is not null and (length(v_email) not between 3 and 120 or position('@' in v_email) = 0) then v_email = null; end if;
  if v_phone is null and v_email is null then raise exception 'Contact data required'; end if;
  if length(v_name) < 2 then v_name = 'Contacto ' || coalesce(right(v_phone,4),'Meta'); end if;
  select id into v_lead from public.leads where source=v_source and external_id=v_ext;
  if v_lead is not null then return jsonb_build_object('id',v_lead,'duplicate',true); end if;
  select id into strict v_status from public.lead_statuses where key='new' and active;
  if v_phone is not null then select id into v_contact from public.contacts where phone=v_phone or whatsapp=v_phone order by created_at limit 1; end if;
  if v_contact is null and v_email is not null then select id into v_contact from public.contacts where email=v_email order by created_at limit 1; end if;
  if v_contact is null then
    insert into public.contacts(name,phone,whatsapp,email,commune,source)
      values(left(v_name,80),v_phone,v_phone,v_email,nullif(left(coalesce(p->>'commune',''),60),''),lower(v_source)) returning id into v_contact;
  end if;
  insert into public.leads(contact_id,service,message,status_id,source,tracking,consent,external_id,campaign,ad_name,source_confidence,campaign_attribution,legal_basis,next_action)
    values(v_contact,left(coalesce(nullif(trim(p->>'service'),''),'Por confirmar'),160),nullif(left(coalesce(p->>'message',''),1500),''),v_status,v_source,
      case when jsonb_typeof(p->'tracking')='object' then p->'tracking' else '{}'::jsonb end,true,v_ext,v_campaign,nullif(left(coalesce(p->>'ad_name',''),200),''),
      'observed',case when v_campaign is null then 'none' else 'observed' end,
      case when p->>'legal_basis'='precontractual' then 'precontractual' else 'consent' end,'Primer contacto')
    on conflict (source, external_id) where external_id is not null do nothing returning id into v_lead;
  if v_lead is null then
    select id into strict v_lead from public.leads where source=v_source and external_id=v_ext;
    return jsonb_build_object('id',v_lead,'duplicate',true);
  end if;
  return jsonb_build_object('id',v_lead,'duplicate',false);
end $$;
revoke all on function public.ingest_external_lead(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_external_lead(jsonb) to service_role;
grant update on public.contacts to service_role;

-- 6. Cotizador rápido. Mismo redondeo que el cliente (round = mitad hacia arriba en positivos).
create function private.save_quick_quote(p_contact_id uuid,p_lead_id uuid,p_quote_id uuid,p_expected_version integer,p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg jsonb; rule public.pricing_rules%rowtype; xr public.pricing_rules%rowtype; q public.quotes%rowtype; qid uuid; ver integer; z jsonb; e jsonb;
  w numeric; h numeric; n numeric; area_mm2 numeric = 0; area_milli numeric; zones jsonb = '[]'; extras_json jsonb = '[]';
  main numeric; surcharge numeric = 0; extras numeric = 0; amount numeric; qty numeric; subtotal numeric; discount numeric; net numeric; tax numeric;
  tax_rate integer; days integer; disc integer; mode text; super boolean; max_discount integer = 10000; pricing jsonb; apply_tax boolean; area_label text; items_snapshot jsonb; contact_snapshot jsonb;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Forbidden'; end if;
  super = private.is_admin(true);
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'Invalid payload'; end if;
  mode = p->'pricing'->>'mode'; disc = coalesce((p->>'discount_bps')::integer,0); apply_tax = coalesce((p->>'apply_tax')::boolean,true);
  if disc not between 0 and 10000 then raise exception 'Invalid discount'; end if;
  if length(coalesce(p->>'service','')) not between 2 and 160 or length(coalesce(p->>'notes','')) > 3000 or length(coalesce(p->>'work_address','')) > 300
     or length(coalesce(p->>'mesh_type','')) > 120 then raise exception 'Invalid text'; end if;
  if jsonb_typeof(p->'zones') <> 'array' or jsonb_array_length(p->'zones') not between 1 and 30 then raise exception 'Zones required'; end if;
  if jsonb_typeof(coalesce(p->'extras','[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p->'extras','[]'::jsonb)) > 20 then raise exception 'Invalid extras'; end if;
  if not apply_tax and not super then raise exception 'Only SUPERADMIN can omit VAT'; end if;
  select value into cfg from public.settings where key='commercial';
  if cfg is null or cfg->>'tax_bps' is null or cfg->>'validity_days' is null or length(coalesce(cfg->>'payment_terms',''))=0 or length(coalesce(cfg->'company'->>'name',''))=0 then raise exception 'Commercial settings are not configured'; end if;
  tax_rate = case when apply_tax then (cfg->>'tax_bps')::integer else 0 end; days = (cfg->>'validity_days')::integer;
  if tax_rate not between 0 and 10000 or days not between 1 and 365 then raise exception 'Invalid commercial settings'; end if;
  select to_jsonb(c) into contact_snapshot from public.contacts c where id=p_contact_id;
  if contact_snapshot is null then raise exception 'Contact unavailable'; end if;
  if p_lead_id is not null and not exists(select 1 from public.leads where id=p_lead_id and contact_id=p_contact_id) then raise exception 'Lead does not belong to contact'; end if;

  for z in select * from jsonb_array_elements(p->'zones') loop
    w = (z->>'width_mm')::numeric; h = (z->>'height_mm')::numeric; n = (z->>'quantity')::numeric;
    if w is null or h is null or n is null or w <> trunc(w) or h <> trunc(h) or n <> trunc(n) or w not between 1 and 100000 or h not between 1 and 100000 or n not between 1 and 1000 then raise exception 'Invalid zone'; end if;
    if coalesce(z->>'kind','') not in ('balcon','ventana','logia','terraza','otra') or length(coalesce(z->>'description','')) > 200 or length(coalesce(z->>'notes','')) > 500 then raise exception 'Invalid zone text'; end if;
    area_mm2 = area_mm2 + w*h*n;
    zones = zones || jsonb_build_array(jsonb_build_object('kind',z->>'kind','description',coalesce(z->>'description',''),'width_mm',w,'height_mm',h,'quantity',n,'area_milli_m2',round(w*h*n/1000),'notes',coalesce(z->>'notes','')));
  end loop;
  area_milli = round(area_mm2/1000);
  area_label = trunc(area_milli/1000)::text || ',' || lpad((area_milli % 1000)::text,3,'0');

  if mode = 'rate' then
    select * into rule from public.pricing_rules where id=(p->'pricing'->>'rule_id')::uuid and active for share;
    if not found or rule.unit <> 'm2' then raise exception 'Rate unavailable'; end if;
    if rule.service_id is not null and not exists(select 1 from public.services where id=rule.service_id and active) then raise exception 'Service inactive'; end if;
    main = greatest(round(rule.unit_price::numeric*area_mm2/1000000), rule.min_price);
    surcharge = round(main*rule.surcharge_bps/10000);
    max_discount = rule.max_discount_bps;
    pricing = jsonb_build_object('mode','rate','rule_id',rule.id,'rule_name',rule.name,'unit_price',rule.unit_price,'min_price',rule.min_price,'surcharge_bps',rule.surcharge_bps,'min_applied',round(rule.unit_price::numeric*area_mm2/1000000) < rule.min_price);
  elsif mode = 'manual' then
    if not super then raise exception 'Manual value requires SUPERADMIN'; end if;
    main = (p->'pricing'->>'manual_net')::numeric;
    if main is null or main <> trunc(main) or main not between 1 and 2147483647 or length(coalesce(trim(p->'pricing'->>'manual_source'),'')) not between 5 and 300 then raise exception 'Manual value and source required'; end if;
    pricing = jsonb_build_object('mode','manual','manual_net',main,'manual_source',trim(p->'pricing'->>'manual_source'),'entered_by',auth.uid());
  else raise exception 'Invalid pricing mode'; end if;

  for e in select * from jsonb_array_elements(coalesce(p->'extras','[]'::jsonb)) loop
    if coalesce(e->>'kind','') not in ('adicional','lateral','recargo') or length(coalesce(trim(e->>'description'),'')) not between 2 and 200 then raise exception 'Invalid extra'; end if;
    if e ? 'rule_id' and nullif(e->>'rule_id','') is not null then
      select * into xr from public.pricing_rules where id=(e->>'rule_id')::uuid and active for share;
      if not found or xr.unit = 'm2' then raise exception 'Extra rate unavailable'; end if;
      qty = (e->>'quantity_milli')::numeric;
      if qty is null or qty <> trunc(qty) or qty not between 1 and 1000000 then raise exception 'Invalid extra quantity'; end if;
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

  if not super and disc > max_discount then raise exception 'Discount exceeds authorized limit'; end if;
  subtotal = main + surcharge + extras; discount = round(subtotal*disc/10000); net = subtotal - discount; tax = round(net*tax_rate/10000);
  if subtotal > 2147483647 or net + tax > 2147483647 or net + tax <= 0 then raise exception 'Invalid quote total'; end if;

  if p_quote_id is null then
    insert into public.quotes(contact_id,lead_id,tax_bps,valid_until,payment_terms,warranty,created_by) values(p_contact_id,p_lead_id,tax_rate,(now() at time zone 'America/Santiago')::date+days,cfg->>'payment_terms',nullif(cfg->>'warranty',''),auth.uid()) returning * into q;
    qid = q.id; ver = 1;
  else
    select * into strict q from public.quotes where id=p_quote_id for update;
    if q.status not in ('draft','sent') or p_expected_version is distinct from q.current_version then raise exception 'Quote changed or cannot be edited'; end if;
    if q.contact_id <> p_contact_id then raise exception 'A saved quote cannot change contact'; end if;
    qid = q.id; ver = q.current_version + 1;
  end if;

  insert into public.quote_items(quote_id,version,rule_id,description,unit,quantity_milli,unit_price,min_price,surcharge_bps,line_total,material,location)
    values(qid,ver,case when mode='rate' then rule.id end,left(p->>'service' || ' · ' || area_label || ' m²',500),'fixed',1000,main::integer,
      case when mode='rate' then rule.min_price else 0 end,case when mode='rate' then rule.surcharge_bps else 0 end,(main+surcharge)::integer,nullif(left(coalesce(p->>'mesh_type',''),160),''),nullif(left(coalesce(p->>'work_address',''),240),''));
  for e in select * from jsonb_array_elements(extras_json) loop
    insert into public.quote_items(quote_id,version,rule_id,description,unit,quantity_milli,unit_price,min_price,surcharge_bps,line_total)
      values(qid,ver,nullif(e->>'rule_id','')::uuid,left(e->>'description',500),'fixed',1000,(e->>'amount')::integer,0,0,(e->>'amount')::integer);
  end loop;

  update public.quotes set lead_id=p_lead_id,status='draft',current_version=ver,subtotal=subtotal::integer,discount_bps=disc,discount_amount=discount::integer,net=net::integer,tax_bps=tax_rate,tax=tax::integer,total=(net+tax)::integer,
    valid_until=(now() at time zone 'America/Santiago')::date+days,notes=nullif(p->>'notes',''),payment_terms=cfg->>'payment_terms',warranty=nullif(cfg->>'warranty',''),sent_at=null,accepted_at=null,
    details=jsonb_build_object('kind','quick','service',p->>'service','mesh_type',coalesce(p->>'mesh_type',''),'features',coalesce(p->'features','[]'::jsonb),'work_address',coalesce(p->>'work_address',''),
      'zones',zones,'area_milli_m2',area_milli,'pricing',pricing,'main_amount',main,'surcharge_amount',surcharge,'extras',extras_json,'apply_tax',apply_tax)
    where id=qid returning * into q;
  select coalesce(jsonb_agg(to_jsonb(i) order by i.id),'[]'::jsonb) into items_snapshot from public.quote_items i where quote_id=qid and version=ver;
  insert into public.quote_versions(quote_id,version,snapshot,created_by) values(qid,ver,jsonb_build_object('quote',to_jsonb(q),'items',items_snapshot,'contact',contact_snapshot,'company',cfg->'company','created_at',now()),auth.uid());
  return qid;
end $$;
revoke all on function private.save_quick_quote(uuid,uuid,uuid,integer,jsonb) from public, anon;
grant execute on function private.save_quick_quote(uuid,uuid,uuid,integer,jsonb) to authenticated;
create function public.save_quick_quote(p_contact_id uuid,p_lead_id uuid,p_quote_id uuid,p_expected_version integer,p jsonb) returns uuid
language sql security invoker set search_path='' as $$select private.save_quick_quote(p_contact_id,p_lead_id,p_quote_id,p_expected_version,p)$$;
revoke all on function public.save_quick_quote(uuid,uuid,uuid,integer,jsonb) from public, anon;
grant execute on function public.save_quick_quote(uuid,uuid,uuid,integer,jsonb) to authenticated;

-- 7. El contenido comercial del sitio se mantiene en el código. Las filas existentes se conservan como histórico
--    y dejan de ser editables por usuarios autenticados (la lectura pública previa no se modifica).
revoke insert, update, delete on public.content_entries from authenticated;
