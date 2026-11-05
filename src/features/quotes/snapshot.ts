import { z } from "zod";
const money=z.number().int().nonnegative().max(2147483647);
const nullableText=z.string().nullable().optional();
export const quoteSnapshotSchema=z.object({
  quote:z.object({id:z.uuid(),number:z.number().int().positive(),current_version:z.number().int().positive(),created_at:z.string(),valid_until:z.string(),status:z.string(),subtotal:money,discount_bps:z.number().int(),discount_amount:money,net:money,tax_bps:z.number().int(),tax:money,total:money,payment_terms:z.string(),warranty:nullableText,notes:nullableText,details:z.record(z.string(),z.unknown()).optional()}),
  contact:z.object({name:z.string(),phone:nullableText,whatsapp:nullableText,email:nullableText,address:nullableText,unit:nullableText,commune:nullableText,region:nullableText}),
  items:z.array(z.object({description:z.string(),unit:z.enum(["m2","unit","hour","fixed"]),width_mm:z.number().nullable().optional(),height_mm:z.number().nullable().optional(),quantity_milli:z.number().int().positive(),unit_price:money,min_price:money,surcharge_bps:z.number().int(),line_total:money,material:nullableText,location:nullableText})).min(1).max(50),
  company:z.object({name:z.string().min(1),rut:z.string().optional(),address:z.string().optional(),email:z.string().optional(),phone:z.string().optional()}),
});
export type QuoteSnapshot=z.infer<typeof quoteSnapshotSchema>;
const zone=z.object({kind:z.string(),description:z.string(),width_mm:z.number(),height_mm:z.number(),quantity:z.number(),area_milli_m2:z.number(),notes:z.string().optional()});
/** Detalle del cotizador rápido guardado en quotes.details y copiado en cada snapshot. */
export const quickDetailsSchema=z.object({kind:z.literal("quick"),service:z.string(),mesh_type:z.string().optional(),features:z.array(z.string()).optional(),work_address:z.string().optional(),zones:z.array(zone).min(1),area_milli_m2:z.number(),
  pricing:z.object({mode:z.enum(["rate","manual"]),rule_name:z.string().optional(),unit_price:z.number().optional(),min_applied:z.boolean().optional(),surcharge_bps:z.number().optional()}),main_amount:z.number(),surcharge_amount:z.number(),
  extras:z.array(z.object({kind:z.string(),description:z.string(),amount:z.number()})).optional()});
export type QuickDetails=z.infer<typeof quickDetailsSchema>;
