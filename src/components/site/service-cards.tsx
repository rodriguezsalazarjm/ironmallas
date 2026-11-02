"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import { Blinds, Check, ChevronDown, PackageCheck, ShieldCheck, Tv, Wrench } from "lucide-react";

import type { Service } from "@/content/types";
import { ButtonLink } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/cn";

const serviceIcons: Record<Service["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck,
  tv: Tv,
  blinds: Blinds,
};

const modalityLabels = {
  full: { label: "Venta e instalación", Icon: PackageCheck },
  install: { label: "Solo instalación", Icon: Wrench },
} as const;

function Tag({ children, highlight }: { children: ReactNode; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium",
        highlight ? "bg-orange-100 font-semibold text-orange-800" : "bg-navy-50 text-navy-700",
      )}
    >
      {children}
    </span>
  );
}

function MiniTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="mb-2.5 mt-5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 first:mt-0">
      {children}
    </h4>
  );
}

/** Service cards; one "details" panel open at a time, as on the original site. */
export function ServiceCards({ services }: { services: Service[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const baseId = useId();

  return (
    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const Icon = serviceIcons[service.icon];
        const isOpen = openSlug === service.slug;
        const panelId = `${baseId}-${service.slug}`;
        const { details } = service;

        return (
          <article
            key={service.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-navy-100">
              <Image
                src={service.image.src}
                alt={service.image.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/55 to-transparent" />
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                {service.modalities.map((m) => {
                  const { label, Icon: ModalityIcon } = modalityLabels[m];
                  return (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-navy-700 shadow-sm"
                    >
                      <ModalityIcon className="size-3.5 text-orange-600" aria-hidden="true" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-700 text-orange-400">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-semibold uppercase leading-tight tracking-wide text-navy-700">
                  {service.title}
                </h3>
              </div>

              <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
                <RichText text={service.description} />
              </p>

              <ul className="mt-4 space-y-2">
                {service.benefits.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>

              <div id={panelId} hidden={!isOpen} className="mt-5 animate-fade-in border-t border-line pt-5">
                {details.specs && (
                  <>
                    <MiniTitle>{details.specsTitle}</MiniTitle>
                    <div className="grid gap-3">
                      {details.specs.map((spec) => (
                        <div key={spec.title} className="rounded-xl border border-line bg-surface p-4">
                          <p className="font-display text-sm font-semibold uppercase tracking-wide text-navy-700">
                            {spec.title}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {spec.tags.map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))}
                            {spec.highlights.map((t) => (
                              <Tag key={t} highlight>
                                {t}
                              </Tag>
                            ))}
                          </div>
                          <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">{spec.note}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {details.steps && (
                  <>
                    <MiniTitle>{details.stepsTitle}</MiniTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {details.steps.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  </>
                )}
                <MiniTitle>Casos de uso</MiniTitle>
                <div className="flex flex-wrap gap-1.5">
                  {details.useCases.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                {details.procedureTitle && <MiniTitle>{details.procedureTitle}</MiniTitle>}
                <blockquote className="mt-4 rounded-r-xl border-l-4 border-orange-500 bg-orange-50 px-4 py-3 text-sm leading-relaxed text-ink">
                  {details.note}
                </blockquote>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                <ButtonLink href="#cotizacion" size="md">
                  Cotizar ahora
                </ButtonLink>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenSlug(isOpen ? null : service.slug)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
                >
                  {isOpen ? "Ver menos" : "Ver más detalles"}
                  <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
