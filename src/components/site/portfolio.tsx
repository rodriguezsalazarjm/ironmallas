import type { SiteContent } from "@/content/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { PortfolioGallery } from "./portfolio-gallery";

type PortfolioProps = Pick<SiteContent, "portfolioIntro" | "projects">;

export function Portfolio({ portfolioIntro, projects }: PortfolioProps) {
  return (
    <section id="portafolio" aria-labelledby="portafolio-title" className="bg-navy-800 py-20 text-white sm:py-24">
      <div className="container-site">
        <SectionHeading id="portafolio-title" kicker={portfolioIntro.kicker} lead={portfolioIntro.title} tone="dark" />
        <PortfolioGallery projects={projects} />
      </div>
    </section>
  );
}
