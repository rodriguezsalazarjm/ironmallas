# Progreso — correcciones locales y preparación de Fase 2A

## Continuación: desarrollo local sin servicios externos

2 de noviembre de 2026: por instrucción del propietario se posponen Supabase y Vercel. Se mejoraron web pública, controles móviles administrativos, agenda unificada y preparación desconectada de Google Reviews. No se trabaja en MCP/OAuth. La decisión de programación vigente para trabajos es installations como fuente y proyección de lectura, descrita en [ENTREGA-LOCAL-SIN-SERVICIOS.md](ENTREGA-LOCAL-SIN-SERVICIOS.md); sustituye la propuesta de sincronización de agenda anterior para esta entrega. Inventario multimedia y permisos Google documentados allí. Validación final: 35 pruebas locales + 4 HTTP aprobadas (39 en total), lint/TypeScript/build y diff --check aprobados bajo Node 25.9.0. Los registros siguientes son históricos.

## Continuación: activación real y comprobación posterior a OAuth

Actualización del 2 de noviembre de 2026: el cliente local ahora registra `auth_status=o_auth` para `ironmallas-readonly`, con ref exclusivo y `read_only=true`. El intento OAuth vencido descrito más abajo es histórico. Aun así, este chat devuelve `unknown MCP server` al buscar ese servidor y el conector general devuelve permiso denegado en las cuatro lecturas intentadas (URL, tablas, migraciones, advisors). No se obtuvo inventario ni se aplicaron cambios remotos.

Se añadió una protección local de destino exclusivo en `src/lib/supabase/config.ts` y `scripts/bootstrap-admin.ts`, y la plantilla declara la URL del cliente sin claves. Dos regresiones nuevas prueban rechazo de otros proyectos y bootstrap sin conexión al destino ajeno. `npm test`: 33 casos, 29 aprobados, 4 HTTP omitidos, cero fallos. Después, `npm run check` aprobó lint/TypeScript/build y `npm run test:http` aprobó los 4 casos HTTP, sin omisiones ni fallos. Total entre suites: 33 aprobadas. `git diff --check` también pasó.

Plan de migración por escenario, clasificación todavía desconocida de las tres migraciones, dependencias de Auth/Storage/variables y aprobación requerida: [ACTIVACION-SUPABASE.md](ACTIVACION-SUPABASE.md). No se solicita aprobar migraciones a ciegas; la siguiente tarea exacta es cargar las herramientas del MCP autenticado en esta sesión y completar el inventario de lectura. Las pruebas reales A–E siguen pendientes y no se declara Fase 2A operativa.

## Registro anterior: correcciones y preparación local

Fecha: 2 de noviembre de 2026, America/Santiago. Checkout `C:\dev\Ironmallas`, rama `feat/ironmallas-complete`. Continúa la auditoría de ESTADO-ACTUAL y el plan CONT-01/02/04/07. No se reconstruyeron módulos ni se inició Google Reviews.

## Correcciones realizadas

| Defecto | Corrección | Evidencia |
|---|---|---|
| Reseñas UI/acción aceptaban más que SQL | Contrato compartido: nombre máximo 100, original/presentación máximo 3000; mismos límites en formularios y acción | `src/features/reviews/schema.ts`, `actions.ts`, `/admin/resenas/page.tsx` |
| Motivo de privacidad de 4000 frente a SQL 3000 | Schema compartido máximo 3000 y `maxLength` del formulario alineado; política, retención y resolución mantienen sus límites propios | `src/features/privacy/schema.ts`, `actions.ts`, `/admin/privacidad/page.tsx` |
| Orígenes locales distintos | `AUTH_SITE_URL` y `NEXT_PUBLIC_SITE_URL` usan `http://localhost:3000` en plantilla | `.env.example`; no se crearon credenciales |
| Sobrescritura de programación/ficha técnica | Exigir `updated_at` original y filtrar UPDATE por id + versión; cero filas se informa como posible conflicto sin guardar | `src/features/installations/{schema,actions,technical-form}.ts*` y ficha administrativa |
| Cambio de estado obsoleto | RPC nueva con comparación bajo lock dentro de la transacción, conservando validación/roles de transición existentes | Migración local `20261102213759_installation_concurrency.sql`, tipos y `changeInstallation` |
| Versión temporal que puede no cambiar dentro de una transacción | Trigger específico de instalaciones usa reloj actual y un incremento mínimo de 1 microsegundo | Misma migración; no se modificaron las dos migraciones históricas |
| Campos anteriores con versión nueva al refrescar React | Formularios de programación/estado y ficha técnica se identifican por versión; al cambiar versión se renuevan también sus valores | `/admin/instalaciones/[id]/page.tsx`; revisión con guía React |

Las acciones conservan la marca temporal original como string: no la convierten mediante `Date`, que perdería precisión de microsegundos. Los pagos siguen por su RPC transaccional que limita importes; no se transformaron en una edición de programación. Las fotos y garantías mantienen su funcionamiento existente.

La nueva RPC protege el flujo de UI actualizado; se conserva `set_installation_status` original para compatibilidad con consumidores existentes. No se presenta como un requisito universal de versión para todos los clientes API antiguos. Antes de retirar esa RPC, inventariar consumidores y hacer una migración compatible. El estado remoto no se tocó.

La propuesta de agenda única está detallada en `docs/ACTIVACION-FASE-2A.md`: `appointments` será la fuente de horarios/responsable/estado de agenda; instalaciones mantendrá ejecución/finanzas y vínculo único. **Solo propuesta**, pendiente duración de trabajos e inventario de datos antes de migrar. No se crean citas duplicadas ni se impone una duración ficticia en esta entrega.

## Pruebas de regresión y verificaciones

`tests/local-contracts.test.ts` añade cuatro casos:

1. Schemas de aplicación aceptan nombre 100/textos 3000/motivo 3000 y rechazan el carácter siguiente; la versión es obligatoria, válida y conserva microsegundos.
2. Las dos URLs locales de la plantilla coinciden y usan 3000.
3. Las migraciones reales en PGlite aceptan esos mismos límites y rechazan los valores mayores.
4. Dos editores con versión antigua: programación y ficha técnica no actualizan filas; estado obsoleto/nulo se rechaza; estado con versión actual se guarda y avanza la versión, incluso dentro de una transacción. Anónimo y usuario sin perfil no pueden usar la RPC.

| Verificación | Resultado |
|---|---|
| Regresiones aisladas | 4 aprobadas, 0 fallos |
| `npm test` | 31 casos: 27 aprobados, 4 HTTP omitidos por falta de TEST_BASE_URL, 0 fallos |
| `npm run lint` | Aprobado |
| `npm run typecheck` | Aprobado |
| `npm run build` | Aprobado; 41 páginas generadas |
| `npm run test:http` | 4 aprobados, 0 omitidos, 0 fallos; servidor aislado cerrado al terminar |
| `npm run check` después de revisión final de formularios | Aprobado: lint, typecheck y build, exit 0 |
| Consultas de inventario SQL | Ejecutadas correctamente contra migraciones locales en PGlite; sin conexión remota |
| `git diff --check` | Aprobado |

Las pruebas de SQL son locales en PostgreSQL embebido con Auth/Storage mínimos. No prueban login, archivos o PostgREST de Supabase real; no se declaran aprobados esos flujos. No se enviaron correos ni se crearon usuarios externos.

## Supabase: configuración y estado real

Se añadió el servidor MCP **`ironmallas-readonly`** en la configuración local de Codex, sin reemplazar servidores existentes:

```text
https://mcp.supabase.com/mcp?project_ref=kqdcotpfzluxkqdkgyts&read_only=true
```

`codex mcp get ironmallas-readonly --json` confirmó URL, servidor habilitado y ausencia de bearer/cabeceras configuradas. La autenticación elegida es OAuth, iniciada con `codex mcp login ironmallas-readonly`. El comando produjo una URL de autorización y luego terminó con **`timed out waiting for OAuth callback`**: la autorización humana no quedó completada. Configuración instalada no equivale a conexión autenticada ni a herramientas ya cargadas en este chat.

La consulta de lectura `list_migrations` mediante el conector disponible, exclusivamente a `kqdcotpfzluxkqdkgyts`, volvió a devolver **`You do not have permission to perform this action`**. No se usó otro proyecto. No se reutilizó ese conector para ejecutar SQL ni se intentó eludir el rechazo con otras credenciales.

Por ello **no se pudieron verificar en esta ejecución** tablas remotas, historial, políticas/grants RLS, ajustes Auth, buckets/permisos Storage ni advisors. Tampoco se puede determinar cuáles migraciones están pendientes en el destino o si existen divergencias. No se supone base vacía ni migraciones ausentes. Son tres archivos locales a comparar, incluidos en el runbook; la tercera fue creada en esta tarea y no aplicada remotamente.

Preparación verificable: `scripts/audit-supabase-readonly.sql` contiene solo transacción read-only y SELECTs de metadatos para tablas, columnas, constraints, RLS, grants, índices, triggers, firmas de funciones y buckets esperados; no exporta clientes, cuentas ni archivos. Historial y advisors se consultarán mediante sus herramientas de lectura. Auth requiere además inspección de configuración autorizada si MCP no la expone; existencia de tablas no acredita seguridad del servicio.

## Activación preparada

Runbook completo: [ACTIVACION-FASE-2A.md](ACTIVACION-FASE-2A.md). Incluye:

- Inventario y comparación antes de aplicar las tres migraciones locales; estrategia si existe esquema previo y dependencia de la nueva RPC antes de desplegar el código actualizado.
- Variables por finalidad y puerto/origen, sin valores secretos; separación de correo Auth y Resend comercial.
- Revisión Auth, invitación/recuperación y primer SUPERADMIN únicamente con identidad aprobada y autorización posterior; bootstrap de desarrollo no se ejecuta en producción.
- Aceptación de lead persistido, CRM autenticado y cotización/PDF con tarifas/condiciones aprobadas; pruebas locales usan solo fixtures sintéticos.
- Propuesta de agenda única, transición compatible y pruebas previas para no perder historial ni duplicar citas.

## Bloqueos y siguiente tarea exacta

1. Completar OAuth con una cuenta que tenga acceso al Supabase exclusivo. Si el enlace anterior caducó, ejecutar de nuevo `codex mcp login ironmallas-readonly` y autorizar en el navegador. No compartir contraseñas ni códigos en chat.
2. Cargar/comprobar las herramientas del servidor acotado en el cliente; verificar `project_ref` y `read_only=true` antes de consultar. Conexión OAuth aceptada tampoco sustituye verificar acceso efectivo al proyecto.
3. Hace falta inspección remota antes de autorizar migraciones. Después, identidad del administrador y tarifas/condiciones reales aprobadas para pruebas de negocio. No se inventaron estos datos.

**Siguiente tarea exacta:** con OAuth completado, ejecutar inventario de lectura, advisors y comparación contra los tres SQL locales, y producir el diff de activación. No aplicar migraciones todavía. Si el acceso sigue pendiente, las correcciones locales quedan probadas y listas para revisión.

Se conservaron los cambios anteriores y archivos sin seguimiento, incluida la copia existente de ESTADO-ACTUAL. No hubo commits, pushes, reset/clean/checkout destructivos, despliegues, cambios DNS ni reemplazo de WordPress. Google Reviews permanece en roadmap para después del circuito comercial completo.

## 11-nov-2026 — Agenda centralizada, fichas técnicas y automatizaciones (local)

- Hecho en local: agenda con vistas Día, Semana, Mes, Año y Listado; ficha técnica con fotos privadas; conflictos de técnico con buffer; reserva Cal.com con campos adicionales y sincronización vía API v2; avisos y recordatorios por la cola existente con confirmación de asistencia; precio excepcional e IVA exento validado. Detalle en [AGENDA-OPERATIVA.md](AGENDA-OPERATIVA.md).
- Migración `20261111173128_agenda_operations.sql` **aplicada en remoto** el 11-11-2026, con autorización. Pruebas remotas controladas y revertidas (detalle en AGENDA-OPERATIVA §10). El código nuevo aún no está desplegado.
- Verificación: lint, typecheck y build aprobados; `npm test` con 62 pruebas aprobadas y 4 HTTP omitidas. QA visual local en [qa-local/](qa-local/). Cal.com y Resend **no** se probaron en real.
- Siguiente paso: desplegar con autorización, configurar Cal.com (preguntas, webhook, API key, ICS Feed), verificar el dominio en Resend, elegir el scheduler y obtener la validación del contador para las exenciones.

## 11-nov-2026 — Despliegue a producción (Vercel CLI, autorizado)

- Deployment `dpl_hB7xabBgpyLJ8u1yBSQEtCcSjgt5`, servido en https://ironmallas-preview.vercel.app. Se subió el árbol local sin commit; `.vercelignore` excluye `.env*`, `.local` y `tests`.
- Vercel también asignó el alias `ironmallas.cl`, pero su DNS sigue en Hostgator: el sitio público sigue en WordPress (nginx/Apache). No se tocaron DNS ni WordPress.
- Verificado en producción:
  - `/api/notifications/process` responde 401 sin credenciales o con un secreto incorrecto (POST y GET).
  - `/confirmar/*` va con `noindex` y `no-store`.
  - `/api/agenda/busy/*` responde "No configurado" (falta `AGENDA_ICS_TOKEN`).
  - La ruta temporal de QA responde 404.
- Variables aún ausentes en Vercel: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LEADS_NOTIFY_EMAIL`, `CAL_API_KEY`, `AGENDA_ICS_TOKEN`. Mientras falten, no se envía ningún correo y no se puede reprogramar ni cancelar en Cal.com desde el admin.
- Siguiente paso: crear la tarea en cron-job.org desactivada y hacer el "Test run" (debe responder `configured:false`); después, configurar Resend y hacer el envío controlado (CRON-NOTIFICACIONES §6).
