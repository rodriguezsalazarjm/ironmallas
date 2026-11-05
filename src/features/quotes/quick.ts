/**
 * Cotizador rápido. Aritmética entera con BigInt que replica exactamente `private.save_quick_quote`
 * (round() de PostgreSQL = mitad hacia arriba en valores positivos). La vista previa del navegador y la
 * comprobación del servidor usan esta misma función.
 */
import { z } from "zod";
import { roundHalfUp } from "./calculation";

export const ZONE_KINDS = { balcon: "Balcón", ventana: "Ventana", logia: "Logia", terraza: "Terraza", otra: "Otra zona" } as const;
export type ZoneKind = keyof typeof ZONE_KINDS;
export const EXTRA_KINDS = { adicional: "Adicional", lateral: "Lateral / trabajo adicional", recargo: "Recargo" } as const;
export type ExtraKind = keyof typeof EXTRA_KINDS;

const MAX_MONEY = BigInt(2147483647);
const text = (max: number) => z.string().trim().max(max);

export const zoneSchema = z.object({
  kind: z.enum(Object.keys(ZONE_KINDS) as [ZoneKind, ...ZoneKind[]]),
  description: text(200),
  width_mm: z.number().int().min(1).max(100000),
  height_mm: z.number().int().min(1).max(100000),
  quantity: z.number().int().min(1).max(1000),
  notes: text(500),
});
export const extraSchema = z.union([
  z.object({ kind: z.enum(Object.keys(EXTRA_KINDS) as [ExtraKind, ...ExtraKind[]]), description: text(200).min(2), rule_id: z.uuid(), quantity_milli: z.number().int().min(1).max(1000000) }),
  z.object({ kind: z.enum(Object.keys(EXTRA_KINDS) as [ExtraKind, ...ExtraKind[]]), description: text(200).min(2), amount: z.number().int().min(1).max(2147483647), source: text(200).min(3) }),
]);
export const quickPayloadSchema = z.object({
  service: text(160).min(2),
  mesh_type: text(120),
  features: z.array(text(60).min(1)).max(10),
  work_address: text(300),
  zones: z.array(zoneSchema).min(1).max(30),
  pricing: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("rate"), rule_id: z.uuid() }),
    z.object({ mode: z.literal("manual"), manual_net: z.number().int().min(1).max(2147483647), manual_source: text(300).min(5) }),
  ]),
  extras: z.array(extraSchema).max(20),
  discount_bps: z.number().int().min(0).max(10000),
  apply_tax: z.boolean(),
  notes: text(3000),
});
export type QuickPayload = z.infer<typeof quickPayloadSchema>;
export type QuickRate = { id: string; name: string; unit: "m2" | "unit" | "hour" | "fixed"; unit_price: number; min_price: number; surcharge_bps: number; max_discount_bps: number; active: boolean };
export type QuickResult = {
  zones: { area_milli_m2: number }[]; area_milli_m2: number; main: number; surcharge: number; min_applied: boolean;
  extras: number[]; subtotal: number; discount: number; net: number; tax_bps: number; tax: number; total: number; max_discount_bps: number;
};

function money(value: bigint) {
  if (value < BigInt(0) || value > MAX_MONEY) throw new Error("El importe supera el límite permitido.");
  return Number(value);
}

/** Área en milésimas de m² con 3 decimales: "12,345". */
export function areaLabel(milli: number) {
  return `${Math.trunc(milli / 1000).toLocaleString("es-CL")},${String(milli % 1000).padStart(3, "0")}`;
}

/** Convierte "1,25" metros en milímetros exactos (hasta 3 decimales) sin coma flotante. */
export function metersToMm(value: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,3}))?$/.exec(value.trim());
  if (!match) return null;
  const mm = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0") || "0");
  return mm >= 1 && mm <= 100000 ? mm : null;
}

export function calculateQuick(payload: QuickPayload, rates: QuickRate[], taxBps: number, superadmin: boolean): QuickResult {
  const parsed = quickPayloadSchema.parse(payload);
  if (!Number.isSafeInteger(taxBps) || taxBps < 0 || taxBps > 10000) throw new Error("IVA no configurado.");
  if (!parsed.apply_tax && !superadmin) throw new Error("Solo SUPERADMIN puede omitir el IVA.");
  let areaMm2 = BigInt(0);
  const zones = parsed.zones.map(z => {
    const product = BigInt(z.width_mm) * BigInt(z.height_mm) * BigInt(z.quantity);
    areaMm2 += product;
    return { area_milli_m2: Number(roundHalfUp(product, BigInt(1000))) };
  });
  let main: bigint, surcharge = BigInt(0), maxDiscount = 10000, minApplied = false;
  if (parsed.pricing.mode === "rate") {
    const ruleId = parsed.pricing.rule_id;
    const rule = rates.find(r => r.id === ruleId && r.active);
    if (!rule || rule.unit !== "m2") throw new Error("Selecciona una tarifa por m² autorizada.");
    const raw = roundHalfUp(BigInt(rule.unit_price) * areaMm2, BigInt(1000000));
    minApplied = raw < BigInt(rule.min_price);
    main = minApplied ? BigInt(rule.min_price) : raw;
    surcharge = roundHalfUp(main * BigInt(rule.surcharge_bps), BigInt(10000));
    maxDiscount = rule.max_discount_bps;
  } else {
    if (!superadmin) throw new Error("Solo SUPERADMIN puede ingresar un valor neto manual.");
    main = BigInt(parsed.pricing.manual_net);
  }
  const extras = parsed.extras.map(extra => {
    if ("rule_id" in extra) {
      const rule = rates.find(r => r.id === extra.rule_id && r.active);
      if (!rule || rule.unit === "m2") throw new Error("Tarifa de adicional no disponible.");
      const raw = roundHalfUp(BigInt(rule.unit_price) * BigInt(extra.quantity_milli), BigInt(1000));
      const base = raw > BigInt(rule.min_price) ? raw : BigInt(rule.min_price);
      maxDiscount = Math.min(maxDiscount, rule.max_discount_bps);
      return base + roundHalfUp(base * BigInt(rule.surcharge_bps), BigInt(10000));
    }
    if (!superadmin) throw new Error("Solo SUPERADMIN puede ingresar adicionales manuales.");
    return BigInt(extra.amount);
  });
  if (!superadmin && parsed.discount_bps > maxDiscount) throw new Error("El descuento supera el autorizado por el tarifario.");
  const subtotal = main + surcharge + extras.reduce((a, b) => a + b, BigInt(0));
  const discount = roundHalfUp(subtotal * BigInt(parsed.discount_bps), BigInt(10000));
  const net = subtotal - discount;
  const tax_bps = parsed.apply_tax ? taxBps : 0;
  const tax = roundHalfUp(net * BigInt(tax_bps), BigInt(10000));
  if (net + tax <= BigInt(0)) throw new Error("La cotización debe tener un total mayor que cero.");
  return {
    zones, area_milli_m2: Number(roundHalfUp(areaMm2, BigInt(1000))), main: money(main), surcharge: money(surcharge), min_applied: minApplied,
    extras: extras.map(money), subtotal: money(subtotal), discount: money(discount), net: money(net), tax_bps, tax: money(tax), total: money(net + tax), max_discount_bps: maxDiscount,
  };
}

/** Teléfono chileno normalizado a dígitos con prefijo 56 cuando corresponde. */
export function normalizePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = `56${digits}`;
  if (digits.length === 8) digits = `569${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
