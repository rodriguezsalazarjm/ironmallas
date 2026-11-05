import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type { Ingest } from "./meta";

/** Cliente de servicio para la entrada única `ingest_external_lead` (idempotente por fuente + id externo). */
export function serviceIngest(): Ingest | null {
  const config = supabaseConfig(), secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret) return null;
  const db = createClient<Database>(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return async payload => {
    const { data, error } = await db.rpc("ingest_external_lead", { p: payload });
    const result = data as { id?: string; duplicate?: boolean } | null;
    if (error || !result?.id) throw new Error("No se pudo registrar la oportunidad externa.");
    return { id: result.id, duplicate: Boolean(result.duplicate) };
  };
}
