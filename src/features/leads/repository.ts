import "server-only";

import type { LeadInput } from "./schema";

export type StoredLead = LeadInput & {
  source: "web_form";
  submittedAt: string;
};

export type SaveLeadResult = { ok: true; id: string } | { ok: false; reason: "not_configured" | "failed" };

/**
 * Persistence boundary for leads.
 *
 * Phase 1 has no database on purpose, so this reports `not_configured` and the
 * form tells the visitor honestly that online submission is not enabled yet.
 * Phase 2 replaces the body with a Supabase insert into `leads` (server-side
 * service role, RLS on), returning the new row id.
 */
export async function saveLead(lead: StoredLead): Promise<SaveLeadResult> {
  void lead;
  return { ok: false, reason: "not_configured" };
}
