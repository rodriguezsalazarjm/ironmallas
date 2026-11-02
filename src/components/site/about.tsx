import Image from "next/image";
import { CircleCheck, Ruler, ShieldCheck, UserRound } from "lucide-react";

import type { AboutContent } from "@/content/types";
import { RichText } from "@/components/ui/rich-text";
import { SectionHeading } from "@/components/ui/section-heading";

const pillarIcons: Record<AboutContent["pillars"][number]["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck,
  ruler: Ruler,
  user: UserRound,
};

export function About({ about }: { about: AboutContent }) {
  return (
    <section id="nosotros" aria-labelledby="nosotros-title" className="relative overflow-hidden bg-white py-20 sm:py-24">
      <div className="container-site">
        <SectionHeading
          id="nosotros-title"
          kicker={about.kicker}
          lead={about.titleLead}
          highlight={about.titleHighlight}
        />
        <p className="mt-3 text-center font-display text-lg italic tracking-wide text-ink-soft">{about.tagline}</p>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            {about.story.map((paragraph, i) => (
              <p key={i} className="mb-5 text-base leading-relaxed text-ink-soft sm:text-[1.05rem]">
                <RichText text={paragraph} />
              </p>
            ))}

            <blockquote className="my-8 rounded-2xl bg-navy-700 px-6 py-5 font-display text-xl font-semibold uppercase leading-snug tracking-wide text-white shadow-card sm:text-2xl">
              <span className="text-orange-400">“</span>
              {about.quote}
              <span className="text-orange-400">”</span>
            </blockquote>

            <ul className="grid gap-3 sm:grid-cols-2">
              {about.checks.map((check) => (
                <li key={check} className="flex items-start gap-2.5 text-[0.95rem] font-medium text-ink">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-orange-600" aria-hidden="true" />
                  {check}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-navy-100 shadow-lift">
              <Image
                src={about.image.src}
                alt={about.image.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 left-4 rounded-2xl bg-orange-500 px-6 py-4 text-navy-950 shadow-glow sm:-left-6">
              <p className="font-display text-4xl font-bold leading-none">{about.badge.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider">{about.badge.label}</p>
            </div>
            <div
              aria-hidden="true"
              className="absolute -right-4 -top-4 -z-10 size-32 rounded-3xl border-2 border-dashed border-orange-300"
            />
          </div>
        </div>

        <ul className="mt-20 grid gap-5 md:grid-cols-3">
          {about.pillars.map((pillar) => {
            const Icon = pillarIcons[pillar.icon];
            return (
              <li key={pillar.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-orange-500 text-navy-950">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-navy-700">{pillar.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{pillar.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
