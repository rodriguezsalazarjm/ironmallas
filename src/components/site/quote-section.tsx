import { Clock, Mail, MessageSquareText, Phone } from "lucide-react";

import type { ContactInfo, QuoteFormContent } from "@/content/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { telUrl, whatsappUrl } from "@/lib/links";
import { QuoteForm } from "./quote-form";

export function QuoteSection({ content, contact }: { content: QuoteFormContent; contact: ContactInfo }) {
  const channels = [
    {
      icon: WhatsAppIcon,
      label: "WhatsApp",
      value: contact.phoneDisplay,
      href: whatsappUrl(contact.phoneE164, "Hola Iron Mallas, quiero cotizar."),
      external: true,
    },
    { icon: Phone, label: "Teléfono", value: contact.phoneDisplay, href: telUrl(contact.phoneE164), external: false },
    { icon: Mail, label: "Correo", value: contact.email, href: `mailto:${contact.email}`, external: false },
    { icon: InstagramIcon, label: "Instagram", value: contact.instagramHandle, href: contact.instagramUrl, external: true },
  ];

  return (
    <section
      id="cotizacion"
      aria-labelledby="cotizacion-title"
      className="relative overflow-hidden bg-navy-700 py-20 sm:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_110%_-10%,rgb(252_107_4/0.22),transparent_60%),radial-gradient(40rem_30rem_at_-10%_110%,rgb(31_90_133/0.6),transparent_60%)]"
      />
      {/* DOM order (heading → form → channels) keeps the form near the top on phones. */}
      <div className="container-site relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:grid-rows-[auto_1fr] lg:gap-x-14">
        <div className="lg:col-start-1 lg:row-start-1">
          <SectionHeading
            id="cotizacion-title"
            kicker={content.kicker}
            lead={content.titleLead}
            highlight={content.titleHighlight}
            intro={content.intro}
            align="left"
            tone="dark"
          />
        </div>

        <div className="relative rounded-3xl bg-white p-6 shadow-lift sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="mb-6 flex items-center gap-3">
            <MessageSquareText className="size-6 text-orange-600" aria-hidden="true" />
            <h3 className="text-xl font-semibold uppercase tracking-wide text-navy-700">Solicita tu cotización</h3>
          </div>
          <QuoteForm content={content} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {channels.map(({ icon: Icon, label, value, href, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white transition hover:border-orange-500/60 hover:bg-white/10"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-500 text-navy-950">
                    <Icon size={20} className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-navy-200">{label}</span>
                    <span className="block truncate font-medium">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-center gap-2 text-sm text-navy-100">
            <Clock className="size-4 text-orange-400" aria-hidden="true" />
            Respondemos en menos de 24 horas hábiles.
          </p>
        </div>
      </div>
    </section>
  );
}
