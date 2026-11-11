import type { NextConfig } from "next";
const storageHost=process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname:null;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Los PDF de cotización leen los logotipos oficiales desde public/brand en tiempo de ejecución.
  outputFileTracingIncludes: {
    "/admin/cotizaciones/[id]/pdf": ["./public/brand/logo.png", "./public/brand/logo-color.png"],
    "/cotizacion/[token]": ["./public/brand/logo.png", "./public/brand/logo-color.png"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Temporary: media still lives in the WordPress uploads folder.
    // Phase 2 moves it to Supabase Storage and adds that host here.
    remotePatterns: [
      { protocol: "https", hostname: "ironmallas.cl", pathname: "/wp-content/uploads/**", search: "" },
      ...(storageHost?[{protocol:"https" as const,hostname:storageHost,pathname:"/storage/v1/object/public/public-media/**",search:""}]:[]),
    ],
  },
  async headers() {
    const privateHeaders=[{key:"Referrer-Policy",value:"no-referrer"},{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"}];
    return [{ source: "/:path*", headers: securityHeaders },{source:"/auth/:path*",headers:privateHeaders},{source:"/cotizacion/:path*",headers:privateHeaders}];
  },
};

export default nextConfig;
