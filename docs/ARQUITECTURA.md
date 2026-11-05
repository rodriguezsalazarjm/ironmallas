# Arquitectura vigente — Iron Mallas 2.0

## Aplicación

Next.js 16.4.4 App Router + React 19.3, TypeScript estricto, Tailwind v4, Lucide y primitivas
shadcn/ui adaptadas a los tokens navy/naranja. No hay microservicios ni CMS externo.
La aplicación es independiente de Upzites Flow. Supabase aporta PostgreSQL, Auth y Storage;
Resend es opcional para correo y Cal.com mantiene el calendario público con webhook preparado.

src/app/(site) contiene la web pública. src/lib/content.ts sirve contenido publicado validado,
con caché pública corta y tags para invalidación. El archivo original src/content/site.ts es el respaldo.
/admin/login es público; /admin/(private) protege el panel. Proxy refresca cookies y las funciones
requireAdmin/acciones/RLS vuelven a comprobar autorización. connection/Suspense evita compartir sesión
mediante Cache Components. Los helpers Supabase con cookies se crean por solicitud.

Las features agrupan schema, acciones, formularios y helpers por negocio. El cálculo financiero real
se ejecuta en una RPC transaccional; el preview TypeScript usa BigInt para evitar errores binarios.
El PDF lee snapshots históricos y no recalcula según el tarifario actual.

## Modelo relacional

- profiles → auth.users: nombre, rol administrativo y activo.
- contacts: identidad y contacto reutilizable, dirección/unidad/comuna/región, ubicación opcional,
  notas, primer contacto, fuente y consentimiento. phone puede faltar en reservas Cal.com con email.
- leads → contacts + lead_statuses + profiles responsable: oportunidad, atribución, consentimiento y seguimiento.
- lead_activities → leads + profiles: historial de gestión, notas y fecha de seguimiento.
- tasks → contacts + leads opcional + profiles: tareas pendientes/completadas/canceladas.
- appointments → contacts + leads opcional + profiles: visita/evaluación/instalación con horarios y resultado.
- services y pricing_rules: unidades m2/unit/hour/fixed, material, valor CLP, mínimo, recargo y descuento máximo.
- settings: configuración comercial y técnica tipada/validada por cada feature; sin secretos de proveedores.
- quotes → contacts + leads opcional: número único, estado, versión actual y totales.
- quote_items → quotes: líneas por versión con dimensiones en mm, cantidad en milésimas y precios históricos.
- quote_versions → quotes: snapshot inmutable con cliente/empresa/condiciones/importes por versión.
- installations → quote aceptada única + contacts: ficha técnica JSON, técnico, programación, ejecución y monto aprobado.
- installation_photos → installations: etapas antes/durante/después/detalle/incidencia y ruta privada.
- warranties → installations: fecha, duración y condiciones reales, estado y solicitudes posteriores en notas.
- payments → installations: pagos registrados transaccionalmente, sin sobrepasar el monto aprobado.
- reviews → contacts opcional: original, presentación, calificación, permisos y publicación manual.
- content_entries: borrador/publicación del sitio, promoción y privacidad; nunca código HTML arbitrario.
- notifications: bandeja persistente y estado de envío. quote_email se procesa desde la ficha de cotización.
- audit_logs: registro append-only de cambios, exportaciones y responsables; valores secretos redactados.
- webhook_events: idempotencia y orden temporal Cal.com.
- privacy_requests: solicitudes de corrección/exportación/eliminación con revisión y resolución controladas.

Todas las relaciones tienen FKs e índices adecuados a los accesos implementados. No se duplica contacto
al convertir una oportunidad en trabajo. La coincidencia pública email+teléfono es conservadora;
los posibles duplicados se muestran para revisión, sin fusiones destructivas automáticas.

## Migraciones y seguridad

1. 20261102201241_fase_2a_crm.sql: base de contactos/oportunidades, perfiles, RLS e intake.
2. 20261102203714_complete_platform.sql: extensiones operativas, tablas, auditoría y RPCs.
3. 20261102213759_installation_concurrency.sql: versión monotónica de instalaciones y RPC de estado con comprobación de edición obsoleta; preparada y probada localmente, sin aplicación remota en esta tarea.

La programación y ficha técnica de instalaciones comparan el updated_at original al actualizar.
Los cambios de estado de la UI usan set_installation_status_checked para bloquear/comparar/actualizar
en una transacción. La agenda aún consulta appointments y los trabajos conservan scheduled_at;
la propuesta de appointments como fuente única está en docs/ACTIVACION-FASE-2A.md y no está migrada.

No se ejecutaron contra el proyecto remoto mientras esta sesión no pudo acceder a él.
Las pruebas platform ejecutan las migraciones reales en PGlite y simulan las superficies Auth/Storage.

RLS en todas las tablas expuestas. anon no lee datos de clientes, precios, documentos, auditoría ni tareas.
Público solo lee columnas permitidas de contenido/reseñas publicadas con autorización.
Los perfiles no dependen de user_metadata. Las operaciones críticas son RPCs con guardas de identidad/rol,
search_path vacío, permisos mínimos, validación de referencias y transacciones.
Los wrappers de negocio autenticados no permiten cambiar directamente totales/snapshots/montos aprobados.
SUPERADMIN no puede autoascender/cambiar su propio acceso ni quitar el último administrador activo.
Bootstrap de primer SUPERADMIN es service-only, idempotente y se bloquea si ya existe uno.

Storage: admin-documents privado para evidencias con ruta ligada a instalación; enlaces firmados temporales.
public-media solo para recursos autorizados para web. Las fotos privadas nunca se copian automáticamente.
La app acepta JPG/PNG/WebP con firma real, límites y reencode sin metadatos; videos pequeños MP4/WebM
validan firma/tamaño. Los originales WordPress se migran por un script separado con manifiesto/hash.

## Integraciones y límites

Cal.com verifica HMAC SHA256 del body original, limita tamaño, normaliza eventos y guarda con idempotencia.
El ledger conserva occurred_at para rechazar eventos atrasados que reviertan cancelaciones/reprogramaciones.
No se declara sincronizado sin una prueba real.
Resend no participa en la transacción de captura: su ausencia nunca convierte un lead persistido en fallo.
Los avisos tienen idempotencia y reintentos acotados; no hay scheduler externo activado por esta entrega.

Las cargas desde formularios se limitan a 3MB antes del transporte; fotos móviles se optimizan en navegador
además de validar/reencodificar en servidor. Esto evita superar el límite HTTP del hosting de pruebas.
Los videos grandes se gestionan mediante el procedimiento de medios, sin quitar sus URLs originales.
La retención es configurable y las solicitudes se revisan; no hay borrado automático de información histórica.
