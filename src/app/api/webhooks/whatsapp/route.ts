import { verifyMetaSignature, verifySubscription, whatsappLeads } from "@/features/integrations/meta";
import { serviceIngest } from "@/features/integrations/ingest";

/**
 * Adaptador opcional para WhatsApp Business Platform (Cloud API). Inactivo salvo WHATSAPP_CLOUD_ENABLED=true.
 * No conectar el número comercial sin verificar antes su elegibilidad para coexistencia.
 */
const enabled = () => process.env.WHATSAPP_CLOUD_ENABLED === "true";

export async function GET(request: Request) {
  if (!enabled()) return new Response("Not found", { status: 404 });
  const challenge = verifySubscription(new URL(request.url).searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
  return challenge ? new Response(challenge, { headers: { "Content-Type": "text/plain" } }) : new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  if (!enabled()) return new Response("Not found", { status: 404 });
  const raw = await request.text();
  if (raw.length > 512_000) return new Response("Payload too large", { status: 413 });
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) return new Response("Invalid signature", { status: 401 });
  const ingest = serviceIngest();
  if (!ingest) return new Response("Integration not configured", { status: 503 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response("Bad request", { status: 400 }); }
  let failed = 0;
  for (const lead of whatsappLeads(body)) { try { await ingest(lead); } catch { failed++; } }
  return new Response(failed ? "Retry" : "OK", { status: failed ? 500 : 200 });
}
