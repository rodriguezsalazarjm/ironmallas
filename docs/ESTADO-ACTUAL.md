# Iron Mallas 2.0 — auditoría de estado actual

> **DESACTUALIZADO (11-nov-2026):** este informe es histórico. Ya existe `.env.local`, seis migraciones están aplicadas en remoto (la sexta, `20261111173128_agenda_operations`, el 11-11-2026) y la suite tiene 66 pruebas. Para la agenda, fichas, Cal.com, correos y cotizador vigentes, ver [AGENDA-OPERATIVA.md](AGENDA-OPERATIVA.md) y [PROGRESO.md](PROGRESO.md).

> Continuación vigente: Supabase/Vercel pospuestos por decisión del propietario. Avance local y verificaciones: [ENTREGA-LOCAL-SIN-SERVICIOS.md](ENTREGA-LOCAL-SIN-SERVICIOS.md). Este documento conserva el diagnóstico/plan histórico.

Continuidad: este documento conserva la auditoría original. Las correcciones locales posteriores, la tercera migración preparada y el estado actualizado de OAuth se registran en [PROGRESO.md](PROGRESO.md); la activación se detalla en [ACTIVACION-FASE-2A.md](ACTIVACION-FASE-2A.md).

Fecha: 2 de noviembre de 2026, America/Santiago. Repositorio: `C:\dev\Ironmallas`.
Alcance: código local, pruebas locales y consultas remotas de solo lectura. No se modificaron código de producción, migraciones, servicios, DNS ni WordPress. No se hicieron commits, pushes ni despliegues. Este informe reemplaza las conclusiones históricas para fines de continuidad; no constituye una certificación de producción.

## A. Resumen ejecutivo

Existe una web pública funcional y una aplicación administrativa amplia, con lógica de negocio real: CRM, tareas, agenda, cotizaciones con cálculo transaccional, versiones y PDF, instalaciones, pagos, garantías, contenido y testimonios manuales. No es solamente una colección de pantallas. Las pruebas ejecutan las dos migraciones en PostgreSQL embebido y verifican varias restricciones financieras y de autorización.

La activación operacional sigue pendiente. En este checkout solo existe `.env.example`; no hay `.env.local` ni variables de integración presentes en el proceso de auditoría. `/admin` redirige al acceso y el login informa configuración pendiente. Álvaro puede revisar la web local y usar sus enlaces externos; no se ha demostrado que pueda gestionar clientes, guardar solicitudes o emitir presupuestos reales desde este entorno. El formulario conserva WhatsApp cuando no puede persistir; abrir WhatsApp requiere que la persona envíe el mensaje.

El hito real es **cierre y activación de Fase 2A**, con implementación adelantada de 2B, 2C, 3 y 4. No corresponde declarar terminadas esas fases de negocio sin Supabase real, tarifas aprobadas y pruebas autenticadas. Tampoco corresponde reconstruirlas desde cero.

Resultados actuales: lint, tipos y build aprobados; 23 pruebas locales aprobadas y 4 HTTP omitidas en `npm test`, seguidas por las 4 HTTP aprobadas mediante `npm run test:http`. Cero fallos. No hay prueba de login, Storage, correo o reserva externos reales. No se realizó una revisión visual nueva de escritorio/móvil ni Lighthouse; la revisión anterior consignada en FASE-2A no se cuenta como ejecución actual.

## B. Matriz de fases y funcionalidades

Los estados son los solicitados. **COMPLETADO Y PROBADO** solo aplica al alcance concreto de la evidencia indicada. Una prueba SQL local no acredita Supabase remoto. En filas agrupadas el estado corresponde al conjunto; las carencias se explican expresamente.

| Fase | Funcionalidad | Estado | Evidencia actual | Dependencia pendiente | Próximo paso |
|---|---|---|---|---|---|
| 1 | Header, navegación, hero con video, servicios, nosotros, portafolio, FAQ, formulario y footer | COMPLETADO Y PROBADO | `src/components/site/*`, `home-content.tsx`; build y HTTP comprueban home y sus 7 secciones | QA visual e interacción actual | Revisar móvil, teclado, video, galería y enlaces |
| 1 | Identidad visual y responsive | IMPLEMENTADO SIN PRUEBA REAL | `src/app/globals.css`, componentes y navegación móvil; navy/naranja, fuentes locales de Next | Validación visual del propietario | QA 375/768/1440 px |
| 1 | SEO técnico | COMPLETADO Y PROBADO | `src/app/layout.tsx`, `sitemap.ts`, `robots.ts`, iconos, OpenGraph; HTTP 200; JSON-LD sin calificación | Canonical/indexación del entorno final; textos comerciales | Verificar preview sin indexar y datos aprobados |
| 1 | Optimización de rendimiento | PARCIALMENTE IMPLEMENTADO | `hero-video.tsx`, `cal-embed.tsx`, `next/image`, caché de `src/lib/content.ts` | Medios aún referencian WordPress; sin métricas actuales | Medir LCP/CLS/INP y presupuesto de medios |
| 1/2C | Agenda pública Cal.com | IMPLEMENTADO SIN PRUEBA REAL | Embed diferido y enlace de respaldo; no se creó reserva en auditoría | Acceso/calendario del cliente | Probar disponibilidad y reserva controlada |
| 2A | Esquema, migraciones, tipos y persistencia | PREPARADO, PERO SIN CONFIGURAR | Dos SQL en `supabase/migrations`; `tests/security.test.ts`, `platform.test.ts`; tipos manuales | Permisos sobre `kqdcotpfzluxkqdkgyts`; historial remoto desconocido | Inspeccionar antes de aplicar nada |
| 2A | Auth, roles, sesión, rutas protegidas | IMPLEMENTADO SIN PRUEBA REAL | `src/proxy.ts`, `src/lib/auth.ts`, `features/admin/actions.ts`, `features/users/*`, `/auth/confirm`; HTTP anónimo y SQL pasan | Auth/SMTP/redirects/cuentas reales | Login, renovación, invitación y revocación reales |
| 2A | Captación pública y persistencia de lead/contacto | PREPARADO, PERO SIN CONFIGURAR | `features/leads/{actions,repository,schema,rate-limit}.ts`; RPC `submit_public_lead` y prueba SQL | URL, publishable, secret servidor y secreto HMAC | Formulario → PostgREST → CRM en entorno autorizado |
| 2A | RLS y autorización local | COMPLETADO Y PROBADO | SQL con RLS, grants explícitos, `private.is_admin`; pruebas anon/ADMIN/SUPERADMIN/inactivo | Advisors y pruebas API del remoto | Verificar grants además de RLS real |
| 2A | Dashboard, clientes, actividades, seguimientos y estados | IMPLEMENTADO SIN PRUEBA REAL | `features/dashboard/*`, `admin/*`, `crm/*`; RPC `dashboard_metrics`; lógica SQL cubierta | Base y cuentas | Contrastar indicadores con registros de prueba |
| 2B | Contactos/clientes, fichas e historial | IMPLEMENTADO SIN PRUEBA REAL | `/admin/clientes`, nuevo/editar/exportar; `saveContact`, exportación JSON y auditoría | CRUD autenticado real | Probar altas, edición concurrente y conservación de relaciones |
| 2B | Leads, responsables, tareas y seguimientos | IMPLEMENTADO SIN PRUEBA REAL | `createManualLead`, `assignLead`, `createTask`, `setTaskStatus`, `recordActivity` | Cuentas y base | Ejecutar ciclo comercial con ADMIN |
| 2B | Duplicados, filtros y búsqueda | IMPLEMENTADO SIN PRUEBA REAL | `crm/actions.ts`, `crm/schema.ts`, `features/admin/data.ts`; normalización y validaciones probadas | Prueba concurrente/API real | Duplicado exacto/parcial y paginación |
| 2B | Pipeline comercial | PARCIALMENTE IMPLEMENTADO | Estados configurables, filtros e historial de cambios en oportunidades | Definir si se requiere tablero Kanban | Validar pipeline por listado; no hay tablero dedicado |
| 2C | Agenda interna, visitas, técnicos, estados, reprogramar/cancelar | IMPLEMENTADO SIN PRUEBA REAL | `/admin/agenda`, `features/appointments/*`; DST Santiago probado; control `updated_at` | Prueba CRUD real | Verificar fechas, concurrencia y responsables |
| 2C/4 | Instalaciones dentro del calendario unificado | PARCIALMENTE IMPLEMENTADO | Agenda consulta `appointments`; trabajos guardan `installations.scheduled_at`; `appointment_id` existe | Decidir fuente única y duración de instalación | Evitar citas duplicadas y fechas divergentes |
| 2C | Webhooks/sincronización Cal.com | PREPARADO, PERO SIN CONFIGURAR | `/api/webhooks/cal`, `integrations/cal.ts`, RPC `sync_cal_booking`; HMAC, idempotencia y eventos atrasados probados localmente | Webhook, secreto y eventos reales | Validar creación/reprogramación/cancelación; no hay sincronización saliente |
| 3 | Generador, m²/unidad/hora/fijo, materiales/adicionales, mínimos, recargos, descuentos e IVA | IMPLEMENTADO SIN PRUEBA REAL | `quotes/calculation.ts`, `pricing/*`, RPC `save_quote`; BigInt y cálculo SQL probado | Tarifas y condiciones comerciales; Supabase | Comprobar totales de casos aprobados en API real |
| 3 | Tarifario editable | PREPARADO, PERO SIN CONFIGURAR | `/admin/tarifario`, `savePricing`, `saveCommercial`; restringido a SUPERADMIN | Precios, IVA, identidad fiscal, validez, pago y garantía reales | Cargar únicamente datos aprobados |
| 3 | PDF, historial inmutable, versiones y estados | COMPLETADO Y PROBADO | `quotes/pdf.ts`, snapshots, RPCs; pruebas de PDF extenso, precisión y versiones | Falta recorrer UI→Supabase→PDF | Validación integrada; no equivale a factura tributaria |
| 3 | Enlaces privados y WhatsApp | PREPARADO, PERO SIN CONFIGURAR | `quotes/share-token.ts`, `/cotizacion/[token]`, ficha de cotización; firma/expiración probadas | `QUOTE_SHARE_SECRET` y origen del entorno | Prueba real de versión, vencimiento y revocación; WhatsApp manual |
| 3/5 | Envío de PDF por correo | PREPARADO, PERO SIN CONFIGURAR | `quotes/email.ts`; adjunto, registro e idempotencia del proveedor | Resend, remitente verificado y destinatario autorizado | Aceptación/entrega, errores y reintentos reales |
| 4 | Instalaciones, programación, ficha técnica y materiales | IMPLEMENTADO SIN PRUEBA REAL | `features/installations/*`; RPCs, ficha y auditoría; materiales como texto/campos técnicos | API real y aceptación operativa | Flujo presupuesto aceptado→trabajo; no existe inventario de materiales |
| 4 | Fotos privadas y biblioteca pública | PREPARADO, PERO SIN CONFIGURAR | `media/actions.ts`, `photo-input.tsx`, buckets/policies; firmas de archivos probadas | Supabase Storage real; medios autorizados | Subida, lectura firmada y aislamiento público/privado |
| 4 | Garantías y pagos | IMPLEMENTADO SIN PRUEBA REAL | `saveWarranty`, `registerPayment`, RPC `record_payment`; SQL bloquea sobrepago | Condiciones aprobadas y prueba API | Pagos parciales/concurrentes, garantía y cierre |
| 4 | Testimonios manuales | ERROR DETECTADO | `reviews/actions.ts` y `/admin/resenas` admiten nombre 120/texto 4000; SQL permite 100/3000 | Corrección local posterior | Alinear límites y probar bordes; no son Google Reviews |
| 4 | CMS de servicios, secciones, promociones, galería/portafolio | IMPLEMENTADO SIN PRUEBA REAL | `features/content/*`, `src/lib/content.ts`; borrador, preview, publicación y validación sin HTML arbitrario | Base, medios y revisión editorial | Verificar publicación/invalidación; catálogo comercial y contenido público son estructuras distintas |
| 4 | Configuración administrativa, privacidad y solicitudes | PARCIALMENTE IMPLEMENTADO | `settings`, `privacy_requests`, `/admin/configuracion`, `/admin/privacidad`; permisos SQL probados | Política y retención aprobadas | Resolver límite motivo 4000 en acción vs 3000 SQL; no hay borrado automático |
| 5 | Resend, notificaciones y automatizaciones | PREPARADO, PERO SIN CONFIGURAR | `notifications/*`, endpoint POST con Bearer y reintentos; `vercel.json` sin cron | Proveedor, preferencias y scheduler | Elegir invocador compatible con POST; evitar envíos sin consentimiento |
| 5 | Meta Pixel y analítica | NO IMPLEMENTADO | Búsqueda de `fbq`, `gtag`, pixel y scripts en aplicación sin integración | IDs, métricas y decisión de consentimiento | Definir medición sin datos personales |
| 5 | Auditoría de seguridad y pruebas funcionales | PARCIALMENTE IMPLEMENTADO | 27 casos locales/HTTP aprobados en dos comandos; audit producción 0 | E2E autenticado, advisors, QA visual y dependencias dev | Cerrar controles antes de habilitar operación |
| 5 | GitHub y CI | PARCIALMENTE IMPLEMENTADO | Remoto solo `main`; workflow local sin seguimiento | Revisión y publicación futuras autorizadas | Preservar cambios y publicar rama tras revisión |
| 5 | Vercel/preview | BLOQUEADO POR DEPENDENCIA EXTERNA | Proyecto localizado; listado de despliegues devuelve 403 | Acceso al equipo Vercel | Consultar despliegue/commit/logs/variables; URL no verificada |
| 5 | Google Business Profile — reseñas | NO IMPLEMENTADO | Solo testimonios manuales; sin proveedor, OAuth, caché ni sincronización Google | Ficha exacta y permisos/aprobación | Secuencia y requisitos en G y plan |

No se detectó rotura de renderizado de la home por el backend: build y HTTP pasan sin configuración. Esto no descarta problemas de interacción, medios remotos o contenido publicado, todavía no comprobados.

## C. Estimación de avance

Se estima **preparación para aceptación**, no líneas de código, horas consumidas ni porcentaje de pantallas existentes. Cada fase se divide en paquetes con puntos máximos proporcionales al riesgo de negocio. Para otorgar los puntos se consideran implementación, pruebas locales, integración real y aceptación comercial. Un módulo con SQL probado pero sin API/usuario real conserva puntos pendientes; un bloqueo no implica código inexistente. Los puntos son juicio de auditoría reproducible por paquete y no una medición contractual. Incertidumbre orientativa: ±10 puntos globales.

| Fase | Paquetes: puntos obtenidos/máximos | Avance estimado | Peso global |
|---|---|---:|---:|
| 1 | Secciones 45/45; SEO 15/15; responsive 10/15; rendimiento 7/15; identidad aprobada 8/10 | 85% | 15% |
| 2A | Esquema/RLS 25/25; Auth 18/30; captación 14/20; resumen/gestión 8/15; activación remota 0/10 | 65% | 15% |
| 2B | CRUD 22/35; historial 18/25; tareas 13/20; pipeline 5/10; búsqueda 7/10 | 65% | 15% |
| 2C | Agenda 30/40; ciclo de visita/instalación 20/30; Cal.com 10/30 | 60% | 10% |
| 3 | Cálculo 30/35; versiones/estados 18/25; PDF 12/15; compartir 5/10; canales reales 0/15 | 65% | 20% |
| 4 | Operaciones/fotos 22/35; pagos/garantía 15/25; CMS 13/25; testimonios 5/15 | 55% | 15% |
| 5 | Pruebas 12/20; seguridad 10/20; GitHub 3/10; Vercel 3/15; activación integraciones/analítica 2/20; Google 0/15 | 30% | 10% |

Global = Σ(avance × peso) = **62,5%**. Google queda dentro de Fase 5 (0/15 de esa fase); no se duplica como fase adicional. El funcionamiento productivo del backend tiene **0 flujos remotos confirmados** en esta auditoría: el 62,5% nunca significa 62,5% de operación real disponible.

## D. Backend y Supabase exclusivo

Destino único autorizado para inspección: `kqdcotpfzluxkqdkgyts`, `https://kqdcotpfzluxkqdkgyts.supabase.co`. No se consultaron tablas de otros proyectos.

Las consultas MCP `list_migrations` y `list_tables(public)` al destino respondieron: `You do not have permission to perform this action`. Esto demuestra ausencia de permiso de esta conexión, no ausencia del proyecto ni que la base esté vacía. No se puede determinar qué migraciones faltan remotamente. Ambas deben compararse con el historial real antes de cualquier aplicación; no ejecutar a ciegas sobre tablas existentes.

Migraciones locales, en orden:

1. `20261102201241_fase_2a_crm.sql`: perfiles, contactos, estados, oportunidades, actividades, RLS, intake y bucket privado.
2. `20261102203714_complete_platform.sql`: tareas/citas, catálogo y precios, settings, cotizaciones/ítems/versiones, trabajos/fotos/garantías/pagos, reseñas, contenido, notificaciones, auditoría, webhooks y privacidad. RPCs de finanzas, usuarios, bootstrap, métricas y sincronización.

Hay 23 tablas públicas creadas entre ambas y `private.intake_limits`, más funciones privadas y Storage. `src/lib/supabase/database.types.ts` describe el contrato local; falta regenerarlo/contrastarlo contra el esquema remoto autorizado.

Evidencia de seguridad: `requireAdmin` verifica `auth.getUser()` y perfil activo en base; el proxy refresca cookies; acciones revisan permisos y RLS vuelve a aplicar en base. Las funciones financieras usan wrappers invoker y funciones privadas definer con identidad/rol vivos, `search_path` vacío y grants limitados. No se usan metadatos editables del usuario para autorizar. No hay concesión de DELETE de negocio a administradores. Los buckets separan `admin-documents` privado de `public-media` público; fotos privadas usan enlaces de 300 segundos.

PGlite sustituye Auth/Storage con esquemas mínimos (`tests/platform-fixture.ts`): valida SQL, grants y RLS, pero no tokens/cookies de Supabase, PostgREST, SMTP ni archivos reales. Se probaron captura atómica y reutilización de contactos, límites, tareas/citas, cálculos y snapshots, pagos, contenido público, roles, bootstrap, auditoría y eventos Cal sintéticos. No se solicitaron ni enviaron mensajes a personas.

Para activar después: conceder acceso seguro al destino, inspeccionar historial/esquema/advisors, revisar diferencias, autorizar separadamente los cambios remotos necesarios, configurar variables fuera del chat, Auth sin registro público, redirects y plantillas, SMTP, primer SUPERADMIN y pruebas con ADMIN/SUPERADMIN/inactivo/sin perfil. Igualar el origen local a **3000**: `.env.example` conserva `AUTH_SITE_URL=http://localhost:3100`, mientras `NEXT_PUBLIC_SITE_URL` usa 3000. Sin corregir la configuración futura, invitaciones pueden volver al puerto incorrecto.

No hay evidencia suficiente para exigir corregir tablas remotas. Sí hay inconsistencias locales concretas:

| Hallazgo | Evidencia | Consecuencia / tratamiento posterior |
|---|---|---|
| Límites de reseñas | `reviews/actions.ts:8` y formulario permiten 120/4000; migración completa:32 limita nombre a 100 y textos a 3000 | Entradas aceptadas por UI/acción fallan en SQL; alinear y probar bordes |
| Motivo de privacidad | `privacy/actions.ts:23` permite 4000; migración completa:37 limita a 3000 | Misma discrepancia; corrección local y prueba de contrato |
| Calendario y trabajos separados | `appointments` alimenta agenda; `create_installation` y `scheduleInstallation` no crean/actualizan cita asociada | Una instalación programada no se incorpora automáticamente a agenda; definir contrato antes de ampliar UI |
| Material utilizado sin estructura cuantitativa | Ficha `technical_data` y conceptos de cotización | Permite registrar texto; no controla consumo, cantidad real ni stock; definir si es aceptación requerida |
| Programación concurrente de instalaciones | `scheduleInstallation` actualiza por id, sin `updated_at`; citas/contactos sí tienen control optimista | Riesgo de sobrescritura entre operadores; añadir control y prueba en trabajo posterior |

No se corrigió ninguno durante esta auditoría.

## E. GitHub, Vercel y documentación

- Rama: `feat/ironmallas-complete`, sin upstream. HEAD `5f8370a` (CRM, agenda y provisión segura de administradores).
- Commits locales anteriores: `e64447f` (esquema operativo), `6ad3403` (base administrativa), `fe19c83` (web pública).
- `git ls-remote --heads origin` respondió únicamente `refs/heads/main` en `fe19c8376848b810eed2b9bb872be866ef11b001`. El remoto es `https://github.com/rodriguezsalazarjm/ironmallas.git`. Hay **3 commits locales posteriores a main sin rama publicada equivalente**.
- Antes de crear estos informes: **18 archivos rastreados modificados y 68 archivos sin seguimiento** (86 rutas con `--untracked-files=all`). El `diff --stat` de rastreados es 427 inserciones/304 eliminaciones; no incluye el contenido nuevo sin seguimiento. No hay cambios staged observados.
- Los modificados incluyen README, arquitectura, configuración/dependencias, home, layouts/login/dashboard/configuración, contenido y captación. Los nuevos incluyen `.github/workflows`, `public/brand`, cotizaciones, operaciones, contenido, privacidad, notificaciones, integraciones, scripts y pruebas. El inventario exacto se reproduce con `git status --porcelain=v1 --untracked-files=all`; no borrar ni hacer checkout sobre este trabajo.
- `.github/workflows/check.yml` define npm ci/test/check/test:http con Node 22, pero el directorio todavía no está rastreado. No se verificó una ejecución de Actions remota.
- `.vercel/project.json` vincula `ironmallas-preview`, id `prj_J4xXGz4S02tYTgdG9aS4URiIlnQQ`, equipo `team_WhlrNUp1zKbGZkmONh7hD2Ds`. La API de listado de proyectos confirmó el mismo nombre/id.
- El listado de despliegues de ese proyecto/equipo devuelve **403 forbidden**, indicando falta de autorización al scope. No hay URL de preview verificada, commit desplegado, estado READY/ERROR ni logs verificables. Existir el proyecto no demuestra un despliegue usable. Requiere autorizar el equipo en la conexión Vercel; no se alteró su configuración.
- `vercel.json` solo declara Next.js; `.local/vercel-project-config.json` describe Node 22 y comandos esperados, no demuestra configuración remota aplicada. El host local de auditoría usa Node **25.9.0**, npm **11.12.1**: falta repetir validación bajo Node 22 como CI/hosting previsto.
- README referencia seis documentos ausentes: `ENTREGA-FINAL.md`, `CONFIGURACION.md`, `DESPLIEGUE.md`, `INTEGRACIONES.md`, `MANUAL-ALVARO.md`, `MEDIA-MIGRATION.md`. Los existentes leídos son ARQUITECTURA, MIGRACION, FASE-2A, CRM-AGENDA, USUARIOS-AUTH, COTIZACIONES y DASHBOARD. FASE-2A es histórico y contiene límites/estado anteriores; no describe el último código completo.

## F. Comprobaciones y bloqueos reales

| Comando / inspección | Resultado actual | Límite |
|---|---|---|
| `npm run lint` | Exit 0 | No ejecuta negocio |
| `npm run typecheck` | Exit 0, tipos de rutas generados | Contrato Supabase local/manual |
| `npm run build` | Exit 0; 41 páginas generadas; rutas públicas/admin/API presentes | Sin credenciales ni servicios reales |
| `npm test` | 27 casos: 23 pass, 4 skip, 0 fail | SQL en PGlite y funciones; HTTP requiere origen |
| `npm run test:http` | 4 pass, 0 skip, 0 fail; servidor aislado 3199 cerrado al terminar | Fuerza backend sin configurar; no es prueba de login real |
| `npm audit --omit=dev --json` | 0 vulnerabilidades reportadas | Estado del registro consultado; no garantiza seguridad completa |
| `npm audit --json` | 16 moderadas, 0 altas/críticas | Cadena ESLint/minimatch; no son 16 fallos independientes de producción |
| `npm outdated --json` | React/DOM 19.3.1, tailwind-merge 3.7.0 y majors de TS/ESLint/types disponibles | No se actualizaron paquetes; revisar compatibilidad antes |
| Git remoto | Accesible, solo main baseline | No acredita CI ni publicación del trabajo local |
| Supabase destino | Permiso denegado en esquema/historial | No se verificó conexión autenticada de app |
| Vercel | Proyecto confirmado; despliegues 403 | No se verificó preview |

Los avisos de minimatch incluyen `GHSA-g3hv-75wg-m249` por amplificación de glob. La solución sugerida automáticamente por npm contiene downgrades mayores inadecuados de ESLint/next-config: investigar una actualización compatible, nunca aplicar `audit fix --force` a ciegas. No se instalaron dependencias.

Bloqueos que sí requieren intervención externa:

1. Permiso de lectura/administración en el Supabase exclusivo y, después de revisar, autorización explícita para cualquier migración/provisión remota.
2. Acceso al equipo Vercel para verificar deployments/variables/logs; publicación o despliegue requerirá instrucción posterior.
3. Identidad y correo del primer administrador por canal seguro, aprobación de tarifas, IVA, condiciones de pago/garantía, política de privacidad/retención, medios y afirmaciones comerciales enumeradas en MIGRACION.
4. Acceso y configuración de Cal.com, remitente/dominio Resend, destinatarios de pruebas y decisión sobre scheduler/analítica.
5. Enlace exacto de la ficha Google Maps, condición de administrador/verificación y aprobación de API/OAuth; presupuesto si se elige Places.

Las correcciones locales y documentación no están bloqueadas por credenciales. No se necesitan contraseñas ni secretos pegados en este chat.

## G. Google Business Profile — Iron Mallas

Estado **NO IMPLEMENTADO**. `/admin/resenas` gestiona testimonios manuales y lo declara expresamente. No existen reseñas Google verificadas, métricas, configuración OAuth, job ni diagnóstico de sincronización. No se identificó la ficha exacta; no se atribuyen reseñas de otra empresa.

**Elección recomendada, condicionada a elegibilidad:** Google Business Profile API. `accounts.locations.reviews.list` permite recorrer reseñas de una ubicación verificada y devuelve `averageRating`, `totalReviewCount` y paginación. Evita presentar como total la cantidad de tarjetas visibles. [Referencia oficial del endpoint](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list).

Requiere proyecto Cloud aprobado, OAuth `business.manage` y usuario con acceso a la ubicación. Google exige entre sus requisitos una ficha verificada y activa durante más de 60 días y una solicitud de acceso aprobada; confirmar la elegibilidad del solicitante y no prometer aprobación. [Requisitos oficiales](https://developers.google.com/my-business/content/prereqs).

**Alternativa:** Places API (New), Place Details por Place ID. Retorna como máximo 5 reseñas ordenadas por relevancia, sin paginación para recuperar todo el historial. Promedio y total deben venir de `rating` y `userRatingCount`, no calcularse sobre esa muestra. [Contrato Places](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places). Pedir `reviews` activa el SKU Enterprise + Atmosphere; utilizar FieldMask mínimo. [Campos y SKUs](https://developers.google.com/maps/documentation/places/web-service/data-fields). La tarifa global consultada ofrece 1.000 eventos mensuales sin costo y USD 25 por 1.000 en el primer tramo pagado de ese SKU; confirmar cuenta, región y precios al activar. [Precios oficiales](https://developers.google.com/maps/billing-and-pricing/pricing).

Diseño de implementación posterior:

- Frontend: bloque Google separado de testimonios manuales, estrellas accesibles, promedio/total oficiales, autor/atribución, fecha y texto original, enlaces a fuente, ver todas y dejar reseña. Layout móvil integrado con marca sin sugerir respaldo de Google. No afirmar que hay reseñas si la respuesta está vacía o falla.
- Admin: vistas independientes manual/Google en `/admin/resenas`; mostrar estado, última consulta exitosa, errores sanitizados, promedio/total y reseñas disponibles. Destacadas solo si las políticas aplicables permiten esa selección; no editar texto, manipular orden engañosamente ni recalcular calificación.
- Backend: adaptador por proveedor, consulta solo servidor, identificación exacta de cuenta/ubicación o Place ID, metadatos técnicos de sincronización separados de contenido. No reutilizar `reviews` como archivo permanente de Google. Definir contrato y retención antes de diseñar la migración.
- GBP permite almacenamiento limitado para rendimiento, seguro y temporal de hasta 30 días; prohíbe manipular/agregar el contenido. Un TTL no autoriza cualquier uso: revisar expresamente la presentación pública y selección de destacadas antes de implementarlas. No copiar respuestas a auditoría/backups permanentes. [Políticas GBP](https://developers.google.com/my-business/content/policies).
- Places restringe precarga/caché/almacenamiento, con excepción de Place ID; no trasladar automáticamente el TTL GBP a Places. Requiere atribución Google Maps, autores y acceso a la fuente; explicar orden/selección y atender requisitos de términos/privacidad. [Políticas Places](https://developers.google.com/maps/documentation/places/web-service/policies).
- Seguridad: tokens OAuth cifrados y solo servidor, callback con state y controles de sesión, refresh/revocación/desconexión; clave Places restringida a API y uso previsto. Acceso a configuración solo SUPERADMIN. Logs sin tokens ni contenido personal innecesario, límites de solicitudes y manejo de 401/403/429, borrado/expiración de contenido cuando corresponda.
- SEO: conservar el JSON-LD actual sin `AggregateRating` de reseñas propias. Las reseñas de un negocio sobre sí mismo no habilitan rich results de LocalBusiness/Organization, incluso mediante widget de terceros. [Reglas de review snippets](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
- Pruebas: proveedor con fixtures sintéticos; estrellas/atribución/fecha/enlaces; promedio y total no derivados de la muestra; 0 reseñas, timeout, tokens vencidos/revocados, 403/429, paginación GBP, máximo 5 Places, expiración/borrado de caché, ausencia de secretos cliente y separación manual/Google; integración real final con ficha autorizada.

Ubicación: Fase 5 después del circuito clientes→leads→agenda→cotización→instalación/pagos y de Auth/Storage. Iniciar identificación de ficha y trámite de acceso en paralelo; su demora no bloquea módulos fundamentales. No usar scraping, calificaciones inventadas ni migrar testimonios manuales como Google.

## H. Respuestas para retomar el proyecto

1. **Fase real:** activación/cierre 2A, con código adelantado hasta 4; integración/despliegue 5 incompletos.
2. **Completo dentro de pruebas locales:** renderizado público/SEO básico, validadores/cálculos, PDF y tokens, migraciones/RLS y varias transacciones financieras. Ver matriz para su alcance.
3. **Programado pero no operativo confirmado:** panel/CRM/agenda/cotizaciones/operaciones/CMS con persistencia remota; correo, Storage, Cal y notificaciones no activados aquí.
4. **Supabase:** falta acceso verificable, comparación del historial/esquema, configuración segura, Auth, perfiles, Storage, tipos y E2E. No se sabe todavía si las migraciones ya existen remotamente.
5. **GitHub/Vercel:** main remoto sigue en baseline; 3 commits y 86 rutas locales pendientes. Proyecto preview existe; despliegue no verificable por 403.
6. **Google:** módulo nuevo en Fase 5, preferir GBP si es elegible; Places es alternativa limitada. Identificación/permisos pendientes.
7. **Cinco prioridades:** inspección remota exclusiva; revisión/plan de activación Auth y esquema; primera prueba CRM/lead real; tarifas y cotización→PDF→instalación/pago; cierre de contratos locales y calendario unificado. Secuencia detallada en PLAN-CONTINUACION.
8. **Sin propietario:** alinear límites, preparar prueba de concurrencia, contrato de calendario, E2E locales, revisión de dependencias, QA visual y documentación; implementación solo en una tarea posterior.
9. **Del propietario:** acceso a Supabase/equipo Vercel, autorización futura de cambios remotos, administrador y condiciones comerciales aprobadas, servicios y ficha Google. Secretos únicamente por mecanismos seguros de configuración.
10. **Siguiente tarea exacta:** habilitar acceso de lectura al Supabase `kqdcotpfzluxkqdkgyts` y ejecutar inventario de migraciones, esquema, Auth/Storage y advisors; producir un diff/plan de activación sin aplicar cambios. Si ese acceso demora, continuar localmente con la tarea CONT-02.
