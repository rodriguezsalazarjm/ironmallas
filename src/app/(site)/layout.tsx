import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { getSiteContent } from "@/lib/content";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
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
    </>
  );
}
