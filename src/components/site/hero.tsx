import { Building2, Headset, ShieldCheck, TrendingUp, Wrench } from "lucide-react";

import type { ContactInfo, HeroContent, TrustPill } from "@/content/types";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { whatsappUrl } from "@/lib/links";
import { AnimatedCounter } from "./animated-counter";
import { HeroVideo } from "./hero-video";

const pillIcons: Record<TrustPill["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck,
  wrench: Wrench,
  building: Building2,
  headset: Headset,
};

export function Hero({ hero, contact }: { hero: HeroContent; contact: ContactInfo }) {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-navy-900">
      <HeroVideo src={hero.video.src} type={hero.video.type} />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(3_23_38/0.9)_0%,rgb(3_23_38/0.68)_50%,rgb(6_54_90/0.45)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy-950/80 to-transparent"
      />

      <div className="container-site flex min-h-[calc(100svh-6.5rem)] flex-col items-center justify-center py-16 text-center text-white sm:py-20">
        <h1
          id="hero-title"
          className="max-w-4xl animate-fade-up text-[2.35rem] font-bold uppercase leading-[1.05] tracking-wide [text-shadow:0_4px_18px_rgb(0_0_0/0.55)] sm:text-6xl lg:text-7xl"
        >
          {hero.titleLead} <span className="text-orange-500">{hero.titleHighlight}</span>
        </h1>

        <div aria-hidden="true" className="mt-6 h-1.5 w-24 origin-center animate-grow-x rounded-full bg-orange-500 [animation-delay:0.5s]" />

        <p className="mt-6 max-w-3xl animate-fade-in text-base leading-relaxed text-white/90 [animation-delay:0.6s] sm:text-lg">
          {hero.subtitle}
        </p>

        <div className="mt-9 flex w-full animate-fade-up flex-col items-stretch justify-center gap-3 [animation-delay:0.8s] sm:w-auto sm:flex-row sm:items-center">
          <ButtonLink href={hero.primaryCta.href} size="lg">
            {hero.primaryCta.label}
          </ButtonLink>
          <ButtonLink href={whatsappUrl(contact.phoneE164, hero.whatsappCta.message)} variant="ghost" size="lg">
            <WhatsAppIcon size={20} />
            {hero.whatsappCta.label}
          </ButtonLink>
        </div>

        <ul className="mt-10 flex max-w-4xl animate-fade-in flex-wrap justify-center gap-2.5 [animation-delay:1s]">
          {hero.trustPills.map((pill) => {
            const Icon = pillIcons[pill.icon];
            return (
              <li
                key={pill.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md"
              >
                <Icon className="size-4 text-orange-400" aria-hidden="true" />
                {pill.label}
              </li>
            );
          })}
          {hero.counter && (
            <li className="inline-flex items-center gap-3 rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 backdrop-blur-md">
              <TrendingUp className="size-4 text-orange-400" aria-hidden="true" />
              <span className="font-display text-lg font-bold leading-none text-orange-400">
                <AnimatedCounter value={hero.counter.value} />
                {hero.counter.suffix}
              </span>
              <span className="text-sm font-medium">{hero.counter.label}</span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
