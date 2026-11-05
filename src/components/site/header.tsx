import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";

import type { SiteContent } from "@/content/types";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/button";
import { telUrl, whatsappUrl } from "@/lib/links";
import { MobileMenu } from "./mobile-menu";

type HeaderProps = Pick<SiteContent, "brand" | "contact" | "nav">;

export function Header({ brand, contact, nav }: HeaderProps) {
  const wa = whatsappUrl(contact.phoneE164, "Hola Iron Mallas, quiero más información.");
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="bg-orange-500 text-navy-950">
        <div className="container-site flex h-8 items-center justify-between text-[0.8rem] font-medium">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            {contact.location}
          </span>
          <a href={telUrl(contact.phoneE164)} className="inline-flex items-center gap-1.5 hover:underline">
            <Phone className="size-3.5" aria-hidden="true" />
            {contact.phoneDisplay}
          </a>
        </div>
      </div>

      <div className="rounded-b-2xl bg-navy-700/95 shadow-[0_8px_30px_rgb(3_23_38/0.35)] backdrop-blur-md">
        <div className="container-site flex h-[4.5rem] items-center justify-between gap-4">
          <Link href="/#inicio" className="shrink-0" aria-label={`${brand.name} — ir al inicio`}>
            <Image
              src={brand.logo.src}
              alt={brand.logo.alt}
              width={brand.logo.width}
              height={brand.logo.height}
              priority
              sizes="(min-width: 1024px) 230px, 180px"
              className="h-9 w-auto drop-shadow-md lg:h-11"
            />
          </Link>

          <nav aria-label="Principal" className="hidden xl:block">
            <ul className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href.startsWith("#") ? `/${item.href}` : item.href}
                    className="block rounded-full px-4 py-2 font-display text-[0.8rem] font-semibold uppercase tracking-wider text-white/90 transition hover:bg-white/15 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <a
              href={contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram ${contact.instagramHandle}`}
              className="grid size-11 place-items-center rounded-xl border border-white/15 text-white transition hover:bg-white/10"
            >
              <InstagramIcon size={19} />
            </a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md")}>
              <WhatsAppIcon size={18} />
              Contacto
            </a>
          </div>

          <MobileMenu nav={nav} whatsappHref={wa} instagramUrl={contact.instagramUrl} />
        </div>
      </div>
    </header>
  );
}
