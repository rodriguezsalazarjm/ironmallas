# Iron Mallas 2.0 — Mejoras comerciales (5 de noviembre de 2026)

El objetivo es que Álvaro pueda hacer su trabajo diario desde el celular o el computador con pocos clics. Este documento distingue lo **probado localmente** (pruebas automáticas, PGlite y navegador local) de lo que **depende de servicios externos**.

> Estado de Supabase remoto al 5-11-2026 (consulta de solo lectura): 3 migraciones aplicadas; 0 tarifas, 0 servicios, 0 condiciones comerciales, 0 contactos, 0 oportunidades, 0 cotizaciones y 0 filas de contenido. **La migración `20261105120000_commercial_simplification.sql` NO está aplicada en remoto.**

## 1. Implementado y probado

| Cambio | Dónde | Cómo se probó |
|---|---|---|
| **Navegación nueva**: Inicio · Comercial (Oportunidades, Clientes, Agenda, Instalaciones, Pagos, Generar cotización) · Reseñas · Mi cuenta. Menú plegable en teléfono, barra inferior táctil (Inicio, Oportunidades, **Cotizar**, Agenda) y botón «+ Lead WhatsApp» siempre visible | `src/components/admin/navigation.tsx`, `src/app/admin/(private)/layout.tsx` | Prueba de rutas del menú (`tests/commercial.test.ts`), typecheck y build |
| **CMS administrativo retirado**: se eliminaron las acciones `saveContent`, `publishContent`, `savePromotion`, `initializeContent`, el editor, la vista previa, `uploadPublicMedia` y la publicación de la política desde el panel. `/admin/contenido` redirige a Inicio. La migración revoca `insert/update/delete` de `content_entries` a usuarios autenticados (las filas se conservan) | `src/lib/content.ts`, `src/features/content/*`, `src/features/media/actions.ts`, `src/features/privacy/actions.ts` | `tests/platform.test.ts` (escritura rechazada), `tests/commercial.test.ts` |
| **Contenido web estático y documentado**: textos, servicios, hero, galerías y FAQ en `src/content/site.ts`; textos legales en `src/content/legal.ts`. Solo las reseñas aprobadas siguen leyéndose de Supabase | `src/lib/content.ts` | Build y página de inicio verificada en navegador |
| **Pestañas retiradas**: Cotizaciones, Privacidad y Configuración salen del menú. `/admin/configuracion` → `/admin/cuenta`. El historial de cotizaciones se consulta desde la oportunidad, la ficha del cliente y el enlace «Historial» del generador. Tarifario, usuarios, solicitudes de privacidad, notificaciones, auditoría, estados de oportunidad y estado de integraciones quedan en **Mi cuenta → Controles técnicos** (solo SUPERADMIN) | `src/app/admin/(private)/cuenta/page.tsx` | Build; rutas siguen exigiendo sesión (proxy + `requireAdmin`) |
| **Generador de cotizaciones en una pantalla** (A Cliente → B Servicio → C Medidas → D Valor → E Resumen/PDF). Cliente existente o nuevo (nombre, WhatsApp, dirección/comuna, correo opcional). Zonas balcón/ventana/logia/terraza/otra con ancho, alto, cantidad, superficie por zona y total. Adicionales/laterales/recargos como conceptos separados. Tarifa por m² con mínimo y recargo, descuento autorizado, IVA configurable (omitirlo solo SUPERADMIN), valor neto manual con procedencia obligatoria (solo SUPERADMIN). Guardar borrador, nueva versión, descargar/ver PDF | `src/features/quotes/quick*.ts(x)`, `src/app/admin/(private)/cotizaciones/nueva/page.tsx`, `private.save_quick_quote` | **Paridad navegador ↔ servidor**: la misma carga se calcula en TS y en la función SQL (PGlite) con resultados idénticos; permisos (ADMIN sin valor manual, descuento máximo, IVA), versión desactualizada rechazada, estado sigue en borrador |
| **PDF profesional** (#06365A / #FC6B04, logo `public/brand/logo.png`): número, fecha, vigencia, emisor, cliente, dirección del trabajo, servicio, tabla de medidas, superficie total, conceptos, neto/IVA/total, condiciones, contacto y WhatsApp. Pagina tablas largas. RUT y garantía solo si están configurados | `src/features/quotes/pdf-quick.ts` | PDF válido desde snapshot real de PGlite; 30 zonas paginan |
| **No se marca «enviado» por descargar o abrir WhatsApp**: guardar deja la cotización en borrador; el enlace seguro (7 días) y el mensaje de WhatsApp están disponibles también en borrador; el envío se registra manualmente en «Estado comercial» | `cotizaciones/[id]/page.tsx`, `share-token.ts` | `tests/quote-pdf.test.ts` actualizado |
| **Políticas públicas** `/politica-de-privacidad` y `/politica-de-cookies` (borrador para revisión legal, datos faltantes marcados `[PENDIENTE: …]`). `/privacidad` redirige (308). Enlaces legales y «Preferencias de cookies» en el pie | `src/content/legal.ts`, `src/app/(site)/politica-*` | Navegador local: contenido, redirección, enlaces |
| **Cookies**: auditoría → hoy solo hay cookies necesarias (`sb-*` del panel y `im_consent`); Cal.com se carga solo al pulsar; no hay GA ni Pixel. Gestor granular (necesarias/analítica/marketing) que solo aparece si se configura `NEXT_PUBLIC_GA_ID` o `NEXT_PUBLIC_META_PIXEL_ID`, carga scripts solo tras aceptar, permite rechazar/configurar/cambiar y guarda versión + decisión + fecha (sin datos personales) | `src/features/consent/consent.ts`, `src/components/site/cookie-consent.tsx` | Pruebas unitarias; navegador: 0 scripts de terceros y 0 cookies al cargar |
| **Formulario web**: id de envío idempotente, `fbclid`/`gclid` además de UTMs, consentimiento con enlace a la política, éxito solo tras guardar, botón «Continuar por WhatsApp» después de guardar y respaldo WhatsApp si falla o no hay backend | `quote-form.tsx`, `features/leads/*`, `submit_public_lead` (fuente `WEB`) | PGlite: mismo `submission_id` no duplica; UTM = atribución «no confirmada» |
| **Lead rápido desde WhatsApp** (`/admin/leads/whatsapp`): nombre, teléfono, servicio, comuna, nota, estado, próxima acción y seguimiento; botón «Abrir chat». Reutiliza el contacto por teléfono y no duplica oportunidades abiertas de las últimas 72 h (agrega la nota al historial) | `src/features/leads/whatsapp-*.ts(x)` | Typecheck/build (requiere sesión y migración para uso real) |
| **Fuentes y seguimiento**: WEB, META_LEAD_AD, META_WHATSAPP, WHATSAPP_MANUAL, CONTACTO_MANUAL; confianza de la fuente (observada/manual), atribución de campaña (ninguna/Meta/UTM no confirmada), base de tratamiento, próxima acción, filtro por fuente, oportunidades recientes en Inicio | `src/features/leads/sources.ts`, páginas de oportunidades e Inicio | Pruebas de etiquetas y deduplicación |
| **Meta Lead Ads (preparado)**: `GET/POST /api/webhooks/meta` con verificación de suscripción, firma `X-Hub-Signature-256`, lectura del lead por Graph API (token de página con `leads_retrieval`), filtro por página y formularios, idempotencia por `leadgen_id` y respuesta 500 para que Meta reintente | `src/features/integrations/meta.ts`, `ingest.ts` | **Simulado**: firma, desafío, filtros, reintento, mapeo de campos y duplicados con fetch/almacenamiento falsos |
| **WhatsApp Cloud API (arquitectura)**: `/api/webhooks/whatsapp` desactivado por defecto (`WHATSAPP_CLOUD_ENABLED`), firma verificada, una oportunidad por número y día, guarda `ctwa_clid`/referencia del anuncio cuando Meta la entrega | mismo módulo | **Simulado** con payloads sintéticos |
| **Entrada única** `public.ingest_external_lead` (solo `service_role`): normaliza teléfono, reutiliza contacto por teléfono/correo, idempotente por `(source, external_id)` | migración nueva | PGlite: duplicado devuelve el mismo id; usuarios autenticados rechazados |

Resultado local (5-11-2026): `npm test` → 48 pruebas, 44 aprobadas, 0 fallidas, 4 omitidas (requieren `TEST_BASE_URL`); `eslint` sin problemas; `typecheck` y `next build` correctos. Verificación en navegador local de páginas públicas, redirecciones, ausencia de rastreadores y webhooks sin firma (403/401/404).

**No verificado en navegador:** las pantallas del panel (requieren iniciar sesión con la cuenta real y la migración aplicada).

## 2. Implementado, pendiente de servicio externo

1. **Aplicar la migración** `supabase/migrations/20261105120000_commercial_simplification.sql` en Supabase (aditiva: correo opcional, columnas de oportunidades, `quotes.details`, `save_quick_quote`, `ingest_external_lead`, `submit_public_lead` actualizado, revocación de escritura del CMS). Sin ella: el cotizador rápido, el lead de WhatsApp y los clientes sin correo muestran un mensaje que pide aplicarla; el formulario web sigue funcionando con la versión anterior.
2. Regenerar `src/lib/supabase/database.types.ts` desde el esquema remoto tras aplicarla.
3. Cargar en Mi cuenta → Tarifario las **condiciones comerciales** (IVA, validez, condiciones de pago, nombre/teléfono/correo de la empresa) y las **tarifas por m²** aprobadas. Sin condiciones no se puede guardar ninguna cotización; sin tarifas, solo SUPERADMIN puede usar valor manual.
4. Enlace seguro del PDF: `QUOTE_SHARE_SECRET` (≥ 32 caracteres) y `NEXT_PUBLIC_SITE_URL` en Vercel.
5. Meta Lead Ads y WhatsApp Cloud API: credenciales y permisos (sección 5).

## 3. Dependencias comerciales

- ~~Tarifario base~~ **Resuelto (5-11-2026):** instalación solo ángulos $6.000/m lineal, recambio $5.000/m lineal, pilares $17.990 (2,00 m) y $19.990 (2,40 m), en la migración `20261105150000_quote_linear_pricing.sql`. Ver `docs/cotizador/README.md`. Pendiente: descuento máximo para ADMIN, mínimos y recargos si existen.
- Condiciones de pago, vigencia y, si existe, garantía aprobada para el PDF.
- **Resuelto:** identificación legal desde los certificados SII y de estatuto (`src/content/company.ts`): Solinteg Security Asociados SpA, RUT 78.467.119-4, Antonio Bellet 193 of. 1210, Providencia. Se usa en PDF, pie del sitio y políticas.
- Confirmar los tipos de malla y características que deben ofrecerse (hoy: malla de seguridad, multifilamento, otro; niños, mascotas, altura, retiro de malla existente).
- Definir quién responde las oportunidades y la próxima acción estándar.

## 4. Dependencias legales

- Revisión legal de ambas políticas antes de quitar la marca de borrador. Ya completados: razón social, RUT, domicilio y plazo de respuesta (30 días corridos, Ley 21.719, a validar). Faltan: delegado de protección de datos (si se designa), plazo de conservación de solicitudes no convertidas, confirmación del plazo tributario con el contador y lista final de proveedores y regiones.
- Ley 19.628 modificada por la **Ley 21.719** (entrada en vigencia prevista el 1-12-2026): confirmar bases de licitud (consentimiento del formulario; solicitud precontractual para contactos por WhatsApp/teléfono), deber de información en formularios de Meta (enlazar la política en el formulario instantáneo) y procedimiento ARCOP (hoy: Mi cuenta → Solicitudes de privacidad).
- Antes de activar GA o Meta Pixel: actualizar la política de cookies con nombres, duración y finalidad exactos.

## 5. Credenciales y autorizaciones necesarias

| Servicio | Variables | Autorización |
|---|---|---|
| Supabase | ya configuradas | Autorizar la aplicación de la migración nueva |
| Meta Lead Ads | `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_LEAD_FORM_IDS` | App de Meta con producto Webhooks (campo `leadgen` de la página), permisos `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`; la página debe dar acceso a la app (Herramienta de acceso a clientes potenciales). Probar con la **Lead Ads Testing Tool** oficial antes de campañas reales |
| WhatsApp Cloud API (opcional) | `WHATSAPP_CLOUD_ENABLED`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Primero identificar si el número usa WhatsApp Business App, Cloud API o coexistencia, y su elegibilidad. **No migrar el número comercial sin evaluar el impacto** |
| Analítica / Pixel (opcional) | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Solo tras aprobar la política de cookies; se cargan únicamente con consentimiento |
| PDF compartible | `QUOTE_SHARE_SECRET`, `NEXT_PUBLIC_SITE_URL` | — |

## 6. Próximas acciones

1. Autorizar y aplicar la migración en Supabase; regenerar tipos.
2. Cargar condiciones comerciales y tarifario real; generar una cotización de prueba completa en el panel (celular y computador) y revisar el PDF.
3. Enviar una solicitud real desde el formulario web y confirmar que aparece en Comercial → Oportunidades con fuente WEB.
4. Revisión legal de las políticas; reemplazar los `[PENDIENTE]`.
5. Configurar la app de Meta y probar con un lead sintético oficial; luego activar en campañas.
6. Decidir sobre WhatsApp Cloud API tras revisar coexistencia.
