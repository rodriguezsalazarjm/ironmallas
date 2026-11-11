import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { platformDatabase, asUser, ADMIN, SUPERADMIN } from "./platform-fixture";
import { calculateQuick, type QuickPayload, type QuickRate } from "../src/features/quotes/quick";
import { generateQuotePdf } from "../src/features/quotes/pdf";
import { quoteSnapshotSchema } from "../src/features/quotes/snapshot";
import { QUOTE_TERMS, REFERENTIAL_TITLE, DEFINITIVE_TITLE } from "../src/features/quotes/terms";
import { company } from "../src/content/company";

const ID = { install: "00000000-0000-4000-8000-0000000000a1", swap: "00000000-0000-4000-8000-0000000000a2", p200: "00000000-0000-4000-8000-0000000000a3", p240: "00000000-0000-4000-8000-0000000000a4" };
const rates: QuickRate[] = [
  { id: ID.install, name: "Instalación solo ángulos", unit: "ml", unit_price: 6000, min_price: 0, surcharge_bps: 0, max_discount_bps: 0, active: true },
  { id: ID.swap, name: "Recambio", unit: "ml", unit_price: 5000, min_price: 0, surcharge_bps: 0, max_discount_bps: 0, active: true },
  { id: ID.p200, name: "Pilar adicional 2,00 m", unit: "unit", unit_price: 17990, min_price: 0, surcharge_bps: 0, max_discount_bps: 0, active: true },
  { id: ID.p240, name: "Pilar adicional 2,40 m", unit: "unit", unit_price: 19990, min_price: 0, surcharge_bps: 0, max_discount_bps: 0, active: true },
];
const zone = (width_mm: number, height_mm: number, quantity = 1) => ({ kind: "balcon" as const, description: "Balcón", width_mm, height_mm, quantity, notes: "" });
const quote = (rule_id: string, extra: Partial<QuickPayload> = {}): QuickPayload => ({ service: "Mallas de seguridad", mesh_type: "Malla de seguridad", features: [], work_address: "", zones: [zone(3500, 1700)], pricing: { mode: "rate", rule_id }, extras: [], discount_bps: 0, apply_tax: true, notes: "", ...extra });
const pillar = (rule_id: string, units: number) => ({ kind: "pilar" as const, description: rule_id === ID.p200 ? "Pilar adicional 2,00 m" : "Pilar adicional 2,40 m", rule_id, quantity_milli: units * 1000 });

/** Texto visible del PDF: pdf-lib escribe cada línea como <hex> Tj en WinAnsi (compatible con latin1 para tildes). */
function pdfText(bytes: Uint8Array) {
  const raw = Buffer.from(bytes).toString("latin1");
  const chunks: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const data = Buffer.from(match[1], "latin1");
    try { chunks.push(inflateSync(data).toString("latin1")); } catch { chunks.push(match[1]); }
  }
  return chunks.join("\n").match(/<([0-9A-Fa-f]+)> Tj/g)?.map(t => Buffer.from(t.slice(1, t.indexOf(">")), "hex").toString("latin1")).join("\n") ?? "";
}

test("instalación solo ángulos: (ancho + alto) × $6.000 — ejemplo 3,50 × 1,70 m", () => {
  const r = calculateQuick(quote(ID.install), rates, 1900, false);
  assert.equal(r.measure, "ml");
  assert.equal(r.linear_mm, 5200); // 3,50 + 1,70 = 5,20 m (no perímetro completo, no ancho × alto)
  assert.equal(r.main, 31200);
  assert.deepEqual([r.subtotal, r.net, r.tax, r.total], [31200, 31200, 5928, 37128]);
});

test("recambio: (ancho + alto) × $5.000", () => {
  const r = calculateQuick(quote(ID.swap), rates, 1900, false);
  assert.deepEqual([r.linear_mm, r.main, r.tax, r.total], [5200, 26000, 4940, 30940]);
});

test("pilares por tipo y cantidad se suman al trabajo principal; solo unidades enteras", () => {
  const r = calculateQuick(quote(ID.install, { extras: [pillar(ID.p200, 2), pillar(ID.p240, 1)] }), rates, 1900, false);
  assert.deepEqual(r.extras, [35980, 19990]);
  assert.deepEqual([r.subtotal, r.tax, r.total], [87170, 16562, 103732]); // IVA 16.562,3 → 16.562
  assert.throws(() => calculateQuick(quote(ID.install, { extras: [{ ...pillar(ID.p200, 1), quantity_milli: 1500 }] }), rates, 1900, false));
  // Una tarifa por metro lineal no puede usarse como adicional.
  assert.throws(() => calculateQuick(quote(ID.install, { extras: [{ ...pillar(ID.swap, 1), kind: "adicional" }] }), rates, 1900, false));
});

test("varias zonas, IVA con redondeo y descuentos autorizados", () => {
  const multi = calculateQuick(quote(ID.install, { zones: [zone(3500, 1700), zone(1200, 1000, 2)] }), rates, 1900, false);
  assert.deepEqual(multi.zones.map(z => z.linear_mm), [5200, 4400]);
  assert.equal(multi.linear_mm, 9600); assert.equal(multi.main, 57600);
  const odd = calculateQuick(quote(ID.install, { zones: [zone(1234, 567)] }), rates, 1900, false);
  assert.deepEqual([odd.main, odd.tax, odd.total], [10806, 2053, 12859]); // 2.053,14 → 2.053
  // Descuento máximo 0% en las tarifas base: solo SUPERADMIN puede aplicar uno (3,33% de 31.200 = 1.038,96 → 1.039).
  assert.throws(() => calculateQuick(quote(ID.install, { discount_bps: 333 }), rates, 1900, false));
  const discounted = calculateQuick(quote(ID.install, { discount_bps: 333 }), rates, 1900, true);
  assert.deepEqual([discounted.discount, discounted.net, discounted.tax, discounted.total], [1039, 30161, 5731, 35892]);
});

test("SQL = TS con las tarifas reales; referencial/definitiva por versión; aceptadas no se modifican", async () => {
  const db = await platformDatabase();
  try {
    await asUser(db, SUPERADMIN);
    const seeded = (await db.query<QuickRate>("select id,name,unit,unit_price,min_price,surcharge_bps,max_discount_bps,active from public.pricing_rules order by name")).rows;
    assert.deepEqual(seeded.map(r => [r.name, r.unit, r.unit_price]), [["Instalación solo ángulos", "ml", 6000], ["Pilar adicional 2,00 m", "unit", 17990], ["Pilar adicional 2,40 m", "unit", 19990], ["Recambio", "ml", 5000]]);
    const id = (name: string) => seeded.find(r => r.name === name)!.id;
    await db.query("insert into public.settings(key,value,updated_by) values('commercial',$1,$2)", [JSON.stringify({ tax_bps: 1900, validity_days: 15, payment_terms: "Condiciones sintéticas de prueba", company: { name: company.legalName, phone: company.phoneDisplay, email: company.email, address: company.address } }), SUPERADMIN]);
    await asUser(db, ADMIN);
    const contact = (await db.query<{ id: string }>("insert into public.contacts(name,phone,whatsapp,source) values('Cliente prueba','56933334444','56933334444','cotizador') returning id")).rows[0].id;
    const payload = { ...quote(id("Instalación solo ángulos"), { zones: [zone(3500, 1700), zone(1200, 1000, 2)] }), extras: [{ ...pillar(id("Pilar adicional 2,00 m"), 2), rule_id: id("Pilar adicional 2,00 m") }] };
    const preview = calculateQuick(payload, seeded, 1900, false);
    const qid = (await db.query<{ id: string }>("select public.save_quick_quote($1,null,null,null,$2) id", [contact, JSON.stringify(payload)])).rows[0].id;
    const saved = (await db.query<{ total: number; tax: number; details: { measure: string; linear_mm: number; definitive: boolean } }>("select total,tax,details from public.quotes where id=$1", [qid])).rows[0];
    assert.deepEqual([saved.total, saved.tax], [preview.total, preview.tax]);
    assert.deepEqual([saved.details.measure, Number(saved.details.linear_mm), saved.details.definitive], ["ml", 9600, false]);
    const item = (await db.query<{ description: string }>("select description from public.quote_items where quote_id=$1 and version=1 order by line_total desc limit 1", [qid])).rows[0];
    assert.equal(item.description, "Mallas de seguridad · 9,600 m lineales");
    await assert.rejects(db.query("select public.save_quick_quote($1,null,null,null,$2)", [contact, JSON.stringify({ ...payload, extras: [{ ...payload.extras[0], quantity_milli: 1500 }] })]));

    // Tras la evaluación técnica: nueva versión definitiva. La versión referencial anterior se conserva.
    await db.query("select public.save_quick_quote($1,null,$2,1,$3)", [contact, qid, JSON.stringify({ ...payload, definitive: true })]);
    const versions = (await db.query<{ version: number; snapshot: { quote: { details: { definitive: boolean } } } }>("select version,snapshot from public.quote_versions where quote_id=$1 order by version", [qid])).rows;
    assert.deepEqual(versions.map(v => [v.version, v.snapshot.quote.details.definitive]), [[1, false], [2, true]]);

    // Enviada y aceptada: ya no admite nuevas versiones (sin cambios unilaterales).
    await db.query("select public.set_quote_status($1,'sent',2)", [qid]);
    await db.query("select public.set_quote_status($1,'accepted',2)", [qid]);
    await assert.rejects(db.query("select public.save_quick_quote($1,null,$2,2,$3)", [contact, qid, JSON.stringify({ ...payload, definitive: true, discount_bps: 0, notes: "cambio" })]));
    const after = (await db.query<{ status: string; current_version: number; total: number }>("select status,current_version,total from public.quotes where id=$1", [qid])).rows[0];
    assert.deepEqual([after.status, after.current_version, after.total], ["accepted", 2, preview.total]);
    assert.equal((await db.query("select 1 from public.quote_versions where quote_id=$1", [qid])).rows.length, 2);

    // PDF definitivo generado desde el snapshot guardado.
    const pdf = await generateQuotePdf(quoteSnapshotSchema.parse(versions[1].snapshot), undefined, await readFile(new URL("../public/brand/logo-color.png", import.meta.url)));
    const text = pdfText(pdf);
    assert.match(text, new RegExp(DEFINITIVE_TITLE));
    assert.doesNotMatch(text, /Valor referencial/);
    assert.match(text, /Instalación solo ángulos/); assert.match(text, /9,60 m lineales × \$6\.000 neto/); assert.match(text, /2 × \$17\.990 neto/);
  } finally { await db.close(); }
});

test("PDF referencial: logotipo, términos completos, identificación legal y saltos de página", async () => {
  const zones = Array.from({ length: 28 }, (_, i) => ({ kind: i % 2 ? "ventana" : "balcon", description: `Zona ${i + 1} ${"descripción extensa ".repeat(5)}`, width_mm: 3500, height_mm: 1700, quantity: 1, area_milli_m2: 5950, linear_mm: 5200, notes: i % 4 ? "" : "Muro de hormigón a confirmar en visita" }));
  const snapshot = quoteSnapshotSchema.parse({
    quote: { id: "11111111-1111-4111-8111-111111111111", number: 42, current_version: 1, created_at: "2026-11-05T15:00:00Z", valid_until: "2026-11-20", status: "draft", subtotal: 873600, discount_bps: 0, discount_amount: 0, net: 873600, tax_bps: 1900, tax: 165984, total: 1039584, payment_terms: "Condiciones sintéticas de prueba", warranty: null, notes: null,
      details: { kind: "quick", service: "Mallas de seguridad", mesh_type: "Malla de seguridad", features: [], work_address: "Calle de prueba 123, Ñuñoa", zones, area_milli_m2: 166600, linear_mm: 145600, measure: "ml", definitive: false,
        pricing: { mode: "rate", rule_name: "Instalación solo ángulos", unit: "ml", unit_price: 6000 }, main_amount: 873600, surcharge_amount: 0, extras: [] } },
    contact: { name: "Cliente de prueba", phone: "56911112222", whatsapp: "56911112222", email: null, address: null, unit: null, commune: null, region: null },
    items: [{ description: "Mallas de seguridad · 145,600 m lineales", unit: "fixed", quantity_milli: 1000, unit_price: 873600, min_price: 0, surcharge_bps: 0, line_total: 873600, material: null, location: null }],
    company: { name: company.legalName },
  });
  const logo = await readFile(new URL("../public/brand/logo-color.png", import.meta.url));
  const pdf = await generateQuotePdf(snapshot, undefined, logo);
  const doc = await PDFDocument.load(pdf);
  const pages = doc.getPageCount();
  assert.ok(pages >= 3, `páginas: ${pages}`);
  assert.deepEqual(doc.getPage(0).getSize(), { width: 595.28, height: 841.89 }); // A4
  const text = pdfText(pdf);
  assert.match(text, new RegExp(REFERENTIAL_TITLE)); assert.match(text, /SUJETA A EVALUACIÓN TÉCNICA/);
  assert.match(text, /Valor referencial/); assert.match(text, /El valor indicado es aproximado/);
  for (const section of QUOTE_TERMS) assert.ok(text.includes(section.title), section.title);
  assert.match(text, /Diferencias relevantes entre las medidas informadas y las reales\./);
  assert.match(text, /RUT 78\.467\.119-4/); assert.match(text, /Solinteg Security Asociados SpA/);
  assert.match(text, /TOTAL \(IVA incluido\)/); assert.match(text, /\$1\.039\.584/);
  assert.match(text, /145,60 m lineales × \$6\.000 neto/);
  for (let i = 1; i <= pages; i++) assert.ok(text.includes(`Página ${i} de ${pages}`), `pie página ${i}`);
  // No se inventan plazos ni garantías: sin garantía configurada no hay apartado «Garantía:».
  assert.doesNotMatch(text, /Garantía: /);
  assert.ok(pdf.length > logo.length, "el PDF incrusta el logotipo oficial");
});
