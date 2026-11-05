"use server";

import { headers } from "next/headers";
import { createHmac } from "node:crypto";

import { getSiteContent } from "@/lib/content";
import { whatsappUrl } from "@/lib/links";
import { isRateLimited } from "./rate-limit";
import { saveLead } from "./repository";
import { createLeadSchema, type LeadFieldErrors, type LeadFormState, type LeadInput } from "./schema";

/** Submissions faster than this are almost certainly automated. */
const MIN_FILL_MS = 3000;

const str = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : undefined;
};

function whatsappFallback(lead: LeadInput,phone:string): string {
  const lines = [
    "Hola Iron Mallas, quiero solicitar una cotización.",
    `Nombre: ${lead.name}`,
    `Servicio: ${lead.service}`,
    lead.commune && `Comuna: ${lead.commune}`,
    lead.message && `Mensaje: ${lead.message}`,
  ].filter(Boolean);
  return whatsappUrl(phone, lines.join("\n"));
}

export async function submitLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  // Honeypot: hidden from people, filled by naive bots.
  if (str(formData, "website")) {
    return { status: "error", message: "No pudimos procesar la solicitud." };
  }

  const startedAt = Number(str(formData, "startedAt"));
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "error", message: "Por favor revisa los datos e intenta nuevamente." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return {
      status: "error",
      message: "Recibimos varias solicitudes seguidas. Espera unos minutos o escríbenos por WhatsApp.",
    };
  }

  const content=await getSiteContent();
  const parsed = createLeadSchema(content.quoteForm.serviceOptions as [string,...string[]]).safeParse({
    name: str(formData, "name"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    service: str(formData, "service"),
    commune: str(formData, "commune"),
    message: str(formData, "message"),
    consent: str(formData, "consent"),
    tracking: {
      utmSource: str(formData, "utm_source"),
      utmMedium: str(formData, "utm_medium"),
      utmCampaign: str(formData, "utm_campaign"),
      utmContent: str(formData, "utm_content"),
      utmTerm: str(formData, "utm_term"),
      landingPage: str(formData, "landing_page"),
      referrer: str(formData, "referrer"),
      fbclid: str(formData, "fbclid"),
      gclid: str(formData, "gclid"),
    },
    submission_id: str(formData, "submission_id") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: LeadFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof LeadFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "invalid", fieldErrors, message: "Revisa los campos marcados." };
  }

  const rateKey = createHmac("sha256", process.env.LEAD_RATE_LIMIT_SECRET || "unconfigured").update(ip).digest("hex");
  const result = await saveLead({ ...parsed.data, source: "web_form", submittedAt: new Date().toISOString() }, rateKey);

  if (result.ok) {
    return {
      status: "success",
      message: "Recibimos tu solicitud. Te contactaremos en menos de 24 horas hábiles.",
      whatsappHref: whatsappFallback(parsed.data,content.contact.phoneE164),
    };
  }

  if (result.reason === "not_configured") {
    return {
      status: "unavailable",
      message:
        "El envío en línea aún no está habilitado. Tu mensaje no se ha enviado: puedes enviarlo ahora por WhatsApp con los datos ya completados.",
      whatsappHref: whatsappFallback(parsed.data,content.contact.phoneE164),
    };
  }

  return {
    status: "error",
    message: "No pudimos guardar tu solicitud. Tus datos no se perdieron: envíalos por WhatsApp con el botón o intenta nuevamente.",
    whatsappHref: whatsappFallback(parsed.data,content.contact.phoneE164),
  };
}
