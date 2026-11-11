import type { SiteContent } from "./types";
import { company } from "./company";

/**
 * Commercial content recovered from the WordPress export
 * (migration/ironmallas.WordPress.2026-11-02.xml, page ID 22, header #130,
 * footer #178). Claims marked "VALIDAR" exist on the current site and must be
 * confirmed by the business before launch — see docs/MIGRACION.md §6.
 */

const UPLOADS = "https://ironmallas.cl/wp-content/uploads/2026/04";

export const siteContent: SiteContent = {
  brand: {
    name: "Iron Mallas",
    legalName: company.legalName,
    tagline: "Seguridad real. Trabajo bien hecho.",
    // Logotipo oficial (versión para fondos oscuros) servido desde el propio sitio.
    logo: { src: "/brand/logo.png", alt: "Iron Mallas", width: 1421, height: 279 },
    mascot: { src: `${UPLOADS}/Recurso-4.png`, alt: "", width: 1629, height: 1547 },
  },

  contact: {
    phoneDisplay: "+569 4582 3209",
    phoneE164: "56945823209",
    email: "contacto@ironmallas.cl",
    location: "Santiago de Chile",
    serviceArea: "Toda la Región Metropolitana",
    instagramUrl: "https://www.instagram.com/ironmallas.cl/",
    instagramHandle: "@ironmallas.cl",
  },

  nav: [
    { label: "Inicio", href: "#inicio" },
    { label: "Servicios", href: "#servicios" },
    { label: "Nosotros", href: "#nosotros" },
    { label: "Trabajos", href: "#portafolio" },
    { label: "Agenda", href: "#agenda" },
    { label: "FAQ", href: "#faq" },
    { label: "Contacto", href: "#cotizacion" },
  ],

  hero: {
    // VALIDAR: "certificadas"
    titleLead: "Instalamos mallas de seguridad certificadas en",
    titleHighlight: "Santiago de Chile",
    subtitle:
      "Protegemos hogares, departamentos, empresas e industrias con instalaciones firmes, seguras y duraderas. Trabajamos con materiales certificados y mano de obra profesional para entregar protección real.",
    primaryCta: { label: "Solicitar cotización", href: "#cotizacion" },
    whatsappCta: {
      label: "Hablar por WhatsApp",
      message: "Hola Iron Mallas, quiero cotizar una instalación.",
    },
    video: { src: `${UPLOADS}/Balcony_Safety_Net_A_Family_s_Peace.mp4`, type: "video/mp4" },
    trustPills: [
      { icon: "shield", label: "Materiales certificados" },
      { icon: "wrench", label: "Instalación profesional" },
      { icon: "building", label: "Hogares y empresas" },
      { icon: "headset", label: "Atención confiable" },
    ],
    // VALIDAR: cifra tomada del contador del sitio actual.
    counter: { value: 1247, suffix: "+", label: "Mallas instaladas en Santiago" },
  },

  servicesIntro: {
    kicker: "Nuestros servicios",
    titleLead: "Soluciones profesionales para",
    titleHighlight: "proteger y equipar",
    titleTail: "tus espacios",
    intro:
      "Instalamos con precisión, utilizamos materiales certificados y entregamos resultados que realmente duran.",
  },

  services: [
    {
      slug: "mallas-de-seguridad",
      title: "Mallas de Seguridad Residencial, Industrial, Monofilamento y Multifilamento",
      shortTitle: "Mallas de seguridad",
      icon: "shield",
      image: {
        src: `${UPLOADS}/20251108_124317-scaled.webp`,
        alt: "Malla de seguridad instalada en un balcón residencial en Pudahuel",
        width: 2560,
        height: 1196,
      },
      modalities: ["full"],
      description:
        "Instalamos mallas de seguridad certificadas en monofilamento y multifilamento de alta resistencia, para proteger personas, mascotas y espacios. Trabajamos con materiales de primera línea adaptados a cada tipo de instalación.",
      benefits: [
        "Protección efectiva para niños, mascotas y trabajadores",
        "Dos opciones de malla según exigencia y presupuesto",
        "Estética discreta que no invade visualmente el espacio",
      ],
      details: {
        specsTitle: "Especificaciones técnicas",
        // VALIDAR: resistencias y vida útil.
        specs: [
          {
            title: "Monofilamento",
            tags: ["Poliamida", "0,8 mm", "Trama 5×5 cm", "Doble nudo", "Tratamiento UV"],
            highlights: ["90 kg/m²", "Hasta 2 años"],
            note: "Filtra la radiación solar y prolonga su vida útil. Ideal para uso residencial y comercial estándar.",
          },
          {
            title: "Multifilamento",
            tags: ["Nylon trenzado", "0,9 mm", "Antioxidante"],
            highlights: ["250 kg/m²", "Hasta 5 años"],
            note: "Microfibras trenzadas con estructura reforzada. Máxima capacidad de carga para instalaciones industriales y de alta exigencia.",
          },
        ],
        useCases: ["Balcones", "Ventanas", "Terrazas", "Escaleras", "Zonas industriales", "Mascotas"],
        procedureTitle: "Procedimiento de instalación",
        note: "Aplicamos estrictas normas de instalación: distancia prudente para correcta fijación de la estructura evitando desanclaje, y tensado óptimo de la malla con ganchos especialmente diseñados para garantizar seguridad y durabilidad en cada punto de anclaje.",
      },
    },
    {
      slug: "soportes-tv",
      title: "Instalación de Soportes y Racks para TV",
      shortTitle: "Soportes para TV",
      icon: "tv",
      image: {
        src: `${UPLOADS}/ChatGPT-Image-11-abr-2026-12_08_00-p.webp`,
        alt: "Televisor montado en muro con soporte",
        width: 1536,
        height: 1024,
      },
      modalities: ["full", "install"],
      description:
        "Vendemos e instalamos soportes y racks para televisores con máxima precisión. ¿Ya tienes tu soporte? También realizamos **solo la instalación**, asegurando una fijación firme, nivelada y con resultado estético impecable.",
      benefits: [
        "Instalación segura, nivelada y sin dañar paredes innecesariamente",
        "Optimización y aprovechamiento del espacio disponible",
        "Mejora estética del ambiente con acabado limpio y profesional",
      ],
      details: {
        stepsTitle: "¿Cómo funciona?",
        steps: ["Evaluación del muro", "Fijación certificada", "Nivelación perfecta", "Gestión de cables"],
        useCases: ["Living", "Dormitorios", "Oficinas", "Salas de reuniones", "Locales comerciales"],
        note: "Nos enfocamos en una instalación limpia, segura y duradera. Si ya compraste tu soporte, solo dinos el modelo y nos encargamos del resto.",
      },
    },
    {
      slug: "cortinas-roller",
      title: "Cortinas Roller Blackout y Traslúcidas",
      shortTitle: "Cortinas roller",
      icon: "blinds",
      image: {
        src: `${UPLOADS}/20251122_161700-scaled.webp`,
        alt: "Cortinas roller blackout instaladas en una oficina en Santiago Centro",
        width: 2560,
        height: 1196,
      },
      modalities: ["full", "install"],
      description:
        "Vendemos e instalamos cortinas roller **Blackout** (bloqueo total de luz) y **Traslúcidas** (filtrado suave y privacidad). ¿Ya tienes tus cortinas? Sin problema, **también hacemos solo la instalación.**",
      benefits: [
        "Blackout: bloqueo total de luz y mayor privacidad",
        "Traslúcidas: filtrado suave con luminosidad controlada",
        "Aislamiento térmico y diseño moderno en ambas opciones",
        "Fácil mantenimiento y larga vida útil",
      ],
      details: {
        specsTitle: "Tipos disponibles",
        specs: [
          {
            title: "Blackout",
            tags: ["Alta privacidad", "Aislante térmico"],
            highlights: ["Bloqueo 100% luz"],
            note: "Ideal donde necesitas oscuridad total para descanso o proyección.",
          },
          {
            title: "Traslúcida",
            tags: ["Privacidad diurna", "Luz natural"],
            highlights: ["Filtrado suave"],
            note: "Deja pasar la luminosidad conservando privacidad durante el día.",
          },
        ],
        useCases: ["Dormitorios", "Oficinas", "Salas de reuniones", "Exposición solar directa", "Living y comedores"],
        note: "Ofrecemos productos de calidad con instalación profesional, asegurando un ajuste perfecto y larga vida útil. Si ya tienes tus cortinas, solo coordina con nosotros y las instalamos.",
      },
    },
  ],

  about: {
    kicker: "Nosotros",
    titleLead: "Una empresa con",
    titleHighlight: "bases firmes",
    tagline: "“La seguridad no se improvisa.”",
    story: [
      "Nacemos como un emprendimiento enfocado en la instalación de **mallas de seguridad para hogares**, respondiendo a la necesidad real de proteger espacios de forma confiable y profesional. Con el tiempo y gracias a la confianza de nuestros clientes, incorporamos nuevos servicios —cortinas roller, soportes para TV y remodelaciones— manteniendo siempre el mismo estándar: **trabajo bien hecho, sin improvisaciones**.",
      "Somos una empresa en crecimiento, pero con mentalidad de largo plazo. Creemos que detrás de cada proyecto hay personas, familias y negocios que depositan su confianza en nuestro trabajo. Por eso no buscamos ser los más baratos: **buscamos ser los más confiables**.",
    ],
    quote: "Seguridad real. Trabajo bien hecho. Resultados que duran.",
    checks: [
      "Materiales certificados de primera línea",
      "Instalación técnica y prolija",
      "Cumplimiento real de plazos",
      "Soluciones duraderas, no temporales",
      "Asesoría directa y personalizada",
      "Cubrimos toda la Región Metropolitana",
    ],
    image: {
      src: `${UPLOADS}/20251128_131956-scaled.webp`,
      alt: "Terraza en Vitacura protegida con malla multifilamento instalada por Iron Mallas",
      width: 1196,
      height: 2560,
    },
    badge: { value: "100%", label: "Compromiso profesional" },
    pillars: [
      {
        icon: "shield",
        title: "Materiales certificados",
        description:
          "Trabajamos solo con materiales que cumplen los estándares de resistencia y durabilidad requeridos.",
      },
      {
        icon: "ruler",
        title: "Ejecución profesional",
        description:
          "Cada instalación se realiza con criterio técnico, orden y terminaciones limpias desde el primer detalle.",
      },
      {
        icon: "user",
        title: "Atención personalizada",
        description:
          "Te asesoramos directamente para encontrar la mejor solución según tu espacio, necesidad y presupuesto.",
      },
    ],
  },

  portfolioIntro: { kicker: "Portafolio", title: "Proyectos realizados" },

  projects: [
    { id: "p01", type: "image", category: "mallas", src: `${UPLOADS}/20251108_124317-scaled.webp`, width: 2560, height: 1196, title: "Balcón protegido", location: "Pudahuel", description: "Malla monofilamento instalada en balcón residencial. Protección invisible que cuida sin alterar la estética del espacio." },
    { id: "p02", type: "image", category: "mallas", src: `${UPLOADS}/20251128_131956-scaled.webp`, width: 1196, height: 2560, title: "Terraza con vista panorámica", location: "Vitacura", description: "Malla multifilamento de alta resistencia (250 kg/m²) con anclaje perimetral completo y tensado profesional certificado." },
    { id: "p03", type: "image", category: "mallas", src: `${UPLOADS}/20251128_131949-scaled.webp`, width: 1196, height: 2560, title: "Terraza Vitacura — detalle fijación", location: "Vitacura", description: "Detalle del sistema de anclaje. Cada punto es revisado individualmente para garantizar firmeza y durabilidad de hasta 5 años." },
    { id: "p04", type: "image", category: "mallas", src: `${UPLOADS}/20250926_233415-scaled.webp`, width: 2560, height: 1196, title: "Malla en piso alto", location: "Las Condes", description: "Instalación en altura con exposición solar directa. Poliamida con tratamiento UV que mantiene su tensado estructural en el tiempo." },
    { id: "p05", type: "image", category: "mallas", src: `${UPLOADS}/20250929_170631-scaled.webp`, width: 1196, height: 2560, title: "Mallas en ventanas", location: "San Miguel", description: "Malla adaptada a las ventanas de los dormitorios. Tensado milimétrico con ganchos certificados que eliminan todo riesgo de caída." },
    { id: "p06", type: "image", category: "mallas", src: `${UPLOADS}/20251007_193141-scaled.webp`, width: 2560, height: 1196, title: "Proyecto residencial integral", location: "Ñuñoa", description: "Malla monofilamento en balcón principal. Diseño discreto que no interrumpe la vista con resistencia de 90 kg/m²." },
    { id: "p07", type: "image", category: "mallas", src: `${UPLOADS}/20251029_192623-scaled.webp`, width: 1196, height: 2560, title: "Proyecto Ñuñoa — ventanas interiores", location: "Ñuñoa", description: "Intervención en ventanas interiores del mismo departamento. Acabado uniforme en toda la unidad para protección integral." },
    { id: "p08", type: "image", category: "mallas", src: `${UPLOADS}/20251022_205102-scaled.webp`, width: 2560, height: 1196, title: "Ventana de dormitorio", location: "Providencia", description: "Malla multifilamento en ventana de dormitorio. Máxima transparencia visual con resistencia certificada de 250 kg/m²." },
    { id: "p09", type: "image", category: "mallas", src: `${UPLOADS}/20251017_140745-scaled.webp`, width: 2560, height: 1196, title: "Balcón multifilamento", location: "La Florida", description: "Nylon trenzado 0,9 mm con tratamiento antioxidante para condiciones climáticas exigentes. Vida útil de hasta 5 años." },
    { id: "p10", type: "image", category: "cortinas", src: `${UPLOADS}/20251122_161700-scaled.webp`, width: 2560, height: 1196, title: "Cortinas Roller Blackout", location: "Santiago Centro", description: "Instalación en oficinas corporativas. Bloqueo total de luz, aislamiento térmico y privacidad completa para salas de reunión." },
    { id: "p11", type: "image", category: "cortinas", src: `${UPLOADS}/20251122_155614-scaled.webp`, width: 2560, height: 1196, title: "Roller Blackout — acabado final", location: "Santiago Centro", description: "Vista del ajuste y nivelación definitiva. Sistema de fijación oculto para un acabado completamente limpio y profesional." },
    { id: "v01", type: "video", category: "videos", src: `${UPLOADS}/20251219_181637.mp4`, title: "Instalación en balcón", location: "Maipú", description: "Proceso completo de instalación: desde la estructura metálica hasta el tensado final con ganchos certificados." },
    { id: "v02", type: "video", category: "videos", src: `${UPLOADS}/20251209_202409.mp4`, title: "Tensado profesional de malla", location: "Providencia", description: "Demostración del tensado de malla multifilamento. Cada punto de anclaje es controlado para uniformidad y firmeza." },
    { id: "v03", type: "video", category: "videos", src: `${UPLOADS}/20251209_183335.mp4`, title: "Malla en terraza de piso alto", location: "Las Condes", description: "Trabajo especializado en altura con procedimientos certificados para entornos con viento y exposición solar." },
    { id: "v04", type: "video", category: "videos", src: `${UPLOADS}/20251202_150437.mp4`, title: "Proyecto multivano", location: "San Bernardo", description: "Instalación en múltiples ventanas de departamento en un mismo día. Resultado limpio y uniforme para toda la familia." },
    { id: "v05", type: "video", category: "videos", src: `${UPLOADS}/20251106_191454.mp4`, title: "Montaje de estructura metálica", location: "Peñalolén", description: "Detalle del proceso de montaje de la estructura perimetral de acero que garantiza el correcto tensado de la malla." },
    { id: "v06", type: "video", category: "videos", src: `${UPLOADS}/20251101_141021.mp4`, title: "Proyecto residencial completo", location: "Pudahuel", description: "Malla monofilamento con tratamiento UV en balcón de edificio. Adaptación exacta al contorno estructural existente." },
  ],

  schedule: {
    kicker: "Agenda online",
    titleLead: "Agenda tu",
    titleHighlight: "visita técnica",
    intro:
      "Coordinamos una evaluación profesional para revisar tu espacio, tomar medidas y recomendar la mejor solución según tu necesidad.",
    benefits: [
      "Evaluación para mallas de seguridad en balcones y ventanas.",
      "Revisión técnica para recambio o instalación nueva.",
      "Asesoría según tipo de espacio, exposición y nivel de protección.",
      "Coordinación directa y ordenada según disponibilidad.",
    ],
    note: "Selecciona el día y horario disponible. La visita técnica nos permite entregar una recomendación más precisa y una cotización mejor ajustada a tu proyecto.",
    cal: {
      link: "ironmallas-ironmallas-9xsuaw/visita-tecnica",
      namespace: "visita-tecnica",
      origin: "https://app.cal.com",
    },
  },

  faqIntro: {
    kicker: "FAQ",
    titleLead: "Preguntas",
    titleHighlight: "frecuentes",
    intro:
      "Resolvemos las dudas más comunes antes de que empieces tu proyecto. ¿No encuentras tu respuesta? Escríbenos directamente.",
  },

  faqs: [
    {
      question: "¿Cuánto tiempo demora una instalación?",
      answer: [
        "La mayoría de las instalaciones se completan en **el mismo día**. Una malla de seguridad en balcón o ventana toma entre **1 y 3 horas** según la complejidad. Proyectos más amplios pueden requerir 2 días. Te confirmamos el plazo exacto al momento de cotizar.",
      ],
    },
    {
      question: "¿Cuál es la diferencia entre malla monofilamento y multifilamento?",
      answer: [
        "La **malla monofilamento** es de poliamida 0,8 mm con tratamiento UV. Resiste hasta **90 kg/m²**, vida útil hasta **2 años**. Ideal para uso residencial.",
        "La **malla multifilamento** es nylon trenzado 0,9 mm con tratamiento antioxidante. Soporta hasta **250 kg/m²**, dura hasta **5 años**. Para instalaciones de alta exigencia.",
      ],
      tags: ["Monofilamento — 90 kg/m² · 2 años", "Multifilamento — 250 kg/m² · 5 años"],
    },
    {
      question: "¿Hacen solo la instalación si ya tengo los soportes o cortinas?",
      answer: [
        "Para **soportes de TV y cortinas roller**, sí hacemos solo la instalación con material del cliente.",
        "Para las **mallas de seguridad**, trabajamos exclusivamente con nuestros materiales certificados para garantizar resistencia y vida útil.",
      ],
      tags: ["✓ Soportes TV — solo instalación", "✓ Cortinas roller — solo instalación", "✗ Mallas — material + instalación certificada"],
    },
    {
      question: "¿En qué comunas de Santiago trabajan?",
      answer: [
        "Trabajamos en toda la **Región Metropolitana**: Las Condes, Providencia, Vitacura, Ñuñoa, San Miguel, La Florida, Maipú, Pudahuel, Peñalolén, San Bernardo, Santiago Centro y más. Consúltanos si tienes dudas sobre tu sector.",
      ],
    },
    {
      question: "¿Realizan instalaciones en altura o pisos altos?",
      answer: [
        "Sí. Contamos con experiencia y equipamiento para trabajar en **edificios y pisos altos** con todos los protocolos de seguridad. Evaluamos el acceso y la estructura en la visita de cotización sin costo adicional.",
      ],
    },
    {
      // VALIDAR: condiciones de garantía.
      question: "¿Sus instalaciones tienen garantía?",
      answer: [
        "Sí. Respaldamos nuestro trabajo con **garantía sobre la instalación**. Cualquier problema de fijación o desanclaje lo resolvemos sin costo. Vida útil de hasta **2 años (monofilamento)** y **5 años (multifilamento)**.",
      ],
    },
    {
      question: "¿Cómo puedo solicitar una cotización?",
      answer: [
        "Contáctanos por **WhatsApp**, llena el **formulario** en esta página o escríbenos por **Instagram**. Cuéntanos el tipo de instalación, la comuna y envíanos una foto del espacio. Te respondemos en **menos de 24 horas hábiles**.",
      ],
      tags: ["WhatsApp", "Formulario web", "Instagram", "Respuesta en 24 hrs"],
    },
  ],

  quoteForm: {
    kicker: "Contacto",
    titleLead: "Cotización",
    titleHighlight: "gratuita",
    intro: "Completa el formulario y te respondemos en menos de 24 horas con una propuesta a medida.",
    serviceOptions: [
      "Mallas de seguridad",
      "Mallas multifilamento",
      "Soporte para TV",
      "Cortinas roller",
      "Pintura",
      "Piso epóxico",
      "Remodelación de cocina",
      "Remodelación general",
      "Otro / No sé aún",
    ],
    privacyNote: "Usamos tus datos solo para responder tu solicitud y preparar tu cotización. Detalles en la política de privacidad.",
  },

  footer: {
    description:
      "Soluciones integrales en seguridad, instalación y remodelación para hogares y empresas en Santiago de Chile.",
    slogan: ["Seguridad real.", "Trabajo bien hecho."],
    otherServices: ["Pintura", "Piso epóxico", "Remodelación"],
    credit: { label: "Upzites", href: "https://www.upzites.com" },
  },
};
