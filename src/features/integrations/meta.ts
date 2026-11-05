import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Adaptadores oficiales de Meta (Graph API). Sin scraping ni conexión de cuentas:
 * solo procesan webhooks firmados por la app de Meta configurada por Iron Mallas.
 */
export type IngestPayload = {
  source: "META_LEAD_AD" | "META_WHATSAPP"; external_id: string; name: string; phone: string; email: string; commune: string;
  service: string; message: string; campaign: string; ad_name: string; legal_basis: "consent" | "precontractual"; tracking: Record<string, string>;
};
export type Ingest = (payload: IngestPayload) => Promise<{ id: string; duplicate: boolean }>;

/** Valida X-Hub-Signature-256 (HMAC-SHA256 del cuerpo exacto con el App Secret). */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string | undefined): boolean {
  if (!appSecret || appSecret.length < 16 || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  let received: Buffer;
  try { received = Buffer.from(header.slice(7), "hex"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Respuesta al desafío de suscripción del webhook (GET hub.challenge). */
export function verifySubscription(params: URLSearchParams, verifyToken: string | undefined): string | null {
  if (!verifyToken || verifyToken.length < 16) return null;
  const token = params.get("hub.verify_token") ?? "";
  const ok = params.get("hub.mode") === "subscribe" && token.length === verifyToken.length && timingSafeEqual(Buffer.from(token), Buffer.from(verifyToken));
  const challenge = params.get("hub.challenge");
  return ok && challenge && /^[\w-]{1,200}$/.test(challenge) ? challenge : null;
}

const leadgenChange = z.object({ field: z.literal("leadgen"), value: z.object({ leadgen_id: z.string().regex(/^\d{1,30}$/), page_id: z.string().optional(), form_id: z.string().optional(), ad_id: z.string().optional(), adgroup_id: z.string().optional(), created_time: z.number().optional() }) });
const webhookBody = z.object({ object: z.string(), entry: z.array(z.object({ id: z.string().optional(), changes: z.array(z.unknown()).optional() })).max(100) });

export function leadgenEvents(body: unknown) {
  const parsed = webhookBody.safeParse(body);
  if (!parsed.success || parsed.data.object !== "page") return [];
  return parsed.data.entry.flatMap(entry => (entry.changes ?? []).flatMap(change => { const c = leadgenChange.safeParse(change); return c.success ? [c.data.value] : []; }));
}

const graphLead = z.object({
  id: z.string(), created_time: z.string().optional(), ad_id: z.string().optional(), ad_name: z.string().optional(), adset_name: z.string().optional(),
  campaign_name: z.string().optional(), form_id: z.string().optional(), platform: z.string().optional(),
  field_data: z.array(z.object({ name: z.string(), values: z.array(z.string()).default([]) })).default([]),
});
export type GraphLead = z.infer<typeof graphLead>;

/** Traduce los campos del formulario instantáneo a la ficha de Iron Mallas. Campos no reconocidos van al mensaje. */
export function mapLeadFields(lead: GraphLead): IngestPayload {
  const fields = new Map(lead.field_data.map(f => [f.name.toLowerCase(), (f.values[0] ?? "").trim()]));
  const take = (...names: string[]) => { for (const n of names) { const v = fields.get(n); if (v) { fields.delete(n); return v; } } return ""; };
  const name = take("full_name", "nombre_completo", "nombre") || [take("first_name"), take("last_name")].filter(Boolean).join(" ");
  const phone = take("phone_number", "telefono", "teléfono", "whatsapp");
  const email = take("email", "correo");
  const commune = take("city", "comuna", "ciudad");
  const service = take("servicio", "service", "que_servicio_necesitas", "¿qué_servicio_necesitas?");
  const rest = [...fields.entries()].filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n");
  return {
    source: "META_LEAD_AD", external_id: lead.id, name: name.slice(0, 80), phone, email, commune: commune.slice(0, 60), service: (service || "Por confirmar").slice(0, 160),
    message: rest.slice(0, 1500), campaign: (lead.campaign_name ?? "").slice(0, 200), ad_name: (lead.ad_name ?? "").slice(0, 200), legal_basis: "consent",
    tracking: Object.fromEntries(Object.entries({ meta_form_id: lead.form_id, meta_ad_id: lead.ad_id, meta_adset: lead.adset_name, meta_platform: lead.platform, meta_created_time: lead.created_time }).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0).map(([k, v]) => [k, v.slice(0, 200)])),
  };
}

export async function fetchGraphLead(leadgenId: string, token: string, version = "v21.0", fetchImpl: typeof fetch = fetch): Promise<GraphLead> {
  const fields = "id,created_time,ad_id,ad_name,adset_name,campaign_name,form_id,platform,field_data";
  const response = await fetchImpl(`https://graph.facebook.com/${version}/${leadgenId}?fields=${fields}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Graph API respondió ${response.status}`);
  return graphLead.parse(await response.json());
}

export type LeadAdsConfig = { pageId?: string; formIds?: string[]; token: string; version?: string };

/**
 * Procesa los eventos leadgen de un webhook ya autenticado. Devuelve "retry" si algún lead no pudo
 * obtenerse o guardarse (Meta reintentará); los duplicados son idempotentes por leadgen_id.
 */
export async function processLeadgen(body: unknown, config: LeadAdsConfig, ingest: Ingest, fetchImpl: typeof fetch = fetch) {
  const results: { leadgen_id: string; status: "created" | "duplicate" | "ignored" | "failed" }[] = [];
  for (const event of leadgenEvents(body)) {
    if ((config.pageId && event.page_id !== config.pageId) || (config.formIds?.length && (!event.form_id || !config.formIds.includes(event.form_id)))) { results.push({ leadgen_id: event.leadgen_id, status: "ignored" }); continue; }
    try {
      const lead = await fetchGraphLead(event.leadgen_id, config.token, config.version, fetchImpl);
      const payload = mapLeadFields(lead);
      if (event.ad_id && !payload.tracking.meta_ad_id) payload.tracking.meta_ad_id = event.ad_id;
      const saved = await ingest(payload);
      results.push({ leadgen_id: event.leadgen_id, status: saved.duplicate ? "duplicate" : "created" });
    } catch { results.push({ leadgen_id: event.leadgen_id, status: "failed" }); }
  }
  return { results, retry: results.some(r => r.status === "failed") };
}

// ---- WhatsApp Business Platform (Cloud API) · adaptador opcional ----
const waMessage = z.object({
  from: z.string().regex(/^\d{8,15}$/), id: z.string(), timestamp: z.string().optional(), type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  referral: z.object({ source_url: z.string().optional(), source_id: z.string().optional(), source_type: z.string().optional(), headline: z.string().optional(), ctwa_clid: z.string().optional() }).optional(),
});
const waValue = z.object({ messaging_product: z.literal("whatsapp"), contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() })).optional(), messages: z.array(waMessage).optional() });

/**
 * Convierte mensajes entrantes en oportunidades META_WHATSAPP. Una oportunidad por número y día
 * (external_id = número:fecha de Santiago) para no duplicar por cada mensaje de la conversación.
 */
export function whatsappLeads(body: unknown, now = new Date()): IngestPayload[] {
  const parsed = webhookBody.safeParse(body);
  if (!parsed.success || parsed.data.object !== "whatsapp_business_account") return [];
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(now);
  const out = new Map<string, IngestPayload>();
  for (const entry of parsed.data.entry) for (const change of entry.changes ?? []) {
    const c = z.object({ field: z.literal("messages"), value: waValue }).safeParse(change);
    if (!c.success) continue;
    for (const m of c.data.value.messages ?? []) {
      const key = `${m.from}:${day}`;
      if (out.has(key)) continue;
      const profile = c.data.value.contacts?.find(x => x.wa_id === m.from)?.profile?.name ?? "";
      out.set(key, {
        source: "META_WHATSAPP", external_id: key, name: profile.slice(0, 80), phone: m.from, email: "", commune: "", service: "Por confirmar",
        message: (m.text?.body ?? `[mensaje ${m.type}]`).slice(0, 1500), campaign: (m.referral?.headline ?? "").slice(0, 200), ad_name: (m.referral?.source_id ?? "").slice(0, 200), legal_basis: "precontractual",
        tracking: Object.fromEntries(Object.entries({ wa_message_id: m.id, ctwa_clid: m.referral?.ctwa_clid, referral_source_type: m.referral?.source_type, referral_source_url: m.referral?.source_url }).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0).map(([k, v]) => [k, v.slice(0, 200)])),
      });
    }
  }
  return [...out.values()];
}
