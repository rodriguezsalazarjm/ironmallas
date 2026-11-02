import "server-only";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

/**
 * Best-effort, per-instance limiter (serverless instances do not share
 * memory). Phase 2 should move this to the database or a shared store.
 */
export function isRateLimited(key: string, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > MAX_ATTEMPTS;
}
