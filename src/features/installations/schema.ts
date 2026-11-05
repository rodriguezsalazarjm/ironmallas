import { z } from "zod";

// Keep the original Postgres timestamp string: Date/ISO conversion loses microseconds.
export const installationEditSchema = z.object({
  id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
});
export const installationStatusSchema = installationEditSchema.extend({
  status: z.enum(["pending", "scheduled", "in_progress", "completed", "cancelled", "rescheduled"]),
  notes: z.string().trim().min(1).max(4000),
});
export const installationScheduleSchema = installationEditSchema.extend({
  scheduled: z.string().min(1),
  technician: z.union([z.uuid(), z.literal("")]),
  address: z.string().trim().min(3).max(240),
  commune: z.string().trim().min(2).max(60),
  notes: z.string().max(4000),
});
