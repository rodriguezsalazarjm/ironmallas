import "server-only";
import {createCalClient,type CalClient} from "./cal-client";
export {CAL_API_VERSION,type CalClient} from "./cal-client";
/** Server-side Cal.com client from CAL_API_KEY (and optional CAL_API_URL). Null when the API is not configured. */
export function calApiClient(fetcher: typeof fetch = fetch): CalClient | null {
  const key = process.env.CAL_API_KEY?.trim();
  if (!key) return null;
  return createCalClient(key, process.env.CAL_API_URL?.trim() || "https://api.cal.com/v2", fetcher);
}
