import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/", siteUrl).toString(), changeFrequency: "monthly", priority: 1 },
    { url: new URL("/politica-de-privacidad", siteUrl).toString(), changeFrequency: "yearly", priority: 0.2 },
    { url: new URL("/politica-de-cookies", siteUrl).toString(), changeFrequency: "yearly", priority: 0.2 },
  ];
}
