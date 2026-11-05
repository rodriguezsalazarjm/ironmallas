# Iron Mallas 2.0 — plan de continuación

> Continuación vigente: Supabase/Vercel pospuestos por decisión del propietario. Avance local y verificaciones: [ENTREGA-LOCAL-SIN-SERVICIOS.md](ENTREGA-LOCAL-SIN-SERVICIOS.md). Este documento conserva el diagnóstico/plan histórico.

Actualización posterior: CONT-02 (límites de reseñas/privacidad), alineación de URLs y controles de edición de instalaciones están corregidos localmente; CONT-01 continúa bloqueado por OAuth/acceso. CONT-07 tiene propuesta documentada, todavía sin migración de agenda unificada. Consultar [PROGRESO.md](PROGRESO.md) y [ACTIVACION-FASE-2A.md](ACTIVACION-FASE-2A.md) antes de retomar estas tareas.

Base: auditoría del 2 de noviembre de 2026 en [ESTADO-ACTUAL.md](ESTADO-ACTUAL.md). Este documento planifica; no autoriza migraciones, mensajes, publicación ni despliegues. No reconstruir CRM, agenda, cálculo financiero, PDF ni CMS ya existentes. Conservar el trabajo sin commit y validar cada bloque con evidencia nueva.

Estados heredados: COMPLETADO Y PROBADO se limita al alcance local demostrado; IMPLEMENTADO SIN PRUEBA REAL requiere prueba integrada; PREPARADO, PERO SIN CONFIGURAR requiere configuración. Los otros estados mantienen su significado de la matriz de auditoría.

## Orden y dependencias

Ruta crítica: CONT-01 → CONT-04 → CONT-05 → CONT-06 → CONT-08 → CONT-09 → CONT-10 → CONT-17 → CONT-18. CONT-02/03/07/12/13/16 pueden prepararse localmente mientras llega acceso. CONT-14 inicia trámites Google en paralelo; CONT-15 implementa después del núcleo y no bloquea este. Los cambios de esquema se diseñan tras CONT-01 y se aplican en una tarea expresamente autorizada; no editar migraciones históricas ya aplicadas.

## P0 — activar y aceptar el núcleo del negocio

### CONT-01 — Inventario remoto exclusivo y plan de diferencias

- Objetivo: conocer el estado real de `kqdcotpfzluxkqdkgyts` antes de modificarlo.
- Estado: BLOQUEADO POR DEPENDENCIA EXTERNA (MCP sin permiso).
- Módulos: dos migraciones, `src/lib/supabase/*`, consola/API Supabase de ese proyecto.
- Dependencias: propietario habilita conexión autorizada; no compartir contraseñas ni claves en chat.
- Aceptación: registrar historial de migraciones, tablas/columnas/grants/RLS/RPC, buckets, configuración Auth y advisors sin datos personales; clasificar aplicado/faltante/divergente y producir plan de activación/reversión. Regeneración de tipos a archivo temporal para comparar, sin reemplazo a ciegas.
- Pruebas: consultas exclusivamente de lectura; contrastar funciones del código con firma remota; verificar que el host/proyecto sea el exclusivo del cliente.

### CONT-02 — Alinear contratos de formularios y base

- Objetivo: eliminar entradas aceptadas por UI/acción que la base rechaza.
- Estado: ERROR DETECTADO.
- Módulos: `features/reviews/actions.ts`, `/admin/resenas`, `features/privacy/actions.ts`, constraints de migración completa; revisar otros schemas/acciones frente a tipos SQL.
- Dependencias: ninguna para preparar corrección local; CONT-01 si se plantea modificar SQL remoto.
- Aceptación: una definición coherente para nombre/textos de reseñas y motivo de privacidad; mensajes por campo; respetar datos existentes. Revisar validación de técnicos activos y relaciones en todos los puntos de escritura que lo necesiten.
- Pruebas: casos 100/101 y 3000/3001 o límites finales aprobados, cliente/acción/SQL; prueba negativa por API directa cuando exista entorno. Evitar un test que solo copie la implementación.

### CONT-03 — Preservar y revisar entrega local; reparar documentación

- Objetivo: hacer publicable y recuperable el avance existente.
- Estado: PARCIALMENTE IMPLEMENTADO.
- Módulos: `git status`, 18 modificados/68 nuevos previos al informe, `.github/workflows/*`, README y docs.
- Dependencias: ninguna para inventariar/revisar; publicación requiere tarea autorizada posterior.
- Aceptación: revisar diff incluyendo untracked y secretos/medios; identificar 3 commits posteriores a main; completar o corregir referencias a los seis documentos ausentes; preparar instrucciones actuales de instalación/operación. Mantener `.env*`, `.local`, exportaciones XML y `.vercel` fuera de Git.
- Pruebas: `git diff --check`, inventario antes/después, instalación/check bajo Node 22. No hacer commit/push durante una tarea de auditoría.

### CONT-04 — Activación controlada de esquema, entorno y Auth

- Objetivo: habilitar el backend sin cambiar WordPress.
- Estado: PREPARADO, PERO SIN CONFIGURAR.
- Módulos: `supabase/migrations`, clientes Supabase, `src/proxy.ts`, `src/lib/auth.ts`, `scripts/bootstrap-admin.ts`, `features/users/*`, `/auth/confirm`.
- Dependencias: CONT-01; autorización específica de cambios remotos; entorno y administrador aprobados.
- Aceptación: aplicar solo diferencias revisadas, configurar secretos fuera del chat, URL local/retornos en 3000 o preview exacta, desactivar registro/anónimos, plantillas OTP y correo Auth; primer SUPERADMIN idempotente; ADMIN de prueba autorizado; tipos contrastados. No usar otro Supabase ni correr bootstrap de desarrollo en producción.
- Pruebas: login/logout, refresh/expiración, invitación/recuperación, acceso sin perfil/inactivo, no autoescalado, último SUPERADMIN, roles por API directa, aislamiento de caché entre dos usuarios y ventanas.

### CONT-05 — Aceptación CRM y captación real

- Objetivo: que una solicitud se guarde y pueda gestionarse sin duplicar personas ni perder historial.
- Estado: IMPLEMENTADO SIN PRUEBA REAL.
- Módulos: `features/leads/*`, `features/crm/*`, `features/admin/*`, `/admin/clientes`, `/admin/leads`, exportación y dashboard.
- Dependencias: CONT-04, correcciones CONT-02 que afecten el flujo.
- Aceptación: alta/edición de contactos, duplicados exactos/parciales, oportunidad manual/web, asignación, actividad, tareas, búsqueda/paginación, exportación autorizada y métricas concordantes. Éxito del formulario solo con persistencia comprobada; fallback honesto si falla.
- Pruebas: recorrido navegador→acción→PostgREST→tablas→panel con datos sintéticos autorizados; límites y consentimiento; concurrencia y perfil inactivo; falla de notificación no revierte lead. Registrar limpieza o retención de fixtures sin borrar datos del cliente.

### CONT-06 — Aceptación de agenda y visitas

- Objetivo: operar fechas de Santiago y responsables sin sobrescrituras.
- Estado: IMPLEMENTADO SIN PRUEBA REAL.
- Módulos: `features/appointments/*`, `features/crm/time.ts`, `/admin/agenda`.
- Dependencias: CONT-05.
- Aceptación: crear/editar/reprogramar/cancelar/completar, conservar resultado/historial, mostrar responsable y contacto correcto; conflicto de edición visible; límites de calendario informados.
- Pruebas: verano/invierno/DST, duración inválida, oportunidad de otro contacto, técnico inactivo, dos operadores y filtros. Cal.com externo se valida en CONT-11.

### CONT-07 — Resolver contrato calendario–instalaciones y concurrencia

- Objetivo: una sola programación confiable por trabajo.
- Estado: PARCIALMENTE IMPLEMENTADO.
- Módulos: `installations`, `appointments`, `appointment_id`, `features/installations/actions.ts`, RPCs, `/admin/agenda`.
- Dependencias: contrato local puede diseñarse ahora; CONT-01/06 y decisión de duración/agenda antes de modificar persistencia.
- Aceptación: elegir vista unificada o cita vinculada transaccional; programar/reprogramar/cancelar un trabajo se refleja una sola vez y sin divergencia. Control optimista en edición de instalaciones. Definir manejo de trabajos/citas existentes antes de una eventual migración nueva.
- Pruebas: doble creación, cambios concurrentes, cambio de técnico, cierre/cancelación, fechas divergentes previas y ausencia de duplicados. No introducir sincronización saliente Cal sin necesidad aprobada.

### CONT-08 — Tarifas comerciales y aceptación de cotizaciones

- Objetivo: emitir presupuestos correctos y aprobados por negocio.
- Estado: PREPARADO, PERO SIN CONFIGURAR.
- Módulos: `features/pricing/*`, `features/quotes/*`, `/admin/tarifario`, `/admin/cotizaciones`, RPC `save_quote`.
- Dependencias: CONT-05; propietario valida precios, unidades, mínimos/recargos, descuentos, IVA, datos de empresa, condiciones y vigencia.
- Aceptación: ninguna tarifa ficticia; ADMIN y SUPERADMIN con límites correctos; casos m²/unidad/hora/fijo/adicionales reproducibles; historial inmutable, nueva versión aplica precios actuales; estado y vigencia coherentes.
- Pruebas: tabla de casos comerciales esperados vs cálculo TS/SQL, redondeos/overflow, tarifas inactivas, descuento máximo, concurrencia, cambio de estado inválido, PDF actual/histórico multipágina y restricciones por rol.

### CONT-09 — Instalaciones, pagos, garantías y Storage reales

- Objetivo: completar presupuesto aceptado→trabajo→evidencias→pago→garantía.
- Estado: IMPLEMENTADO SIN PRUEBA REAL.
- Módulos: `features/installations/*`, `features/media/*`, `/admin/instalaciones`, `/admin/pagos`, buckets y RPC `record_payment`.
- Dependencias: CONT-07/08/04; condiciones de garantía y fotos autorizadas. Confirmar si materiales requieren cantidades reales o basta ficha textual; no crear inventario sin ese requisito.
- Aceptación: instalación única por cotización aceptada; programación unificada, ficha y materiales; fotos privadas, cierre, pagos parciales/totales sin sobrepago, garantía con condiciones reales, auditoría y métricas consistentes.
- Pruebas: dos pagos simultáneos, trabajo cancelado/cerrado, edición concurrente, archivo disfrazado/oversize, lectura anónima denegada, URL firmada expira, upload fallido y limpieza de huérfanos; separar evidencia privada y biblioteca pública.

## P1 — cerrar canales, contenido, seguridad y publicación

### CONT-10 — Compartir presupuestos por enlace, WhatsApp y correo

- Objetivo: entregar versión correcta sin éxito ficticio ni duplicación de envíos.
- Estado: PREPARADO, PERO SIN CONFIGURAR.
- Módulos: `quotes/share-token.ts`, `quotes/email.ts`, rutas PDF y `/cotizacion/[token]`.
- Dependencias: CONT-08; origen/QUOTE_SHARE_SECRET seguro, Resend y dominio verificado, destinatario de prueba autorizado.
- Aceptación: enlace vigente/caduco/versionado correcto; WhatsApp prepara mensaje; correo adjunta PDF y diferencia aceptación de entrega; revisar estrategia de idempotencia en reintentos fuera de ventana del proveedor.
- Pruebas: token manipulado/vencido, cambio de versión/estado y rotación; no-store/no-referrer; correo fallido/aceptado/no confirmado, reintento y estado de notificación; envío externo solo con instrucción autorizada.

### CONT-11 — Cal.com y notificaciones operativas

- Objetivo: activar integraciones existentes y su observabilidad.
- Estado: PREPARADO, PERO SIN CONFIGURAR.
- Módulos: `integrations/cal.ts`, `/api/webhooks/cal`, `notifications/*`, `/api/notifications/process`, settings.
- Dependencias: CONT-04/06, cuenta Cal, secret webhook, Resend, preferencias y decisión del invocador.
- Aceptación: eventos reales entrantes guardados una vez y en orden; reservas sin teléfono; no sobrescribir contacto ambiguo; alertas configuradas y errores visibles. Scheduler compatible con POST/Bearer; `vercel.json` actual no programa cron. Edición interna no se anuncia como cambio en Cal.
- Pruebas: firma mala, body grande, retries y eventos atrasados, create/reschedule/cancel reales, proveedor caído/429; concurrencia y deduplicación de avisos; no enviar a clientes sin autorización.

### CONT-12 — CMS, testimonios, privacidad y medios

- Objetivo: permitir administrar contenido real con publicación revisable.
- Estado: PARCIALMENTE IMPLEMENTADO.
- Módulos: `features/content`, `reviews`, `privacy`, `media`, `src/lib/content.ts`, `scripts/migrate-media.ts` y CMS.
- Dependencias: CONT-02/04/09; aprobación editorial, afirmaciones/garantías/certificaciones, política/retención y derechos de medios.
- Aceptación: borrador→preview→publicación→invalidación verificadas; galerías y servicios correctos; testimonios consentidos nunca rotulados Google; solicitudes de privacidad revisables; migración de medios con manifiesto/hash y dry-run antes de descargas/uploads. Restaurar enlaces de documentación y manual operativo.
- Pruebas: HTML/URL peligrosos, publicación no autorizada, caché obsoleta, ausencia/fallo backend, retiro de consentimiento; medios públicos/privados y referencias rotas; política pendiente no presentada como aprobada.

### CONT-13 — Seguridad, compatibilidad y QA visual final

- Objetivo: cerrar brechas de aceptación y dependencias antes del piloto.
- Estado: PARCIALMENTE IMPLEMENTADO.
- Módulos: dependencias/lockfile, auth/RLS/RPC/Storage, headers, componentes públicos/admin y CI.
- Dependencias: pruebas locales pueden empezar ahora; validación real tras CONT-04/09/12.
- Aceptación: analizar 16 avisos moderados dev de ESLint/minimatch con actualización compatible; no downgrade forzado. Validar Node 22, advisors y acceso directo por rol; decidir endurecimiento de headers según scripts externos. QA responsive/teclado/accesibilidad/medios y rendimiento con mediciones actuales.
- Pruebas: npm ci/test/lint/typecheck/build/test:http, E2E autenticado de negocio, móvil 375/768 y escritorio 1440, Lighthouse o equivalente, aislamiento de sesiones, límites de login/IP bajo hosting real. Conservar evidencia de fallos y correcciones.

### CONT-14 — Elegibilidad y contrato de Google Reviews

- Objetivo: elegir proveedor y permisos sin bloquear el CRM.
- Estado: BLOQUEADO POR DEPENDENCIA EXTERNA.
- Módulos: diseño futuro de integración; sección G del informe.
- Dependencias: enlace exacto de Maps, administrador de ficha, verificación/antigüedad, proyecto Cloud y aprobación GBP; alternativa Places con facturación/presupuesto aprobados.
- Aceptación: confirmar ubicación exacta, OAuth y elegibilidad; decidir GBP preferido o Places limitado; revisar autorización de presentación pública/destacadas y retención por proveedor antes de definir tablas. Registrar enlaces de ver todas/dejar reseña.
- Pruebas: consulta oficial autorizada de lectura; verificar promedio/total y alcance real (paginación GBP vs máximo cinco Places). No scraping, respuestas ni ediciones de ficha.

### CONT-15 — Implementar Google Reviews separado de manuales

- Objetivo: añadir reseñas auténticas, métricas y diagnóstico.
- Estado: NO IMPLEMENTADO.
- Módulos: nuevo adaptador servidor, configuración protegida, metadatos de consulta/retención, componente público y pestaña `/admin/resenas`; migración nueva solo si procede.
- Dependencias: CONT-14, Auth/Storage estables y núcleo aceptado; no reutilizar tabla manual para guardar Google indefinidamente.
- Aceptación: autor/estrellas/fecha/texto/atribución/enlaces, promedio y total oficiales, última actualización/errores en admin; destacadas solo si se permite. OAuth seguro/desconectable, contenido expirado eliminado, sin reseñas inventadas ni AggregateRating propio. Respetar políticas específicas citadas en informe; el TTL de un proveedor no se aplica al otro.
- Pruebas: fixtures sintéticos sin cargar producción; 0 resultados, fallos, límites/cuotas, revocación, borrado de caché y backups, separación de fuentes, autoría y accesibilidad responsive; prueba real final de lectura y ausencia de tokens en bundle/logs.

### CONT-16 — Analítica y criterio comercial de lanzamiento

- Objetivo: medir conversiones con una política aprobada.
- Estado: NO IMPLEMENTADO (analítica); PARCIALMENTE IMPLEMENTADO (contenido comercial).
- Módulos: layout/proveedores futuros, eventos formulario/WhatsApp/reserva, consentimiento, contenido central y política.
- Dependencias: IDs/cuenta Meta o analítica, decisión de consentimiento y validación del propietario.
- Aceptación: eventos definidos y documentados; sin email/teléfono/mensajes de clientes en tracking; respetar consentimiento; métricas no duplicadas. Confirmar cifras/certificaciones/especificaciones ya presentes, no inventarlas.
- Pruebas: herramientas oficiales de diagnóstico, consentimiento aceptado/rechazado, navegación y envío sin doble evento; no activar campañas ni cobros durante QA.

### CONT-17 — Publicar rama revisada, CI y verificar preview Vercel

- Objetivo: que GitHub y preview representen exactamente el trabajo aceptado.
- Estado: PARCIALMENTE IMPLEMENTADO; consulta de deployments BLOQUEADA POR DEPENDENCIA EXTERNA.
- Módulos: GitHub, `.github/workflows/*`, `.vercel/project.json`, `vercel.json`, variables de entorno.
- Dependencias: CONT-03/13, autorización de equipo Vercel y tarea posterior que autorice commit/push/deploy. No confundir proyecto existente con deployment READY.
- Aceptación: rama/upstream y SHA publicados, CI pasa en Node 22, preview READY del mismo SHA, variables seguras del proyecto exclusivo, Auth redirects correctos, preview no indexada. Registrar URL comprobada y logs; rollback preparado. No reemplazar WordPress ni cambiar DNS.
- Pruebas: build/logs, home/admin/API, sesión/cookies, PDF y medios en hosting, circuito de negocio con fixtures autorizados y sin mensajes no autorizados.

### CONT-18 — Piloto de Álvaro y preparación de producción

- Objetivo: cerrar aceptación operacional y continuidad.
- Estado: BLOQUEADO POR DEPENDENCIA EXTERNA (aceptación del propietario; no impide preparar checklist).
- Módulos: manual, runbook, respaldos/restauración, seguridad, monitorización y todo el circuito.
- Dependencias: CONT-05 a 13 y 17; CONT-15/16 según alcance de lanzamiento aprobado, sin bloquear núcleo por demoras Google.
- Aceptación: Álvaro completa lead→cliente→visita→cotización→instalación→pago→garantía; roles, datos reales, alertas, medios y privacidad validados; respaldo/restauración y responsables de incidentes; lista explícita de pendientes aceptados. Producción/DNS en tarea separada expresamente autorizada.
- Pruebas: sesión de aceptación con registro de resultados, ensayo de recuperación y rollback, revisión de permisos y fallos externos; no declarar listo por aprobar solo build.

## Próximas cinco tareas y trabajo independiente

1. CONT-01: habilitar lectura del Supabase exclusivo e inventariar su estado.
2. CONT-04: preparar y, con autorización específica posterior, ejecutar activación de esquema/Auth y primer acceso.
3. CONT-05: probar captación, clientes, leads, tareas y resumen contra API real.
4. CONT-08/09: aceptar tarifas y recorrer cotización/PDF→instalación→pagos/garantía.
5. CONT-02/07: cerrar límites de datos y programación unificada antes del piloto; preparar ambos desde ahora en paralelo a dependencias externas.

Sin intervención del propietario se pueden desarrollar después CONT-02, la parte local de CONT-03/07/13, pruebas/QA y documentación. El siguiente paso exacto de infraestructura es CONT-01. Si los permisos demoran, el siguiente cambio local concreto es CONT-02, sin tocar migraciones ni servicios remotos.
