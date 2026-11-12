import { z } from "zod";
export const companySchema = z.object({
  name:z.string().trim().min(2).max(160),rut:z.string().trim().max(30),address:z.string().trim().min(3).max(240),
  email:z.email().max(120),phone:z.string().trim().min(8).max(30),
});
export const commercialSchema = z.object({
  company:companySchema,tax_bps:z.number().int().min(0).max(10000),validity_days:z.number().int().min(1).max(365),
  payment_terms:z.string().trim().min(1).max(3000),warranty:z.string().trim().max(3000),
  /** Tratamientos sin IVA permitidos, con fundamento legal validado por el contador. Vacío = solo operaciones afectas. */
  tax_exemptions:z.array(z.object({key:z.string().trim().regex(/^[a-z0-9_-]{2,60}$/),label:z.string().trim().min(3).max(120),kind:z.enum(["exempt","not_affected"]),legal_basis:z.string().trim().min(10).max(500)})).max(20).default([]),
});
export type Commercial = z.infer<typeof commercialSchema>;
export const pricingSchema = z.object({
  id:z.union([z.uuid(),z.literal("")]),service_id:z.union([z.uuid(),z.literal("")]),name:z.string().trim().min(2).max(160),
  unit:z.enum(["m2","ml","unit","hour","fixed"]),unit_price:z.coerce.number().int().min(1).max(2147483647),
  min_price:z.coerce.number().int().min(0).max(2147483647),material:z.string().trim().max(160),
  surcharge_bps:z.number().int().min(0).max(100000),max_discount_bps:z.number().int().min(0).max(10000),active:z.boolean(),
});
