import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.SITE_INDEXABLE === "true";
  return {
    // Preview / staging deployments must never be indexed.
    rules: isProduction ? { userAgent: "*", allow: "/", disallow: ["/admin"] } : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
