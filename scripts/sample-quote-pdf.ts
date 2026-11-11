/**
 * Genera un PDF de ejemplo del cotizador (3,50 × 1,70 m, instalación solo ángulos) sin tocar la base de datos.
 * Uso: npx tsx scripts/sample-quote-pdf.ts [salida.pdf]
 */
import { readFile, writeFile } from "node:fs/promises";
import { calculateQuick, type QuickRate } from "../src/features/quotes/quick";
import { generateQuotePdf } from "../src/features/quotes/pdf";
import { quoteSnapshotSchema } from "../src/features/quotes/snapshot";
import { company } from "../src/content/company";

const rule: QuickRate = { id: "00000000-0000-4000-8000-0000000000a1", name: "Instalación solo ángulos", unit: "ml", unit_price: 6000, min_price: 0, surcharge_bps: 0, max_discount_bps: 0, active: true };
const payload = { service: "Mallas de seguridad", mesh_type: "Malla de seguridad", features: ["Protección de niños"], work_address: "Dirección de ejemplo 123, depto. 45, Providencia",
  zones: [{ kind: "balcon" as const, description: "Balcón living", width_mm: 3500, height_mm: 1700, quantity: 1, notes: "" }],
  pricing: { mode: "rate" as const, rule_id: rule.id }, extras: [], discount_bps: 0, apply_tax: true, notes: "" };
const r = calculateQuick(payload, [rule], 1900, false);
const snapshot = quoteSnapshotSchema.parse({
  quote: { id: "11111111-1111-4111-8111-111111111111", number: 1, current_version: 1, created_at: "2026-11-05T15:00:00Z", valid_until: "2026-11-20", status: "draft",
    subtotal: r.subtotal, discount_bps: 0, discount_amount: r.discount, net: r.net, tax_bps: r.tax_bps, tax: r.tax, total: r.total,
    payment_terms: "[Ejemplo] Aquí se imprimen las condiciones de pago que Iron Mallas configure en Mi cuenta → Tarifario.", warranty: null, notes: null,
    details: { kind: "quick", service: payload.service, mesh_type: payload.mesh_type, features: payload.features, work_address: payload.work_address,
      zones: payload.zones.map((z, i) => ({ ...z, area_milli_m2: r.zones[i].area_milli_m2, linear_mm: r.zones[i].linear_mm })), area_milli_m2: r.area_milli_m2, linear_mm: r.linear_mm, measure: r.measure, definitive: false,
      pricing: { mode: "rate", rule_name: rule.name, unit: rule.unit, unit_price: rule.unit_price, min_applied: r.min_applied, surcharge_bps: 0 }, main_amount: r.main, surcharge_amount: r.surcharge, extras: [] } },
  contact: { name: "Cliente de ejemplo", phone: null, whatsapp: "56900000000", email: null, address: null, unit: null, commune: null, region: null },
  items: [{ description: "Mallas de seguridad · 5,200 m lineales", unit: "fixed", quantity_milli: 1000, unit_price: r.main, min_price: 0, surcharge_bps: 0, line_total: r.main, material: null, location: null }],
  company: { name: company.legalName, email: company.email, phone: company.phoneDisplay },
});
async function main() {
  const out = process.argv[2] ?? "cotizacion-ejemplo.pdf";
  const logo = await readFile("public/brand/logo-color.png");
  await writeFile(out, await generateQuotePdf(snapshot, undefined, logo));
  console.log(out, { linear_mm: r.linear_mm, main: r.main, net: r.net, tax: r.tax, total: r.total });
}
void main();
