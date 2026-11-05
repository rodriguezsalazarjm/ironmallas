/** Canonical origin used for metadata, sitemap and robots. */
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"));
