import { MessageCircleQuestion, Plus } from "lucide-react";

import type { SiteContent } from "@/content/types";
import { ButtonLink } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { SectionHeading } from "@/components/ui/section-heading";

type FaqProps = Pick<SiteContent, "faqIntro" | "faqs">;

/** Exclusive accordion built on native <details name>, no client JS needed. */
export function Faq({ faqIntro, faqs }: FaqProps) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-white py-20 sm:py-24">
      <div className="container-site max-w-4xl">
        <SectionHeading
          id="faq-title"
          kicker={faqIntro.kicker}
          lead={faqIntro.titleLead}
          highlight={faqIntro.titleHighlight}
          intro={faqIntro.intro}
        />

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <details
              key={faq.question}
              name="faq"
              className="faq-item group rounded-2xl border border-line bg-white shadow-sm transition open:border-orange-300 open:shadow-card"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-5 py-4 sm:px-6">
                <span className="font-display text-sm font-bold text-orange-600 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-display text-base font-semibold uppercase tracking-wide text-navy-700 sm:text-lg">
                  {faq.question}
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700 transition group-open:rotate-45 group-open:bg-orange-500 group-open:text-navy-950">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
              </summary>
              <div className="px-5 pb-6 pl-[3.6rem] sm:px-6 sm:pl-[4.1rem]">
                {faq.answer.map((p, j) => (
                  <p key={j} className="mb-3 text-[0.95rem] leading-relaxed text-ink-soft last:mb-0">
                    <RichText text={p} />
                  </p>
                ))}
                {faq.tags && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {faq.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl bg-navy-700 p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-4">
            <MessageCircleQuestion className="size-10 shrink-0 text-orange-400" aria-hidden="true" />
            <div>
              <p className="font-display text-xl font-semibold uppercase tracking-wide">¿Tienes otra pregunta?</p>
              <p className="text-sm text-navy-100">Escríbenos y te respondemos a la brevedad.</p>
            </div>
          </div>
          <ButtonLink href="#cotizacion" size="lg">
            Contactar ahora
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
