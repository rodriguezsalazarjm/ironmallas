import type { Metadata, Viewport } from "next";
import { Oswald, Roboto } from "next/font/google";

import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const description =
  "Instalación de mallas de seguridad para balcones, ventanas y terrazas en Santiago. Monofilamento y multifilamento, soportes para TV y cortinas roller. Cotización y visita técnica.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Iron Mallas | Mallas de seguridad en Santiago de Chile",
    template: "%s | Iron Mallas",
  },
  description,
  applicationName: "Iron Mallas",
  keywords: [
    "mallas de seguridad",
    "mallas de seguridad Santiago",
    "malla para balcón",
    "malla para ventanas",
    "malla multifilamento",
    "malla monofilamento",
    "malla para mascotas",
    "instalación soporte TV",
    "cortinas roller",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Iron Mallas",
    title: "Iron Mallas | Mallas de seguridad en Santiago de Chile",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Iron Mallas | Mallas de seguridad en Santiago",
    description,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#06365A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${oswald.variable} ${roboto.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
