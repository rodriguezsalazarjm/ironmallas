import { GoogleReviews } from "@/components/site/google-reviews";
import { getGoogleReviews } from "@/features/reviews/google";
import { About } from "@/components/site/about";
import { Faq } from "@/components/site/faq";
import { Hero } from "@/components/site/hero";
import { Portfolio } from "@/components/site/portfolio";
import { QuoteSection } from "@/components/site/quote-section";
import { Schedule } from "@/components/site/schedule";
import { Services } from "@/components/site/services";
import type { SiteContent } from "@/content/types";
import { siteUrl } from "@/lib/site-url";

export function HomeContent({ content }: { content: SiteContent }) {
  const { contact, brand } = content;

  // Only facts present on the current site — no ratings, prices or street address.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HomeAndConstructionBusiness",
        "@id": `${siteUrl.origin}/#business`,
        name: brand.name,
        url: siteUrl.origin,
        logo: brand.logo.src,
        image: content.about.image.src,
        description: content.footer.description,
        slogan: brand.tagline,
        telephone: `+${contact.phoneE164}`,
        email: contact.email,
        areaServed: { "@type": "AdministrativeArea", name: "Región Metropolitana de Santiago" },
        address: { "@type": "PostalAddress", addressLocality: "Santiago", addressCountry: "CL" },
        sameAs: [contact.instagramUrl],
        makesOffer: content.services.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.shortTitle },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer.join(" ").replaceAll("**", "") },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero hero={content.hero} contact={contact} />
      <Services servicesIntro={content.servicesIntro} services={content.services} footer={content.footer} />
      <About about={content.about} />
      <Portfolio portfolioIntro={content.portfolioIntro} projects={content.projects} />
      <GoogleReviews state={getGoogleReviews()} />
      <Schedule schedule={content.schedule} />
      <Faq faqIntro={content.faqIntro} faqs={content.faqs} />
      <QuoteSection content={content.quoteForm} contact={contact} />
    </>
  );
}
