import { z } from "zod";

export const PRIVACY_REASON_MAX = 3000;
export const privacyRequestSchema = z.object({
  contact_id: z.uuid(),
  type: z.enum(["correction", "deletion", "export"]),
  reason: z.string().trim().min(5).max(PRIVACY_REASON_MAX),
});
