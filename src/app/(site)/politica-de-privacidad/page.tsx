import type { Metadata } from "next";
import { privacyPolicy } from "@/content/legal";
import { LegalDocumentView } from "@/components/site/legal-document";
export const metadata: Metadata = { title: "Política de privacidad", description: "Cómo Iron Mallas trata los datos personales de quienes solicitan cotizaciones y servicios.", alternates: { canonical: "/politica-de-privacidad" } };
export default function PrivacyPolicyPage() { return <LegalDocumentView doc={privacyPolicy} related={{ href: "/politica-de-cookies", label: "Ver política de cookies" }} />; }
