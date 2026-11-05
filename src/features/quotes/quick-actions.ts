"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { commercialSchema } from "@/features/pricing/schema";
import { calculateQuick, normalizePhone, quickPayloadSchema } from "./quick";

const contactInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), id: z.uuid() }),
  z.object({
    mode: z.literal("new"),
    name: z.string().trim().min(2).max(80),
    whatsapp: z.string().trim().min(8).max(24),
    address: z.string().trim().max(240),
    commune: z.string().trim().max(60),
    email: z.union([z.literal(""), z.email().trim().max(120)]),
  }),
]);
const requestSchema = z.object({
  contact: contactInput,
  lead_id: z.uuid().nullable(),
  quote_id: z.uuid().nullable(),
  expected_version: z.number().int().positive().nullable(),
  expected_total: z.number().int().nonnegative(),
  quote: quickPayloadSchema,
});
export type QuickQuoteState = { ok: boolean; message: string; id?: string; version?: number; total?: number; contactId?: string; warning?: string };

const MIGRATION_HINT = "El cotizador rápido necesita aplicar la migración 20261105120000_commercial_simplification en Supabase.";

export async function saveQuickQuote(_: QuickQuoteState, form: FormData): Promise<QuickQuoteState> {
  const { db, profile } = await requireAdmin();
  const superadmin = profile.role === "SUPERADMIN";
  const raw = form.get("payload");
  if (typeof raw !== "string" || raw.length > 60000) return { ok: false, message: "La cotización no es válida." };
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(raw); } catch { return { ok: false, message: "Revisa los datos de la cotización." }; }
  const parsed = requestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `Revisa ${issue?.path.join(" → ") || "los campos"}: ${issue?.message ?? "dato inválido"}.` };
  }
  const input = parsed.data;

  // 1. Tarifas y condiciones vigentes (misma fuente que usará la base de datos).
  const [rules, commercial] = await Promise.all([
    db.from("pricing_rules").select("*").eq("active", true),
    db.from("settings").select("value").eq("key", "commercial").maybeSingle(),
  ]);
  if (rules.error || commercial.error) return { ok: false, message: "No se pudieron cargar las tarifas vigentes." };
  const settings = commercialSchema.safeParse(commercial.data?.value);
  if (!settings.success) return { ok: false, message: "Faltan las condiciones comerciales (IVA, validez, datos de la empresa y condiciones de pago). Configúralas en Mi cuenta → Tarifario." };
  let preview;
  try { preview = calculateQuick(input.quote, rules.data, settings.data.tax_bps, superadmin); }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "No se pudo calcular la cotización." }; }

  // 2. Cliente: existente o nuevo (reutiliza contacto con el mismo teléfono para evitar duplicados).
  let contactId: string; let reused = false;
  if (input.contact.mode === "existing") {
    const found = await db.from("contacts").select("id").eq("id", input.contact.id).maybeSingle();
    if (found.error || !found.data) return { ok: false, message: "El cliente seleccionado no existe." };
    contactId = found.data.id;
  } else {
    const phone = normalizePhone(input.contact.whatsapp);
    if (!phone) return { ok: false, message: "Ingresa un WhatsApp válido, por ejemplo +56 9 1234 5678." };
    const existing = await db.from("contacts").select("id").or(`phone.eq.${phone},whatsapp.eq.${phone}`).order("created_at").limit(1);
    if (existing.error) return { ok: false, message: "No se pudo comprobar si el cliente ya existe." };
    if (existing.data[0]) { contactId = existing.data[0].id; reused = true; }
    else {
      const created = await db.from("contacts").insert({
        name: input.contact.name, phone, whatsapp: phone, email: input.contact.email ? input.contact.email.toLowerCase() : null,
        address: input.contact.address || null, commune: input.contact.commune || null, source: "cotizador",
      }).select("id").single();
      if (created.error || !created.data) return { ok: false, message: input.contact.email ? "No se pudo registrar el cliente. Revisa si ya existe con ese correo." : `No se pudo registrar el cliente sin correo. ${MIGRATION_HINT}` };
      contactId = created.data.id;
    }
  }

  // 3. Oportunidad: la indicada, la última abierta del cliente o una nueva de origen manual.
  let leadId = input.lead_id;
  if (leadId) {
    const lead = await db.from("leads").select("id").eq("id", leadId).eq("contact_id", contactId).maybeSingle();
    if (lead.error || !lead.data) leadId = null;
  }
  if (!leadId && !input.quote_id) {
    const statuses = await db.from("lead_statuses").select("id,key,is_final");
    if (statuses.error) return { ok: false, message: "No se pudo preparar la oportunidad." };
    const open = statuses.data.filter(s => !s.is_final).map(s => s.id);
    const recent = await db.from("leads").select("id").eq("contact_id", contactId).in("status_id", open).order("created_at", { ascending: false }).limit(1);
    if (recent.error) return { ok: false, message: "No se pudo revisar las oportunidades del cliente." };
    if (recent.data[0]) leadId = recent.data[0].id;
    else {
      const status = statuses.data.find(s => s.key === "new");
      if (!status) return { ok: false, message: "Falta el estado inicial de oportunidades." };
      const lead = await db.from("leads").insert({
        contact_id: contactId, service: input.quote.service, status_id: status.id, source: "CONTACTO_MANUAL", tracking: {},
        consent: true, legal_basis: "precontractual", source_confidence: "self_declared", next_action: "Enviar cotización", assigned_to: profile.id,
      }).select("id").single();
      if (lead.error || !lead.data) return { ok: false, message: `No se pudo crear la oportunidad asociada. ${MIGRATION_HINT}`, contactId };
      leadId = lead.data.id;
    }
  }

  // 4. Guardado transaccional con snapshot y versión.
  const { data: id, error } = await db.rpc("save_quick_quote", { p_contact_id: contactId, p_lead_id: leadId, p_quote_id: input.quote_id, p_expected_version: input.expected_version, p: input.quote });
  if (error || !id) {
    const missing = /function|schema cache|does not exist/i.test(error?.message ?? "");
    return { ok: false, contactId, message: missing ? MIGRATION_HINT : "No se guardó. Comprueba tarifas, permisos y condiciones. Si otra persona editó esta cotización, recarga la página." };
  }
  const saved = await db.from("quotes").select("total,current_version").eq("id", id).single();
  revalidatePath("/admin", "layout");
  if (saved.error) return { ok: true, id, contactId, message: "Borrador guardado." };
  const warnings = [
    reused ? "Ya existía un cliente con ese WhatsApp: se asoció a su ficha." : "",
    saved.data.total !== preview.total || saved.data.total !== input.expected_total ? `Atención: el total guardado (${saved.data.total}) difiere de la vista previa (${input.expected_total}). Revisa la tarifa vigente antes de compartir.` : "",
  ].filter(Boolean).join(" ");
  return { ok: true, id, contactId, version: saved.data.current_version, total: saved.data.total, message: `Borrador guardado · versión ${saved.data.current_version}.`, warning: warnings || undefined };
}
