-- Iron Mallas 2.0 · Cotizador con tarifas reales (5-11-2026). Aditiva: conserva cotizaciones, versiones y datos.
-- 1. Unidad «ml» (metro lineal): se cobra (ancho + alto) x cantidad de cada zona, sin convertir a perímetro.
-- 2. Tarifas base netas aprobadas por Iron Mallas (se insertan solo si no existe una tarifa con el mismo nombre).
-- 3. Pilares adicionales como adicionales por unidad entera.
-- 4. Cotización referencial / definitiva por versión (details.definitive, copiado en cada snapshot).
--    Las cotizaciones aceptadas, rechazadas o vencidas siguen sin poder editarse (sin cambios unilaterales).

alter table public.pricing_rules drop constraint pricing_rules_unit_check;
alter table public.pricing_rules add constraint pricing_rules_unit_check check (unit in ('m2','ml','unit','hour','fixed'));

insert into public.pricing_rules(name,unit,unit_price,min_price,surcharge_bps,max_discount_bps,active)
select v.name, v.unit, v.unit_price, 0, 0, 0, true
from (values
  ('Instalación solo ángulos','ml',6000),
  ('Recambio','ml',5000),
  ('Pilar adicional 2,00 m','unit',17990),
  ('Pilar adicional 2,40 m','unit',19990)
) as v(name,unit,unit_price)
where not exists (select 1 from public.pricing_rules r where r.name = v.name);

create or replace function private.save_quick_quote(p_contact_id uuid,p_lead_id uuid,p_quote_id uuid,p_expected_version integer,p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg jsonb; rule public.pricing_rules%rowtype; xr public.pricing_rules%rowtype; q public.quotes%rowtype; qid uuid; ver integer; z jsonb; e jsonb;
  w numeric; h numeric; n numeric; area_mm2 numeric = 0; linear_mm numeric = 0; measure text; definitive boolean; main_label text; area_milli numeric; zones jsonb = '[]'; extras_json jsonb = '[]';
  main numeric; surcharge numeric = 0; extras numeric = 0; amount numeric; qty numeric; subtotal numeric; discount numeric; net numeric; tax numeric;
  tax_rate integer; days integer; disc integer; mode text; super boolean; max_discount integer = 10000; pricing jsonb; apply_tax boolean; area_label text; items_snapshot jsonb; contact_snapshot jsonb;
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

  if mode = 'rate' then
    select * into rule from public.pricing_rules where id=(p->'pricing'->>'rule_id')::uuid and active for share;
    if not found or rule.unit not in ('m2','ml') then raise exception 'Rate unavailable'; end if;
    if rule.service_id is not null and not exists(select 1 from public.services where id=rule.service_id and active) then raise exception 'Service inactive'; end if;
    measure = rule.unit;
    main = greatest(case when rule.unit = 'ml' then round(rule.unit_price::numeric*linear_mm/1000) else round(rule.unit_price::numeric*area_mm2/1000000) end, rule.min_price);
    surcharge = round(main*rule.surcharge_bps/10000);
    max_discount = rule.max_discount_bps;
    pricing = jsonb_build_object('mode','rate','rule_id',rule.id,'rule_name',rule.name,'unit',rule.unit,'unit_price',rule.unit_price,'min_price',rule.min_price,'surcharge_bps',rule.surcharge_bps,
      'min_applied',(case when rule.unit = 'ml' then round(rule.unit_price::numeric*linear_mm/1000) else round(rule.unit_price::numeric*area_mm2/1000000) end) < rule.min_price);
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
    insert into public.quotes(contact_id,lead_id,tax_bps,valid_until,payment_terms,warranty,created_by) values(p_contact_id,p_lead_id,tax_rate,(now() at time zone 'America/Santiago')::date+days,cfg->>'payment_terms',nullif(cfg->>'warranty',''),auth.uid()) returning * into q;
    qid = q.id; ver = 1;
  else
    select * into strict q from public.quotes where id=p_quote_id for update;
    if q.status not in ('draft','sent') or p_expected_version is distinct from q.current_version then raise exception 'Quote changed or cannot be edited'; end if;
    if q.contact_id <> p_contact_id then raise exception 'A saved quote cannot change contact'; end if;
    qid = q.id; ver = q.current_version + 1;
  end if;

  insert into public.quote_items(quote_id,version,rule_id,description,unit,quantity_milli,unit_price,min_price,surcharge_bps,line_total,material,location)
    values(qid,ver,case when mode='rate' then rule.id end,left(main_label,500),'fixed',1000,main::integer,
      case when mode='rate' then rule.min_price else 0 end,case when mode='rate' then rule.surcharge_bps else 0 end,(main+surcharge)::integer,nullif(left(coalesce(p->>'mesh_type',''),160),''),nullif(left(coalesce(p->>'work_address',''),240),''));
  for e in select * from jsonb_array_elements(extras_json) loop
    insert into public.quote_items(quote_id,version,rule_id,description,unit,quantity_milli,unit_price,min_price,surcharge_bps,line_total)
      values(qid,ver,nullif(e->>'rule_id','')::uuid,left(e->>'description',500),'fixed',1000,(e->>'amount')::integer,0,0,(e->>'amount')::integer);
  end loop;

  update public.quotes set lead_id=p_lead_id,status='draft',current_version=ver,subtotal=subtotal::integer,discount_bps=disc,discount_amount=discount::integer,net=net::integer,tax_bps=tax_rate,tax=tax::integer,total=(net+tax)::integer,
    valid_until=(now() at time zone 'America/Santiago')::date+days,notes=nullif(p->>'notes',''),payment_terms=cfg->>'payment_terms',warranty=nullif(cfg->>'warranty',''),sent_at=null,accepted_at=null,
    details=jsonb_build_object('kind','quick','service',p->>'service','mesh_type',coalesce(p->>'mesh_type',''),'features',coalesce(p->'features','[]'::jsonb),'work_address',coalesce(p->>'work_address',''),
      'zones',zones,'area_milli_m2',area_milli,'linear_mm',linear_mm,'measure',measure,'definitive',definitive,'pricing',pricing,'main_amount',main,'surcharge_amount',surcharge,'extras',extras_json,'apply_tax',apply_tax)
    where id=qid returning * into q;
  select coalesce(jsonb_agg(to_jsonb(i) order by i.id),'[]'::jsonb) into items_snapshot from public.quote_items i where quote_id=qid and version=ver;
  insert into public.quote_versions(quote_id,version,snapshot,created_by) values(qid,ver,jsonb_build_object('quote',to_jsonb(q),'items',items_snapshot,'contact',contact_snapshot,'company',cfg->'company','created_at',now()),auth.uid());
  return qid;
end $$;
