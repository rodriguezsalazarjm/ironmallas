import "server-only";

import { siteContent } from "@/content/site";
import type { SiteContent } from "@/content/types";

/**
 * Single entry point for public content. Phase 1 returns the static content
 * recovered from WordPress; Phase 2 will read the same shape from Supabase
 * (cached with `use cache` + `cacheTag`, revalidated from the admin panel).
 */
export async function getSiteContent(): Promise<SiteContent> {
  return siteContent;
}
