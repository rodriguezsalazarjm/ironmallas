import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseConfig } from "./supabase/config";
import { createSupabaseServer } from "./supabase/server";

export const requireAdmin = cache(async () => {
  if (!supabaseConfig()) redirect("/admin/login");
  const db = await createSupabaseServer();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/admin/login");
  const { data: profile, error: profileError } = await db.from("profiles").select("*").eq("id", user.id).eq("active", true).single();
  if (profileError || !profile || !["ADMIN", "SUPERADMIN"].includes(profile.role)) redirect("/admin/login?error=access");
  return { db, profile };
});
