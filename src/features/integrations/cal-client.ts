/**
 * Cal.com API v2 (https://cal.com/docs/api-reference/v2). Only the two operations the admin panel needs:
 * reschedule and cancel an existing booking by UID. A failed call is reported as failed — never as synced.
 */
export const CAL_API_VERSION = "2024-08-13";
type CalResult = { ok: true; uid: string } | { ok: false; error: string; status?: number };
export type CalClient = { reschedule(uid: string, startIso: string, reason: string): Promise<CalResult>; cancel(uid: string, reason: string): Promise<CalResult> };

export function createCalClient(key: string, baseUrl: string, fetcher: typeof fetch = fetch): CalClient {
  const base = baseUrl.replace(/\/$/, "");
  async function call(uid: string, action: "reschedule" | "cancel", body: Record<string, unknown>): Promise<CalResult> {
    let response: Response;
    try {
      response = await fetcher(`${base}/bookings/${encodeURIComponent(uid)}/${action}`, {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "cal-api-version": CAL_API_VERSION, "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: "no-store",
      });
    } catch { return { ok: false, error: "Cal.com no respondió." }; }
    let json: unknown = null;
    try { json = await response.json(); } catch { /* cuerpo vacío o no JSON */ }
    const data = (json as { status?: string; data?: { uid?: unknown } } | null);
    if (!response.ok || data?.status !== "success") return { ok: false, status: response.status, error: `Cal.com rechazó la operación (${response.status}).` };
    return { ok: true, uid: typeof data.data?.uid === "string" && data.data.uid ? data.data.uid : uid };
  }
  return {
    reschedule: (uid, start, reason) => call(uid, "reschedule", { start, reschedulingReason: reason.slice(0, 500) }),
    cancel: (uid, reason) => call(uid, "cancel", { cancellationReason: reason.slice(0, 500) }),
  };
}
