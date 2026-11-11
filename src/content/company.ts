/**
 * Identificación legal de Iron Mallas, tomada del certificado de inicio de actividades (SII, 20-07-2026)
 * y del certificado de estatuto actualizado (Registro de Empresas y Sociedades, 13-07-2026).
 * Iron Mallas es la marca comercial; la titular es la sociedad indicada.
 * El correo y teléfono de contacto son los comerciales publicados en el sitio (no los del trámite SII).
 */
export const company = {
  brand: "Iron Mallas",
  legalName: "Solinteg Security Asociados SpA",
  rut: "78.467.119-4",
  address: "Antonio Bellet 193, oficina 1210, piso 12, Providencia, Región Metropolitana, Chile",
  addressShort: "Antonio Bellet 193, of. 1210, Providencia",
  commune: "Providencia",
  activity: "Venta e instalación de chapas eléctricas y mallas de seguridad",
  /** SII: contribuyente de primera categoría, afecto a IVA (giro 432900, otras instalaciones para obras de construcción). */
  taxRegime: "Contribuyente de primera categoría, afecto a IVA",
  email: "contacto@ironmallas.cl",
  phoneDisplay: "+56 9 4582 3209",
  website: "ironmallas.cl",
} as const;

/** Línea de identificación del proveedor para pies de página y documentos. */
export const companyIdentification = `${company.brand} es una marca de ${company.legalName} · RUT ${company.rut}`;
