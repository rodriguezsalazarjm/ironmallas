/**
 * Content model for the public site.
 *
 * Phase 1 reads these shapes from a static file (`site.ts`). In Phase 2 the
 * same shapes will be served from Supabase so the admin panel can edit them
 * without touching code — components must depend only on these types.
 */

export type MediaImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type NavItem = { label: string; href: string };

export type ContactInfo = {
  phoneDisplay: string;
  /** E.164 digits without "+" — used for tel: and wa.me links. */
  phoneE164: string;
  email: string;
  location: string;
  serviceArea: string;
  instagramUrl: string;
  instagramHandle: string;
};

export type TrustPill = {
  icon: "shield" | "wrench" | "building" | "headset";
  label: string;
};

export type HeroContent = {
  titleLead: string;
  titleHighlight: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  whatsappCta: { label: string; message: string };
  video: { src: string; type: string };
  trustPills: TrustPill[];
  /** Business figure shown in the hero. Hidden when `null`. */
  counter: { value: number; suffix: string; label: string } | null;
};

export type SpecBlock = {
  title: string;
  tags: string[];
  highlights: string[];
  note: string;
};

export type Service = {
  slug: string;
  title: string;
  shortTitle: string;
  icon: "shield" | "tv" | "blinds";
  image: MediaImage;
  modalities: Array<"full" | "install">;
  /** Rich description; `**text**` marks emphasis. */
  description: string;
  benefits: string[];
  details: {
    specsTitle?: string;
    specs?: SpecBlock[];
    stepsTitle?: string;
    steps?: string[];
    useCases: string[];
    procedureTitle?: string;
    note: string;
  };
};

export type AboutContent = {
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  tagline: string;
  /** Paragraphs; `**text**` marks emphasis. */
  story: string[];
  quote: string;
  checks: string[];
  image: MediaImage;
  badge: { value: string; label: string };
  pillars: Array<{ icon: "shield" | "ruler" | "user"; title: string; description: string }>;
};

export type ProjectCategory = "mallas" | "cortinas" | "videos";

export type Project = {
  id: string;
  type: "image" | "video";
  category: ProjectCategory;
  src: string;
  width?: number;
  height?: number;
  title: string;
  location: string;
  description: string;
};

export type ScheduleContent = {
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  intro: string;
  benefits: string[];
  note: string;
  cal: {
    /** Cal.com booking path: "<user>/<event-type>". */
    link: string;
    namespace: string;
    origin: string;
  };
};

export type FaqItem = {
  question: string;
  /** Paragraphs; `**text**` marks emphasis. */
  answer: string[];
  tags?: string[];
};

export type QuoteFormContent = {
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  intro: string;
  serviceOptions: string[];
  privacyNote: string;
};

export type FooterContent = {
  description: string;
  slogan: [string, string];
  otherServices: string[];
  credit: { label: string; href: string };
};

export type SiteContent = {
  brand: { name: string; legalName: string; tagline: string; logo: MediaImage; mascot: MediaImage };
  contact: ContactInfo;
  nav: NavItem[];
  hero: HeroContent;
  servicesIntro: { kicker: string; titleLead: string; titleHighlight: string; titleTail: string; intro: string };
  services: Service[];
  about: AboutContent;
  portfolioIntro: { kicker: string; title: string };
  projects: Project[];
  schedule: ScheduleContent;
  faqIntro: { kicker: string; titleLead: string; titleHighlight: string; intro: string };
  faqs: FaqItem[];
  quoteForm: QuoteFormContent;
  footer: FooterContent;
};
