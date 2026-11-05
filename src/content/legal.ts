/**
 * Textos legales públicos. BORRADOR sujeto a revisión legal antes de su publicación definitiva.
 * Los datos marcados con [PENDIENTE: …] deben ser aprobados por Iron Mallas; no se inventan.
 * Referencia normativa: Ley 19.628 sobre Protección de la Vida Privada, modificada por la Ley 21.719
 * (publicada el 13-12-2024; entrada en vigencia prevista el 01-12-2026), y sus eventuales modificaciones o reglamentos.
 */
export type LegalSection = { title: string; paragraphs: string[]; items?: string[] };
export type LegalDocument = { title: string; version: string; updated: string; draftNotice: string; intro: string; sections: LegalSection[] };

const DRAFT = "Borrador sujeto a revisión legal. Los datos señalados como pendientes deben completarse y aprobarse antes de la publicación definitiva.";

export const privacyPolicy: LegalDocument = {
  title: "Política de privacidad",
  version: "0.9 (borrador)",
  updated: "5 de noviembre de 2026",
  draftNotice: DRAFT,
  intro: "Esta política explica cómo Iron Mallas trata los datos personales de las personas que solicitan cotizaciones, agendan visitas o contratan sus servicios de instalación de mallas de seguridad y otros trabajos en el hogar, en Chile.",
  sections: [
    { title: "1. Responsable del tratamiento", paragraphs: [
      "Iron Mallas ([PENDIENTE: razón social]), RUT [PENDIENTE: RUT], con domicilio en [PENDIENTE: domicilio legal], Santiago de Chile.",
      "Contacto para privacidad: contacto@ironmallas.cl · WhatsApp +56 9 4582 3209. [PENDIENTE: confirmar si existe un correo específico para privacidad o un delegado de protección de datos].",
    ] },
    { title: "2. Datos que recolectamos", paragraphs: ["Solo pedimos los datos necesarios para responder y prestar el servicio:"], items: [
      "Identificación y contacto: nombre, teléfono o WhatsApp y, si lo entregas, correo electrónico.",
      "Datos del trabajo: dirección o comuna, tipo de servicio, medidas, fotografías y observaciones de las zonas a proteger.",
      "Historial comercial: solicitudes, cotizaciones, visitas, instalaciones, pagos registrados y garantías.",
      "Origen de la solicitud: canal por el que nos contactaste (sitio web, WhatsApp, formularios de Facebook o Instagram) y, cuando existan, parámetros de campaña (por ejemplo UTM) o identificadores del anuncio entregados por Meta.",
      "Datos técnicos mínimos para seguridad del sitio y prevención de abuso (por ejemplo, una huella cifrada de la dirección IP para limitar envíos repetidos).",
    ] },
    { title: "3. Para qué usamos tus datos", paragraphs: [], items: [
      "Responder tu solicitud de contacto y preparar cotizaciones (finalidad precontractual).",
      "Agendar y realizar visitas técnicas e instalaciones.",
      "Gestionar la relación con clientes: seguimiento, pagos, garantías y atención posterior.",
      "Medir el resultado de campañas publicitarias, solo si aceptas cookies de analítica o marketing, o mediante datos de origen entregados por la propia plataforma cuando nos contactas desde un anuncio.",
      "Cumplir obligaciones legales, tributarias y de seguridad.",
    ] },
    { title: "4. Base de licitud", paragraphs: [
      "Tratamos tus datos con tu consentimiento (por ejemplo, al enviar el formulario), para ejecutar medidas precontractuales o el contrato que solicitas, y para cumplir obligaciones legales. Puedes retirar tu consentimiento en cualquier momento, sin efecto retroactivo.",
    ] },
    { title: "5. Contacto, cotizaciones y WhatsApp", paragraphs: [
      "Si nos escribes por WhatsApp, registramos en nuestro sistema de gestión los datos necesarios para responderte (nombre, teléfono, servicio y notas). Las conversaciones se mantienen en WhatsApp, servicio de Meta, sujeto a sus propias condiciones.",
      "Las cotizaciones se generan como documento PDF y pueden compartirse contigo mediante un enlace privado con vencimiento.",
    ] },
    { title: "6. Proveedores que procesan datos por encargo", paragraphs: ["Usamos proveedores tecnológicos que tratan datos solo para prestarnos su servicio. Algunos pueden almacenar datos fuera de Chile:"], items: [
      "Supabase: base de datos, autenticación del panel y almacenamiento de archivos.",
      "Vercel: alojamiento del sitio web.",
      "Cal.com: agendamiento en línea, solo si usas el calendario.",
      "Resend: envío de correos transaccionales, cuando esté habilitado.",
      "Meta Platforms (WhatsApp, Facebook, Instagram): mensajería y formularios de anuncios, cuando nos contactas por esos canales.",
      "Google: reseñas públicas del negocio y, solo con tu consentimiento, analítica web.",
      "[PENDIENTE: confirmar la lista definitiva y las regiones de alojamiento contratadas].",
    ] },
    { title: "7. Conservación", paragraphs: [
      "Conservamos los datos mientras exista una relación comercial o solicitud activa y, después, durante el plazo necesario para atender garantías y obligaciones legales. [PENDIENTE: plazo aprobado, por ejemplo N años desde el último servicio]. Las solicitudes que no avanzan a cotización se eliminan o anonimizan en [PENDIENTE: plazo].",
    ] },
    { title: "8. Seguridad", paragraphs: [
      "Aplicamos medidas técnicas y organizativas razonables: acceso al panel solo para personal autorizado con contraseña, control de permisos por rol en la base de datos, conexiones cifradas, registros de auditoría y enlaces de documentos con vencimiento.",
    ] },
    { title: "9. Tus derechos", paragraphs: ["Como titular puedes solicitar:"], items: [
      "Acceso a tus datos y a la información sobre su tratamiento.",
      "Rectificación de datos inexactos o incompletos.",
      "Supresión de tus datos cuando proceda.",
      "Oposición al tratamiento, incluida la publicidad.",
      "Portabilidad de tus datos en un formato estructurado.",
      "Bloqueo temporal del tratamiento en los casos que establece la ley.",
    ] },
    { title: "10. Cómo ejercer tus derechos", paragraphs: [
      "Escríbenos a contacto@ironmallas.cl o por WhatsApp indicando tu nombre, el derecho que quieres ejercer y un medio de contacto. Podremos pedirte antecedentes para verificar tu identidad. Responderemos dentro del plazo legal aplicable [PENDIENTE: confirmar plazo con asesoría legal].",
      "Si no quedas conforme con la respuesta, podrás recurrir ante la autoridad de control competente (la Agencia de Protección de Datos Personales, una vez en funcionamiento) conforme a la ley.",
    ] },
    { title: "11. Cookies", paragraphs: ["Revisa nuestra Política de cookies para conocer qué cookies usamos y cómo cambiar tus preferencias."] },
    { title: "12. Cambios a esta política", paragraphs: ["Podemos actualizar esta política. Publicaremos la versión vigente y su fecha en esta página."] },
  ],
};

export const cookiePolicy: LegalDocument = {
  title: "Política de cookies",
  version: "0.9 (borrador)",
  updated: "5 de noviembre de 2026",
  draftNotice: DRAFT,
  intro: "Las cookies son pequeños archivos que el navegador guarda al visitar un sitio. Esta política describe las que usa ironmallas.cl según la auditoría técnica del 5 de noviembre de 2026.",
  sections: [
    { title: "1. Cookies necesarias (siempre activas)", paragraphs: ["Permiten el funcionamiento básico y no requieren consentimiento:"], items: [
      "im_consent: guarda tu decisión sobre cookies opcionales (versión, categorías y fecha). Duración: 6 meses.",
      "Cookies de sesión de Supabase (sb-…): solo en el panel de administración, para mantener la sesión del personal autorizado.",
    ] },
    { title: "2. Servicios de terceros activados por ti", paragraphs: [
      "El calendario de Cal.com se carga solo cuando presionas el botón para ver disponibilidad. Desde ese momento Cal.com puede usar sus propias cookies necesarias para la reserva. Los botones de WhatsApp e Instagram son enlaces: no cargan contenido de Meta hasta que los abres.",
    ] },
    { title: "3. Cookies de analítica (opcionales)", paragraphs: [
      "Hoy no están activas. Si Iron Mallas habilita Google Analytics, solo se cargará después de que lo aceptes, para obtener estadísticas agregadas de visitas.",
    ] },
    { title: "4. Cookies de marketing (opcionales)", paragraphs: [
      "Hoy no están activas. Si se habilita Meta Pixel para medir campañas de Facebook e Instagram, solo se cargará después de que lo aceptes. Las solicitudes que envías por el formulario se guardan sin depender de estas cookies.",
    ] },
    { title: "5. Cómo cambiar tus preferencias", paragraphs: [
      "Usa el enlace «Preferencias de cookies» al pie de cualquier página para aceptar, rechazar o configurar las categorías opcionales cuando existan. También puedes borrar las cookies desde tu navegador.",
    ] },
    { title: "6. Contacto", paragraphs: ["Consultas: contacto@ironmallas.cl. Más información en la Política de privacidad."] },
  ],
};
