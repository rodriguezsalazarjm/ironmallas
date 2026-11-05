import { z } from "zod";
const optional = (max: number) => z.string().trim().max(max).transform(v => v || null);
export const contactSchema = z.object({
  id: z.union([z.uuid(),z.literal("")]),
  updated_at:z.string().max(60).optional(),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[+\d\s()-]+$/).transform(v => v.replace(/\D/g,"")).refine(v => /^\d{8,15}$/.test(v)),
  email: z.union([z.literal(""), z.email().trim().max(120)]).transform(v => v ? v.toLowerCase() : null),
  whatsapp: optional(24).refine(v => !v || /^[+\d ()-]{8,24}$/.test(v)),
  address: optional(240), unit: optional(80), commune: optional(60), region: optional(100),
  location_url: optional(500).refine(v => !v || /^https:\/\//.test(v)),
  notes: optional(4000), source: z.string().trim().min(1).max(120),
});
export const taskSchema = z.object({ contact_id:z.uuid(), lead_id:z.union([z.uuid(),z.literal("")]), title:z.string().trim().min(2).max(160), due_at:z.string().min(1), assigned_to:z.union([z.uuid(),z.literal("")]), notes:z.string().trim().max(2000) });
export const manualLeadSchema = z.object({ contact_id:z.uuid(), service:z.string().trim().min(2).max(160), message:z.string().trim().max(1500), assigned_to:z.union([z.uuid(),z.literal("")]) });
export function safeSearch(value: unknown) { return typeof value === "string" ? value.trim().replace(/[^\p{L}\p{N}@.+\s-]/gu,"").slice(0,100) : ""; }
