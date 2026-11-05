/** Consentimiento de cookies: cookie propia y necesaria, sin identificadores personales. */
export const CONSENT_COOKIE = "im_consent";
export const CONSENT_VERSION = "2026-11-05";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 6 meses; luego se vuelve a preguntar.
export type ConsentChoice = { analytics: boolean; marketing: boolean };
export type StoredConsent = ConsentChoice & { version: string; decidedAt: string };

export function serializeConsent(choice: ConsentChoice, now = new Date()): string {
  return encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, a: choice.analytics ? 1 : 0, m: choice.marketing ? 1 : 0, t: now.toISOString().slice(0, 10) }));
}

/** Devuelve null si no hay decisión, si está corrupta o si la versión de la política cambió. */
export function parseConsent(raw: string | undefined | null): StoredConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as { v?: unknown; a?: unknown; m?: unknown; t?: unknown };
    if (value.v !== CONSENT_VERSION || ![0, 1].includes(value.a as number) || ![0, 1].includes(value.m as number) || typeof value.t !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.t)) return null;
    return { version: CONSENT_VERSION, analytics: value.a === 1, marketing: value.m === 1, decidedAt: value.t };
  } catch { return null; }
}

export function readConsentCookie(cookieHeader: string): StoredConsent | null {
  const match = cookieHeader.split(/;\s*/).find(part => part.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}

/** Rastreadores opcionales configurados. Sin ID configurado no existe categoría opcional que consentir. */
export function optionalTrackers(env: { ga?: string; pixel?: string }) {
  return { analytics: /^G-[A-Z0-9]{4,20}$/.test(env.ga ?? ""), marketing: /^\d{6,20}$/.test(env.pixel ?? "") };
}
