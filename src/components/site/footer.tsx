import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

import type { SiteContent } from "@/content/types";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { telUrl, whatsappUrl } from "@/lib/links";

type FooterProps = Pick<SiteContent, "brand" | "contact" | "nav" | "services" | "footer">;

export function Footer({ brand, contact, nav, services, footer }: FooterProps) {
  const serviceLinks = [...services.map((s) => s.shortTitle), ...footer.otherServices];

  return (
    <footer className="relative overflow-hidden bg-navy-900 text-white">
      <div aria-hidden="true" className="h-1 bg-gradient-to-r from-orange-500 via-orange-500/60 to-transparent" />
      <Image
        src={brand.mascot.src}
        alt={brand.mascot.alt}
        width={brand.mascot.width}
        height={brand.mascot.height}
        sizes="420px"
        className="pointer-events-none absolute -right-16 bottom-0 w-[26rem] max-w-none opacity-[0.07] select-none"
      />

      <div className="container-site relative">
        <div className="flex flex-col items-center border-b border-white/10 py-12 text-center">
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={brand.logo.width}
            height={brand.logo.height}
            sizes="260px"
            className="h-12 w-auto sm:h-14"
          />
          <p className="mt-4 font-display text-sm uppercase tracking-[0.2em] text-white/60">
            Seguridad real · <span className="text-orange-400">Trabajo bien hecho</span>
          </p>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">{footer.description}</p>
            <p className="mt-5 border-l-[3px] border-orange-500 pl-3 font-display font-semibold uppercase leading-snug tracking-wide text-orange-400">
              {footer.slogan[0]}
              <br />
              {footer.slogan[1]}
            </p>
            <div className="mt-6 flex gap-2.5">
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${contact.instagramHandle}`}
                className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/5 transition hover:border-orange-500 hover:bg-orange-500 hover:text-navy-950"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href={whatsappUrl(contact.phoneE164)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/5 transition hover:border-orange-500 hover:bg-orange-500 hover:text-navy-950"
              >
                <WhatsAppIcon size={18} />
              </a>
            </div>
          </div>

          <FooterColumn title="Servicios">
            {serviceLinks.map((label) => (
              <li key={label}>
                <Link href="/#servicios" className="inline-flex min-h-11 items-center text-sm text-white/80 transition hover:text-orange-400">
                  {label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Navegación">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href.startsWith("#") ? `/${item.href}` : item.href} className="inline-flex min-h-11 items-center text-sm text-white/80 transition hover:text-orange-400">
                  {item.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Contacto">
            <ContactRow icon={Phone} label="Teléfono">
              <a href={telUrl(contact.phoneE164)} className="hover:text-orange-400">
                {contact.phoneDisplay}
              </a>
            </ContactRow>
            <ContactRow icon={Mail} label="Email">
              <a href={`mailto:${contact.email}`} className="break-all hover:text-orange-400">
                {contact.email}
              </a>
            </ContactRow>
            <ContactRow icon={MapPin} label="Ubicación">
              {contact.location}
              <span className="block text-white/50">{contact.serviceArea}</span>
            </ContactRow>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> <span className="text-white/80">{brand.legalName}</span> — Todos los derechos reservados.
          </p>
          <p>
            Diseñado por{" "}
            <a href={footer.credit.href} target="_blank" rel="noopener" className="text-white/70 hover:text-orange-400">
              {footer.credit.label}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Cached so the static shell can be prerendered (Cache Components forbids raw `new Date()`). */
async function CopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 border-b border-white/10 pb-2.5 font-display text-sm font-bold uppercase tracking-[0.18em] text-orange-400">
        {title}
      </h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function ContactRow({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-orange-400">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-sm text-white/80">
        <strong className="block text-xs font-semibold uppercase tracking-wider text-white/50">{label}</strong>
        {children}
      </span>
    </li>
  );
}
