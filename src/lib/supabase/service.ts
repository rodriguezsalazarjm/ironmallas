import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";
/** Only trusted background operations or explicitly authorized server actions may use this. */
export function createServiceClient() {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret) throw new Error("Integración pendiente de configuración");
  return createClient<Database>(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
