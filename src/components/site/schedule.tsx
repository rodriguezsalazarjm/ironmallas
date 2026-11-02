import { CalendarCheck, CircleCheck, Info } from "lucide-react";

import type { ScheduleContent } from "@/content/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { CalEmbed } from "./cal-embed";

export function Schedule({ schedule }: { schedule: ScheduleContent }) {
  return (
    <section id="agenda" aria-labelledby="agenda-title" className="bg-surface py-20 sm:py-24">
      <div className="container-site grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            id="agenda-title"
            kicker={schedule.kicker}
            lead={schedule.titleLead}
            highlight={schedule.titleHighlight}
            intro={schedule.intro}
            align="left"
          />
          <ul className="mt-8 space-y-3">
            {schedule.benefits.map((b) => (
              <li key={b} className="flex gap-3 text-[0.95rem] text-ink">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-orange-600" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-8 flex gap-3 rounded-2xl border border-navy-100 bg-white p-5 text-sm leading-relaxed text-ink-soft">
            <Info className="mt-0.5 size-5 shrink-0 text-navy-500" aria-hidden="true" />
            {schedule.note}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-navy-700 px-6 py-5 text-white">
            <div>
              <h3 className="text-xl font-semibold uppercase tracking-wide">Selecciona una fecha</h3>
              <p className="mt-0.5 text-sm text-navy-100">Elige el horario que más te acomode para coordinar tu visita.</p>
            </div>
            <CalendarCheck className="size-8 shrink-0 text-orange-400" aria-hidden="true" />
          </div>
          <div className="p-3 sm:p-5">
            <CalEmbed link={schedule.cal.link} namespace={schedule.cal.namespace} origin={schedule.cal.origin} />
          </div>
        </div>
      </div>
    </section>
  );
}
