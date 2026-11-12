/**
 * Notification queue rules (pure; covered by tests).
 * The existing `send_after` column doubles as a lease: claiming a row pushes it forward, so a
 * second scheduler run cannot pick up a message that is still being sent. No extra schema needed.
 */
export const MAX_ATTEMPTS = 3;
/** Longer than the longest possible run (Vercel function limit 300 s). */
export const LEASE_MS = 10 * 60_000;
/** Resend keeps idempotency keys for 24 h: beyond that a retry could duplicate an accepted email. */
export const RETRY_WINDOW_MS = 23 * 3_600_000;

/** Wait after failed attempt n (1-based): 5 min, then 15 min. */
export function retryDelayMs(attempt: number) {
  return 5 * 60_000 * 3 ** Math.max(0, attempt - 1);
}

export function firstAttemptAt(payload: unknown): string | null {
  const v = payload && typeof payload === "object" ? (payload as { first_attempt_at?: unknown }).first_attempt_at : null;
  return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** A retry is only safe while the provider still remembers the idempotency key of the first attempt. */
export function retryAllowed(n: { attempts: number; created_at: string; payload: unknown }, now: number) {
  if (n.attempts === 0) return true;
  const first = firstAttemptAt(n.payload) ?? n.created_at;
  return now - Date.parse(first) < RETRY_WINDOW_MS;
}

/**
 * Resend 409 `invalid_idempotent_request`: the key was already used with a different body
 * (e.g. a fresh confirmation link). The first email may have been delivered, so never resend
 * automatically and never report it as sent: it goes to manual review.
 */
export function providerVerdict(error: { name?: string; message?: string } | null): "ok" | "retry" | "review" {
  if (!error) return "ok";
  if (error.name === "invalid_idempotent_request") return "review";
  return "retry";
}

export const REVIEW_MESSAGE = "Revisión manual: posible envío previo con la misma clave de idempotencia. No se reintentará automáticamente.";
export const WINDOW_MESSAGE = "Revisión manual: pasaron más de 23 h desde el primer intento. No se reintentará automáticamente.";
