import type { SiteContent } from "@/content/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceCards } from "./service-cards";

type ServicesProps = Pick<SiteContent, "servicesIntro" | "services" | "footer">;

export function Services({ servicesIntro, services, footer }: ServicesProps) {
  return (
    <section id="servicios" aria-labelledby="servicios-title" className="bg-surface py-20 sm:py-24">
      <div className="container-site">
        <SectionHeading
          id="servicios-title"
          kicker={servicesIntro.kicker}
          lead={servicesIntro.titleLead}
          highlight={servicesIntro.titleHighlight}
          tail={servicesIntro.titleTail}
          intro={servicesIntro.intro}
        />
        <ServiceCards services={services} />
        <p className="mt-10 text-center text-sm text-ink-soft">
          También realizamos{" "}
          <span className="font-medium text-navy-700">{footer.otherServices.join(" · ")}</span>.{" "}
          <a href="#cotizacion" className="font-semibold text-orange-700 underline-offset-4 hover:underline">
            Consúltanos
          </a>
        </p>
      </div>
    </section>
  );
}
