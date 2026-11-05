import { processLeadgen, verifyMetaSignature, verifySubscription } from "@/features/integrations/meta";
import { serviceIngest } from "@/features/integrations/ingest";

/** Webhook oficial de Meta Lead Ads (campo `leadgen`). Requiere App Secret, token de verificación y token de página con leads_retrieval. */
export async function GET(request: Request) {
  const challenge = verifySubscription(new URL(request.url).searchParams, process.env.META_VERIFY_TOKEN);
  return challenge ? new Response(challenge, { headers: { "Content-Type": "text/plain" } }) : new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 512_000) return new Response("Payload too large", { status: 413 });
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET)) return new Response("Invalid signature", { status: 401 });
  const token = process.env.META_PAGE_ACCESS_TOKEN, ingest = serviceIngest();
  if (!token || !ingest) return new Response("Integration not configured", { status: 503 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response("Bad request", { status: 400 }); }
  const formIds = (process.env.META_LEAD_FORM_IDS ?? "").split(",").map(v => v.trim()).filter(Boolean);
  const { results, retry } = await processLeadgen(body, { token, pageId: process.env.META_PAGE_ID || undefined, formIds, version: process.env.META_GRAPH_VERSION || undefined }, ingest);
  // Solo ids y estados: nunca datos personales en logs.
  console.info("meta-leadgen", JSON.stringify(results));
  return new Response(retry ? "Retry" : "OK", { status: retry ? 500 : 200 });
}
