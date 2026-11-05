"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/features/quotes/quick";
import { fromSantiagoInput } from "@/features/crm/time";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(24),
  service: z.string().trim().min(2).max(160),
  commune: z.string().trim().max(60),
  note: z.string().trim().max(1500),
  status: z.uuid(),
  next_action: z.string().trim().max(300),
  follow_up: z.string().max(30),
  source: z.enum(["WHATSAPP_MANUAL", "CONTACTO_MANUAL"]),
});

/**
 * Alta rápida de una oportunidad recibida por WhatsApp (o por teléfono/en persona).
 * Reutiliza el contacto con el mismo número; si ya tiene una oportunidad abierta en las últimas 72 h
 * no crea otra, solo registra la nota en su historial.
 */
export async function createWhatsappLead(_: string, form: FormData): Promise<string> {
  const { db, profile } = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa nombre, teléfono, servicio y estado.";
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  if (!phone) return "Ingresa un teléfono válido, por ejemplo +56 9 1234 5678.";
  let followUp: string | null = null;
  if (d.follow_up) { try { followUp = fromSantiagoInput(d.follow_up); } catch { return "La fecha de seguimiento no es válida."; } }

  const [statuses, existing] = await Promise.all([
    db.from("lead_statuses").select("id,is_final,active"),
    db.from("contacts").select("id,commune").or(`phone.eq.${phone},whatsapp.eq.${phone}`).order("created_at").limit(1),
  ]);
  if (statuses.error || existing.error) return "No se pudo comprobar si el contacto ya existe.";
  if (!statuses.data.some(s => s.id === d.status && s.active)) return "Selecciona un estado activo.";

  let contactId = existing.data[0]?.id;
  if (contactId) {
    if (!existing.data[0].commune && d.commune) await db.from("contacts").update({ commune: d.commune }).eq("id", contactId);
    const open = statuses.data.filter(s => !s.is_final).map(s => s.id);
    const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    const recent = await db.from("leads").select("id").eq("contact_id", contactId).in("status_id", open).gte("created_at", since).order("created_at", { ascending: false }).limit(1);
    if (!recent.error && recent.data[0]) {
      if (d.note) await db.rpc("record_lead_activity", { target: recent.data[0].id, new_status: d.status, activity_type: "whatsapp", body: d.note, follow_up: followUp });
      revalidatePath("/admin", "layout");
      redirect(`/admin/leads/${recent.data[0].id}?duplicado=1`);
    }
  } else {
    const created = await db.from("contacts").insert({ name: d.name, phone, whatsapp: phone, email: null, commune: d.commune || null, source: d.source.toLowerCase() }).select("id").single();
    if (created.error || !created.data) return "No se pudo registrar el contacto. Si el problema continúa, falta aplicar la migración 20261105120000 (correo opcional).";
    contactId = created.data.id;
  }
  const lead = await db.from("leads").insert({
    contact_id: contactId, service: d.service, message: d.note || null, status_id: d.status, source: d.source, tracking: {},
    consent: true, legal_basis: "precontractual", source_confidence: "self_declared", campaign_attribution: "none",
    next_action: d.next_action || "Responder por WhatsApp", next_follow_up_at: followUp, assigned_to: profile.id,
  }).select("id").single();
  if (lead.error || !lead.data) return "No se pudo guardar la oportunidad. Verifica que la migración 20261105120000 esté aplicada.";
  revalidatePath("/admin", "layout");
  redirect(`/admin/leads/${lead.data.id}?nuevo=1`);
}

/** Actualiza la próxima acción visible en la bandeja y el dashboard. */
export async function saveNextAction(_: string, form: FormData): Promise<string> {
  const { db } = await requireAdmin();
  const parsed = z.object({ id: z.uuid(), next_action: z.string().trim().max(300) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Revisa la próxima acción.";
  const { error } = await db.from("leads").update({ next_action: parsed.data.next_action || null }).eq("id", parsed.data.id);
  if (error) return "No se guardó la próxima acción.";
  revalidatePath("/admin", "layout");
  return "Próxima acción guardada.";
}
