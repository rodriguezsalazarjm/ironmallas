"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createSupabaseBrowser() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase no configurado");
  return createBrowserClient<Database>(config.url, config.key);
}
