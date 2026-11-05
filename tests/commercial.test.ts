import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile, access } from "node:fs/promises";
import { platformDatabase, asUser, asService, ADMIN, SUPERADMIN } from "./platform-fixture";
import { calculateQuick, metersToMm, normalizePhone, areaLabel, type QuickPayload, type QuickRate } from "../src/features/quotes/quick";
import { PDFDocument } from "pdf-lib";
import { generateQuotePdf } from "../src/features/quotes/pdf";
import { quoteSnapshotSchema } from "../src/features/quotes/snapshot";
import { verifyMetaSignature, verifySubscription, processLeadgen, mapLeadFields, whatsappLeads, type IngestPayload } from "../src/features/integrations/meta";
import { parseConsent, serializeConsent, readConsentCookie, optionalTrackers, CONSENT_VERSION } from "../src/features/consent/consent";
import { sourceLabel, sourceFilterValues } from "../src/features/leads/sources";
import { commercialItems } from "../src/components/admin/navigation";

// Todas las tarifas y montos son sintéticos: solo verifican aritmética, nunca se cargan al producto.
const base: QuickPayload = { service: "Mallas de seguridad", mesh_type: "Malla de seguridad", features: [], work_address: "", zones: [{ kind: "balcon", description: "Living", width_mm: 2400, height_mm: 1100, quantity: 1, notes: "" }], pricing: { mode: "rate", rule_id: "00000000-0000-4000-8000-000000000001" }, extras: [], discount_bps: 0, apply_tax: true, notes: "" };
const rate: QuickRate = { id: "00000000-0000-4000-8000-000000000001", name: "Tarifa sintética", unit: "m2", unit_price: 10001, min_price: 0, surcharge_bps: 0, max_discount_bps: 1000, active: true };

test("cotizador rápido: superficie = ancho × alto × cantidad y CLP exacto", () => {
  assert.equal(metersToMm("2,4"), 2400); assert.equal(metersToMm("1.105"), 1105); assert.equal(metersToMm("0"), null); assert.equal(metersToMm("1,2345"), null); assert.equal(metersToMm("abc"), null);
  const r = calculateQuick({ ...base, zones: [...base.zones, { kind: "ventana", description: "", width_mm: 1333, height_mm: 777, quantity: 3, notes: "" }] }, [rate], 1900, false);
  assert.deepEqual(r.zones.map(z => z.area_milli_m2), [2640, 3107]); // 1,333 × 0,777 × 3 = 3,107223
  assert.equal(r.area_milli_m2, 5747);
  assert.equal(r.main, 57478); // round(10001 × 5,747223 = 57477,98)
  assert.equal(r.net, 57478); assert.equal(r.tax, 10921); assert.equal(r.total, 68399);
  assert.equal(areaLabel(5747), "5,747"); assert.equal(areaLabel(12345678), "12.345,678");
});

test("cotizador rápido: mínimo, recargo, adicionales, descuento autorizado y valor manual", () => {
  const rules: QuickRate[] = [{ ...rate, min_price: 50000, surcharge_bps: 500 }, { ...rate, id: "00000000-0000-4000-8000-000000000002", unit: "unit", unit_price: 7000, min_price: 0, max_discount_bps: 500 }];
  const r = calculateQuick({ ...base, extras: [{ kind: "lateral", description: "Laterales", rule_id: rules[1].id, quantity_milli: 2000 }], discount_bps: 500 }, rules, 1900, false);
  assert.equal(r.min_applied, true); assert.equal(r.main, 50000); assert.equal(r.surcharge, 2500); assert.deepEqual(r.extras, [14000]);
  assert.equal(r.subtotal, 66500); assert.equal(r.discount, 3325); assert.equal(r.net, 63175); assert.equal(r.total, 75178);
  assert.throws(() => calculateQuick({ ...base, extras: [{ kind: "lateral", description: "Laterales", rule_id: rules[1].id, quantity_milli: 1000 }], discount_bps: 501 }, rules, 1900, false), /descuento/);
  const manual = { ...base, pricing: { mode: "manual" as const, manual_net: 185000, manual_source: "Acordado tras visita" } };
  assert.throws(() => calculateQuick(manual, [], 1900, false), /SUPERADMIN/);
  assert.equal(calculateQuick(manual, [], 1900, true).total, 220150);
  assert.throws(() => calculateQuick({ ...base, apply_tax: false }, [rate], 1900, false), /IVA/);
  assert.throws(() => calculateQuick(base, [{ ...rate, active: false }], 1900, false));
  assert.equal(normalizePhone("+56 9 4582 3209"), "56945823209"); assert.equal(normalizePhone("945823209"), "56945823209"); assert.equal(normalizePhone("123"), null);
});

test("servidor (SQL) y navegador (TS) entregan el mismo resultado; permisos del cotizador", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, SUPERADMIN);
    await db.query("insert into public.settings(key,value,updated_by) values('commercial',$1,$2)", [JSON.stringify({ tax_bps: 1900, validity_days: 15, payment_terms: "Condiciones sintéticas", company: { name: "Empresa de prueba", phone: "+56 9 0000 0000", email: "prueba@example.invalid", address: "Dirección de prueba" } }), SUPERADMIN]);
    const ruleM2 = (await db.query<{ id: string }>("insert into public.pricing_rules(name,unit,unit_price,min_price,surcharge_bps,max_discount_bps) values('Malla sintética','m2',12345,40000,700,1000) returning id")).rows[0].id;
    const ruleUnit = (await db.query<{ id: string }>("insert into public.pricing_rules(name,unit,unit_price,min_price,surcharge_bps,max_discount_bps) values('Lateral sintético','unit',8999,0,0,800) returning id")).rows[0].id;
    const rules = (await db.query<QuickRate>("select id,name,unit,unit_price,min_price,surcharge_bps,max_discount_bps,active from public.pricing_rules")).rows;
    await asUser(db, ADMIN);
    const contact = (await db.query<{ id: string }>("insert into public.contacts(name,phone,whatsapp,source) values('Cliente sin correo','56911112222','56911112222','cotizador') returning id")).rows[0].id;
    const cases: QuickPayload[] = [
      { ...base, pricing: { mode: "rate", rule_id: ruleM2 } },
      { ...base, pricing: { mode: "rate", rule_id: ruleM2 }, zones: [{ kind: "terraza", description: "Terraza", width_mm: 5321, height_mm: 2333, quantity: 2, notes: "Esquina" }, { kind: "logia", description: "", width_mm: 999, height_mm: 1001, quantity: 7, notes: "" }], extras: [{ kind: "lateral", description: "Laterales", rule_id: ruleUnit, quantity_milli: 2500 }], discount_bps: 750 },
    ];
    for (const payload of cases) {
      const preview = calculateQuick(payload, rules, 1900, false);
      const id = (await db.query<{ id: string }>("select public.save_quick_quote($1,null,null,null,$2) id", [contact, JSON.stringify(payload)])).rows[0].id;
      const saved = (await db.query<{ subtotal: number; discount_amount: number; net: number; tax: number; total: number; details: { area_milli_m2: number } }>("select subtotal,discount_amount,net,tax,total,details from public.quotes where id=$1", [id])).rows[0];
      assert.deepEqual([saved.subtotal, saved.discount_amount, saved.net, saved.tax, saved.total], [preview.subtotal, preview.discount, preview.net, preview.tax, preview.total]);
      assert.equal(Number(saved.details.area_milli_m2), preview.area_milli_m2);
      const snapshot = (await db.query<{ snapshot: unknown }>("select snapshot from public.quote_versions where quote_id=$1 and version=1", [id])).rows[0].snapshot;
      const pdf = await generateQuotePdf(quoteSnapshotSchema.parse(snapshot));
      assert.equal(Buffer.from(pdf.slice(0, 5)).toString(), "%PDF-");
    }
    // Una nueva versión conserva la anterior; el estado sigue en borrador (no «enviado»).
    const first = (await db.query<{ id: string }>("select id from public.quotes order by number limit 1")).rows[0].id;
    await db.query("select public.save_quick_quote($1,null,$2,1,$3)", [contact, first, JSON.stringify({ ...cases[0], notes: "v2" })]);
    assert.equal((await db.query("select 1 from public.quote_versions where quote_id=$1", [first])).rows.length, 2);
    assert.equal((await db.query<{ status: string }>("select status from public.quotes where id=$1", [first])).rows[0].status, "draft");
    await assert.rejects(db.query("select public.save_quick_quote($1,null,$2,1,$3)", [contact, first, JSON.stringify(cases[0])])); // versión desactualizada
    // ADMIN: sin valor manual, sin exceder el descuento, sin omitir IVA.
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [contact, JSON.stringify({ ...base, pricing: { mode: "manual", manual_net: 1000, manual_source: "Sin permiso" } })]));
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [contact, JSON.stringify({ ...cases[1], discount_bps: 801 })]));
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [contact, JSON.stringify({ ...cases[0], apply_tax: false })]));
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [contact, JSON.stringify({ ...cases[0], zones: [{ ...base.zones[0], width_mm: 0 }] })]));
    // SUPERADMIN: valor neto manual con procedencia registrada.
    await asUser(db, SUPERADMIN);
    const manual = { ...base, pricing: { mode: "manual" as const, manual_net: 185000, manual_source: "Precio acordado tras visita" }, extras: [{ kind: "recargo" as const, description: "Trabajo en altura", amount: 15000, source: "Evaluación técnica" }] };
    const manualId = (await db.query<{ id: string }>("select public.save_quick_quote($1,null,null,null,$2) id", [contact, JSON.stringify(manual)])).rows[0].id;
    const m = (await db.query<{ total: number; details: { pricing: { manual_source: string } } }>("select total,details from public.quotes where id=$1", [manualId])).rows[0];
    assert.equal(m.total, calculateQuick(manual, [], 1900, true).total);
    assert.equal(m.details.pricing.manual_source, "Precio acordado tras visita");
  } finally { await db.close(); }
});

test("PDF rápido pagina 30 zonas y no inventa RUT", async () => {
  const zones = Array.from({ length: 30 }, (_, i) => ({ kind: "ventana", description: `Ventana ${i + 1} ${"texto largo ".repeat(6)}`, width_mm: 1200, height_mm: 1000, quantity: 1, area_milli_m2: 1200, notes: i % 3 ? "" : "Observación de prueba" }));
  const snapshot = quoteSnapshotSchema.parse({
    quote: { id: "11111111-1111-4111-8111-111111111111", number: 7, current_version: 1, created_at: "2026-11-05T15:00:00Z", valid_until: "2026-11-20", status: "draft", subtotal: 100000, discount_bps: 0, discount_amount: 0, net: 100000, tax_bps: 1900, tax: 19000, total: 119000, payment_terms: "Condiciones sintéticas", warranty: null, notes: null,
      details: { kind: "quick", service: "Mallas de seguridad", mesh_type: "Malla de seguridad", features: ["Protección de niños"], work_address: "", zones, area_milli_m2: 36000, pricing: { mode: "manual" }, main_amount: 100000, surcharge_amount: 0, extras: [] } },
    contact: { name: "Cliente de prueba", phone: "56911112222", whatsapp: "56911112222", email: null, address: "Dirección de prueba", unit: null, commune: "Ñuñoa", region: null },
    items: [{ description: "Mallas de seguridad · 36,000 m²", unit: "fixed", quantity_milli: 1000, unit_price: 100000, min_price: 0, surcharge_bps: 0, line_total: 100000, material: null, location: null }],
    company: { name: "Empresa de prueba" },
  });
  const pdf = await generateQuotePdf(snapshot);
  assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 2);
  // El RUT solo se imprime si está configurado en las condiciones comerciales (no se inventa).
  const source = await readFile(new URL("../src/features/quotes/pdf-quick.ts", import.meta.url), "utf8");
  assert.match(source, /co\.rut \? `RUT \$\{co\.rut\}` : ""/);
  assert.ok((await PDFDocument.load(await generateQuotePdf({ ...snapshot, company: { name: "Empresa de prueba", rut: "11.111.111-1" } }))).getPageCount() >= 2);
});

test("entrada única de oportunidades: deduplicación, reutilización de contacto y acceso solo de servicio", async () => {
  const db = await platformDatabase();
  try {
    await asService(db);
    const lead = { source: "META_LEAD_AD", external_id: "123456789", name: "Lead sintético", phone: "+56 9 1111 2222", email: "", service: "Mallas de seguridad", campaign: "Campaña sintética", tracking: { meta_form_id: "1" } };
    const a = (await db.query<{ r: { id: string; duplicate: boolean } }>("select public.ingest_external_lead($1) r", [JSON.stringify(lead)])).rows[0].r;
    const b = (await db.query<{ r: { id: string; duplicate: boolean } }>("select public.ingest_external_lead($1) r", [JSON.stringify(lead)])).rows[0].r;
    assert.equal(a.duplicate, false); assert.equal(b.duplicate, true); assert.equal(a.id, b.id);
    const c = (await db.query<{ r: { id: string } }>("select public.ingest_external_lead($1) r", [JSON.stringify({ ...lead, source: "META_WHATSAPP", external_id: "56911112222:2026-11-05", campaign: "" })])).rows[0].r;
    const rows = (await db.query<{ contact_id: string; source: string; campaign_attribution: string; email: string | null }>("select l.contact_id,l.source,l.campaign_attribution,c.email from public.leads l join public.contacts c on c.id=l.contact_id order by l.created_at")).rows;
    assert.equal(rows.length, 2); assert.equal(rows[0].contact_id, rows[1].contact_id); assert.equal(rows[0].email, null);
    assert.deepEqual(rows.map(r => r.campaign_attribution), ["observed", "none"]); assert.ok(c.id);
    await assert.rejects(db.query("select public.ingest_external_lead($1)", [JSON.stringify({ ...lead, source: "WEB" })]));
    await assert.rejects(db.query("select public.ingest_external_lead($1)", [JSON.stringify({ ...lead, external_id: "" })]));
    // Formulario web: idempotente por submission_id, fuente WEB y UTM como atribución no confirmada.
    const payload = { name: "Persona web", phone: "+56 9 3333 4444", email: "web@example.invalid", service: "Mallas de seguridad", consent: "on", submission_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", tracking: { utmCampaign: "otoño" } };
    const key = "a".repeat(64);
    const w1 = (await db.query<{ id: string }>("select public.submit_public_lead($1,$2) id", [JSON.stringify(payload), key])).rows[0].id;
    const w2 = (await db.query<{ id: string }>("select public.submit_public_lead($1,$2) id", [JSON.stringify(payload), key])).rows[0].id;
    assert.equal(w1, w2);
    const web = (await db.query<{ source: string; campaign: string; campaign_attribution: string }>("select source,campaign,campaign_attribution from public.leads where id=$1", [w1])).rows[0];
    assert.deepEqual(web, { source: "WEB", campaign: "otoño", campaign_attribution: "unconfirmed" });
    await asUser(db, ADMIN);
    await assert.rejects(db.query("select public.ingest_external_lead($1)", [JSON.stringify({ ...lead, external_id: "999" })]));
  } finally { await db.close(); }
});

test("Meta Lead Ads (simulado): firma, desafío, filtros, reintento e idempotencia", async () => {
  const secret = "s".repeat(32), body = JSON.stringify({ object: "page", entry: [{ changes: [{ field: "leadgen", value: { leadgen_id: "111", page_id: "P1", form_id: "F1", ad_id: "A1" } }, { field: "leadgen", value: { leadgen_id: "222", page_id: "P1", form_id: "OTHER" } }] }] });
  const sig = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.equal(verifyMetaSignature(body, sig, secret), true);
  assert.equal(verifyMetaSignature(body + " ", sig, secret), false);
  assert.equal(verifyMetaSignature(body, sig, undefined), false);
  assert.equal(verifySubscription(new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "t".repeat(20), "hub.challenge": "abc123" }), "t".repeat(20)), "abc123");
  assert.equal(verifySubscription(new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "x".repeat(20), "hub.challenge": "abc123" }), "t".repeat(20)), null);
  const graph = { id: "111", campaign_name: "Campaña sintética", ad_name: "Anuncio sintético", form_id: "F1", field_data: [{ name: "full_name", values: ["Lead Sintético"] }, { name: "phone_number", values: ["+56911112222"] }, { name: "comuna", values: ["Maipú"] }, { name: "medidas_aproximadas", values: ["2x1"] }] };
  const mapped = mapLeadFields(graph as never);
  assert.equal(mapped.name, "Lead Sintético"); assert.equal(mapped.commune, "Maipú"); assert.match(mapped.message, /medidas aproximadas: 2x1/);
  const store = new Map<string, IngestPayload>();
  const ingest = async (p: IngestPayload) => { const dup = store.has(p.external_id); store.set(p.external_id, p); return { id: p.external_id, duplicate: dup }; };
  const fetchOk = (async () => new Response(JSON.stringify(graph), { status: 200 })) as typeof fetch;
  const first = await processLeadgen(JSON.parse(body), { token: "token", formIds: ["F1"] }, ingest, fetchOk);
  assert.deepEqual(first.results.map(r => r.status), ["created", "ignored"]); assert.equal(first.retry, false);
  const again = await processLeadgen(JSON.parse(body), { token: "token", formIds: ["F1"] }, ingest, fetchOk);
  assert.equal(again.results[0].status, "duplicate"); assert.equal(store.size, 1);
  const failing = await processLeadgen(JSON.parse(body), { token: "token" }, ingest, (async () => new Response("{}", { status: 500 })) as typeof fetch);
  assert.equal(failing.retry, true);
  assert.equal(store.get("111")?.tracking.meta_ad_id, "A1");
});

test("WhatsApp Cloud API (simulado): una oportunidad por número y día, con referencia publicitaria", () => {
  const msg = (id: string, from = "56911112222") => ({ from, id, type: "text", text: { body: "Hola, quiero cotizar" }, referral: { source_id: "AD1", headline: "Mallas", ctwa_clid: "clid" } });
  const leads = whatsappLeads({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messaging_product: "whatsapp", contacts: [{ wa_id: "56911112222", profile: { name: "Cliente WA" } }], messages: [msg("m1"), msg("m2"), msg("m3", "56933334444")] } }] }] }, new Date("2026-11-05T15:00:00Z"));
  assert.equal(leads.length, 2); assert.equal(leads[0].external_id, "56911112222:2026-11-05"); assert.equal(leads[0].tracking.ctwa_clid, "clid"); assert.equal(leads[0].campaign, "Mallas");
  assert.deepEqual(whatsappLeads({ object: "page", entry: [] }), []);
});

test("cookies: decisión versionada, sin categorías opcionales si no hay rastreadores configurados", () => {
  const raw = serializeConsent({ analytics: true, marketing: false }, new Date("2026-11-05T10:00:00Z"));
  assert.deepEqual(parseConsent(raw), { version: CONSENT_VERSION, analytics: true, marketing: false, decidedAt: "2026-11-05" });
  assert.equal(readConsentCookie(`foo=1; im_consent=${raw}; bar=2`)?.analytics, true);
  assert.equal(parseConsent(encodeURIComponent(JSON.stringify({ v: "old", a: 1, m: 1, t: "2026-01-01" }))), null);
  assert.equal(parseConsent("%%%"), null);
  assert.deepEqual(optionalTrackers({}), { analytics: false, marketing: false });
  assert.deepEqual(optionalTrackers({ ga: "G-ABC1234", pixel: "1234567890" }), { analytics: true, marketing: true });
  assert.deepEqual(optionalTrackers({ ga: "UA-1", pixel: "abc" }), { analytics: false, marketing: false });
});

test("navegación y rutas: menú Comercial, rutas retiradas protegidas y políticas públicas", async () => {
  assert.deepEqual(commercialItems.map(i => i.label), ["Oportunidades", "Clientes", "Agenda", "Instalaciones", "Pagos", "Generar cotización"]);
  for (const item of commercialItems) await access(new URL(`../src/app/admin/(private)${item.href.replace("/admin", "")}/page.tsx`, import.meta.url));
  for (const retired of ["contenido", "configuracion"]) {
    const source = await readFile(new URL(`../src/app/admin/(private)/${retired}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /requireAdmin\(\)/); assert.match(source, /redirect\(/);
  }
  await assert.rejects(access(new URL("../src/features/content/actions.ts", import.meta.url)));
  const media = await readFile(new URL("../src/features/media/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(media, /uploadPublicMedia/);
  for (const page of ["politica-de-privacidad", "politica-de-cookies"]) await access(new URL(`../src/app/(site)/${page}/page.tsx`, import.meta.url));
  assert.equal(sourceLabel("web_form"), "Formulario web"); assert.deepEqual(sourceFilterValues("WEB"), ["web_form", "WEB"]);
});
