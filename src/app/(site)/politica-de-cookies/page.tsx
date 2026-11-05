import type { Metadata } from "next";
import { cookiePolicy } from "@/content/legal";
import { LegalDocumentView } from "@/components/site/legal-document";
export const metadata: Metadata = { title: "Política de cookies", description: "Cookies que usa ironmallas.cl y cómo cambiar tus preferencias.", alternates: { canonical: "/politica-de-cookies" } };
export default function CookiePolicyPage() { return <LegalDocumentView doc={cookiePolicy} related={{ href: "/politica-de-privacidad", label: "Ver política de privacidad" }} />; }
