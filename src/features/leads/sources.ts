/** Fuentes de oportunidades. Los valores heredados (web_form, manual) se muestran con su equivalente. */
export const LEAD_SOURCES = {
  WEB: "Formulario web",
  META_LEAD_AD: "Formulario Meta (Facebook/Instagram)",
  META_WHATSAPP: "WhatsApp (Cloud API)",
  WHATSAPP_MANUAL: "WhatsApp (registro manual)",
  CONTACTO_MANUAL: "Contacto manual",
} as const;
export type LeadSource = keyof typeof LEAD_SOURCES;
const LEGACY: Record<string, LeadSource> = { web_form: "WEB", manual: "CONTACTO_MANUAL" };

export function sourceLabel(source: string) {
  const key = (LEGACY[source] ?? source) as LeadSource;
  return LEAD_SOURCES[key] ?? source;
}
export function sourceFilterValues(source: string): string[] {
  return Object.entries(LEGACY).filter(([, v]) => v === source).map(([k]) => k).concat(source);
}

export const SOURCE_CONFIDENCE = { observed: "Fuente observada por el sistema", self_declared: "Fuente indicada manualmente" } as const;
export const CAMPAIGN_ATTRIBUTION = { none: "Sin campaña asociada", observed: "Campaña informada por Meta", unconfirmed: "Campaña por UTM (no confirmada)" } as const;
export const LEGAL_BASIS = { consent: "Consentimiento del titular", precontractual: "Solicitud precontractual iniciada por el titular" } as const;
