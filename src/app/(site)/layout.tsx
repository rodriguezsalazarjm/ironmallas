import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { getPublicContent } from "@/lib/content";
import Link from "next/link";
import { CookieConsent, CookieSettingsButton } from "@/components/site/cookie-consent";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const published = await getPublicContent();
  const content=published.site;
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-lg bg-orange-500 px-4 py-2 font-semibold text-navy-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Header brand={content.brand} contact={content.contact} nav={content.nav} />
      <main id="contenido" className="pt-[6.5rem]">
        {children}
      </main>
      <Footer
        brand={content.brand}
        contact={content.contact}
        nav={content.nav}
        services={content.services}
        footer={content.footer}
      />
      <FloatingWhatsApp phoneE164={content.contact.phoneE164} />
      <nav aria-label="Información legal" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 bg-navy-950 px-5 pb-24 pt-3 text-sm text-white/80 sm:pb-3">
        <Link href="/politica-de-privacidad" className="inline-flex min-h-11 items-center underline hover:text-orange-400">Política de privacidad</Link>
        <Link href="/politica-de-cookies" className="inline-flex min-h-11 items-center underline hover:text-orange-400">Política de cookies</Link>
        <CookieSettingsButton className="inline-flex min-h-11 items-center underline hover:text-orange-400" />
      </nav>
      <CookieConsent />
    </>
  );
}
