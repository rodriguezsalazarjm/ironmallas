"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { isRateLimited } from "@/features/leads/rate-limit";
import { headers } from "next/headers";

export async function login(_: string, form: FormData): Promise<string> {
  if (!supabaseConfig()) return "El acceso aún no está configurado.";
  const parsed = z.object({ email: z.email().max(120), password: z.string().min(1).max(256) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa tu correo y contraseña.";
  const h = await headers();
  if (isRateLimited(`login:${h.get("x-forwarded-for") || "unknown"}`)) return "Espera unos minutos antes de volver a intentar.";
  const db = await createSupabaseServer();
  const { data, error } = await db.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return "No fue posible acceder con esas credenciales.";
  const { data: profile, error: profileError } = await db.from("profiles").select("role,active").eq("id", data.user.id).single();
  if (profileError || !profile?.active || !["ADMIN", "SUPERADMIN"].includes(profile.role)) {
    await db.auth.signOut();
    return "La cuenta no tiene acceso al panel. Contacta al administrador.";
  }
  redirect("/admin");
}
export async function logout() {
  const db = await createSupabaseServer();
  const { error } = await db.auth.signOut();
  if (error) throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
  redirect("/admin/login");
}
export async function recordActivity(_: string, form: FormData): Promise<string> {
  const { db } = await requireAdmin();
  const parsed = z.object({
    id: z.uuid(), status: z.uuid(), type: z.enum(["note", "call", "whatsapp", "email"]),
    note: z.string().trim().min(1).max(2000),
    followUp: z.union([z.literal(""), z.iso.datetime({ offset: true })]),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa el estado, la nota y la fecha del seguimiento.";
  const d = parsed.data;
  const { error } = await db.rpc("record_lead_activity", { target: d.id, new_status: d.status, activity_type: d.type, body: d.note, follow_up: d.followUp || null });
  if (error) return "No se guardaron los cambios. Intenta nuevamente.";
  revalidatePath("/admin", "layout");
  return "Actividad y seguimiento guardados.";
}
export async function saveStatus(_: string, form: FormData): Promise<string> {
  const { db, profile } = await requireAdmin();
  if (profile.role !== "SUPERADMIN") return "No tienes permiso para cambiar estados.";
  const parsed = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(80), position: z.coerce.number().int().min(0).max(1000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa el nombre y el orden.";
  const { id, ...value } = parsed.data;
  const { data, error } = await db.from("lead_statuses").update({ ...value, active: form.get("active") === "on", is_final: form.get("final") === "on" }).eq("id", id).select("id").single();
  if (error || !data) return "No se pudo guardar. El estado inicial debe permanecer activo y abierto.";
  revalidatePath("/admin", "layout");
  return "Estado actualizado.";
}
