import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type { LeadInput } from "./schema";
export type StoredLead = LeadInput & { source: "web_form"; submittedAt: string };
export type SaveLeadResult = { ok: true; id: string } | { ok: false; reason: "not_configured" | "failed" };
export async function saveLead(lead: StoredLead, rateKey: string): Promise<SaveLeadResult> {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret || (process.env.LEAD_RATE_LIMIT_SECRET?.length ?? 0) < 32) return { ok: false, reason: "not_configured" };
  try {
    const db = createClient<Database>(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc("submit_public_lead", { payload: lead, rate_key: rateKey });
    if (error || !data) return { ok: false, reason: "failed" };
    return { ok: true, id: data };
  } catch { return { ok: false, reason: "failed" }; }
}
