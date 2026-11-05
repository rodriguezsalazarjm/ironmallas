/** Integer CLP arithmetic. All intermediate operations use BigInt; half pesos round up. */
export type Rate = {
  id: string; name: string; unit: "m2" | "unit" | "hour" | "fixed";
  unit_price: number; min_price: number; surcharge_bps: number; max_discount_bps: number;
  active: boolean; material: string | null;
};
export type QuoteLineInput = { rule_id: string; width_mm: number; height_mm: number; quantity_milli: number; description?: string; location?: string };
export type CalculatedLine = QuoteLineInput & { name: string; unit: Rate["unit"]; material: string | null; unit_price: number; min_price: number; surcharge_bps: number; area_m2: string | null; base: number; surcharge: number; subtotal: number };
export type QuoteCalculation = { items: CalculatedLine[]; subtotal: number; discount: number; net: number; tax: number; total: number; tax_bps: number; discount_bps: number };
const MAX_MONEY = BigInt("2147483647");
function integer(value: number, maximum: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw new Error(`Valor inválido: ${field}`);
  return BigInt(value);
}
function money(value: bigint): number {
  if (value < BigInt(0) || value > MAX_MONEY) throw new Error("El importe supera el límite permitido.");
  return Number(value);
}
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < BigInt(0) || denominator <= BigInt(0)) throw new Error("Cálculo monetario inválido.");
  return (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
}
/** Convert decimal user input to a scaled integer without floating point arithmetic. */
export function parseScaledDecimal(value: string, decimals: number): number {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match || (match[2]?.length ?? 0) > decimals || match[1].length > 9) throw new Error("Usa un número positivo con hasta tres decimales.");
  const result = BigInt(match[1]) * BigInt(10 ** decimals) + BigInt((match[2] ?? "").padEnd(decimals, "0") || "0");
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("El número es demasiado grande.");
  return Number(result);
}
export function calculateQuote(lines: QuoteLineInput[], rates: Rate[], discountBps: number, taxBps: number, superadmin = false): QuoteCalculation {
  if (!lines.length || lines.length > 50) throw new Error("Agrega entre 1 y 50 conceptos.");
  const taxRate = integer(taxBps,10000,"IVA");
  const discountRate = integer(discountBps,10000,"descuento");
  const items = lines.map(line => {
    const rate = rates.find(r => r.id === line.rule_id && r.active);
    if (!rate) throw new Error("Selecciona una tarifa activa configurada por Iron Mallas.");
    if (!superadmin && discountBps > rate.max_discount_bps) throw new Error("El descuento supera el autorizado por el tarifario.");
    const price = integer(rate.unit_price,2147483647,"precio");
    if (!price) throw new Error("Configura un precio real mayor que cero.");
    const minimum = integer(rate.min_price,2147483647,"mínimo");
    const surchargeRate = integer(rate.surcharge_bps,100000,"recargo");
    const quantity = integer(line.quantity_milli,1000000000,"cantidad");
    if (quantity === BigInt(0)) throw new Error("La cantidad debe ser mayor que cero.");
    const width = integer(line.width_mm,10000000,"ancho");
    const height = integer(line.height_mm,10000000,"alto");
    if (rate.unit === "m2" && (!width || !height)) throw new Error("Ingresa ancho y alto mayores que cero.");
    const raw = rate.unit === "m2" ? roundHalfUp(price * width * height * quantity,BigInt(1000000000)) : roundHalfUp(price * quantity,BigInt(1000));
    const base = raw > minimum ? raw : minimum;
    const surcharge = roundHalfUp(base * surchargeRate,BigInt(10000));
    const areaMilli = rate.unit === "m2" ? roundHalfUp(width * height * quantity,BigInt(1000000)) : null;
    return { ...line, name:rate.name, unit:rate.unit, material:rate.material, unit_price:rate.unit_price, min_price:rate.min_price, surcharge_bps:rate.surcharge_bps,
      area_m2: areaMilli === null ? null : `${areaMilli/BigInt(1000)}.${String(areaMilli%BigInt(1000)).padStart(3,"0")}`,
      base:money(base), surcharge:money(surcharge), subtotal:money(base+surcharge) };
  });
  const subtotal = items.reduce((sum,item) => sum+BigInt(item.subtotal),BigInt(0));
  const discount = roundHalfUp(subtotal*discountRate,BigInt(10000));
  const net = subtotal-discount;
  const tax = roundHalfUp(net*taxRate,BigInt(10000));
  if (net+tax === BigInt(0)) throw new Error("La cotización debe tener un total mayor que cero.");
  return { items, subtotal:money(subtotal),discount:money(discount),net:money(net),tax:money(tax),total:money(net+tax),tax_bps:taxBps,discount_bps:discountBps };
}
export const clp = (value: number) => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(value);
