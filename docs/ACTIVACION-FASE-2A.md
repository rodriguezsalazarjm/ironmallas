# Activación segura de Fase 2A

Preparado el 2 de noviembre de 2026. Este runbook no autoriza aplicar migraciones ni crear cuentas. Destino exclusivo: **kqdcotpfzluxkqdkgyts**. WordPress y DNS quedan fuera del alcance. Google Reviews sigue después de la aceptación del circuito comercial.

## 1. Conexión OAuth de lectura e inventario

Se configuró en el cliente local Codex el servidor `ironmallas-readonly`:

```text
https://mcp.supabase.com/mcp?project_ref=kqdcotpfzluxkqdkgyts&read_only=true
```

No utiliza PAT, contraseña ni cabeceras de autenticación persistidas en el repositorio. El cliente gestiona OAuth fuera de este proyecto. Su configuración se comprueba con `codex mcp get ironmallas-readonly --json`. Configurar el servidor no significa haber autenticado la cuenta ni disponer de sus herramientas en un chat ya abierto.

Para completar o reintentar el paso humano:

```powershell
codex mcp login ironmallas-readonly
```

Abrir la URL que muestre el comando, iniciar sesión con la cuenta autorizada del cliente y revisar el consentimiento. No pegar tokens/códigos/contraseñas en el chat. Si el enlace expira, volver a ejecutar el comando. Una vez finalizado, comprobar en un chat que cargue ese servidor que su URL mantiene ambos parámetros; usar únicamente sus herramientas con alcance al proyecto. El conector Supabase general que ya estaba disponible en esta sesión devuelve permiso denegado y no acredita acceso mediante este nuevo servidor.

Referencias: [MCP oficial de Supabase](https://supabase.com/docs/guides/ai-tools/mcp) y [MCP en Codex](https://developers.openai.com/codex/mcp).

Con OAuth operativo, realizar solamente estas lecturas:

1. Inventariar tablas públicas/privadas, historial con `list_migrations`, políticas, grants por tabla/columna, constraints, índices, triggers y firmas de RPC. Consultas preparadas en `scripts/audit-supabase-readonly.sql`; ejecutarlas en el destino acotado. Si el transporte no admite transacción completa, ejecutar cada SELECT separadamente manteniendo `read_only=true`.
2. Confirmar existencia de Auth y Storage y metadatos de `admin-documents`/`public-media`; no consultar objetos, archivos, contactos ni identidades reales. La presencia de `auth.users` no acredita login ni configuración del servicio.
3. Revisar en lectura los ajustes Auth: registro público/anónimo, Site URL/redirects, plantillas Invite/Reset con TokenHash, SMTP, límites, políticas de contraseña y sesiones. Si MCP no expone esos ajustes, lectura autorizada de Management API/dashboard; registrar explícitamente lo no visible. No exportar secretos SMTP.
4. Consultar advisors de seguridad y rendimiento. Registrar avisos y enlaces oficiales de remediación, sin aplicar cambios. Comparar firmas, columnas, permisos y políticas con las migraciones locales. No inferir esquema por coincidencia de nombres/versiones.

Resultado esperado: tabla por migración `aplicada y coincide / ausente / divergente / no verificable`, diferencias del esquema y ajustes; propuesta de ejecución y recuperación. Si existe un esquema previo, revisar sus datos/dependencias mediante metadatos y preparar diferencias nuevas, sin volver a ejecutar CREATE TABLE a ciegas.

## 2. Migraciones locales que deben compararse

| Orden | Archivo | Propósito | Estado remoto en esta sesión |
|---|---|---|---|
| 1 | `20261102201241_fase_2a_crm.sql` | Base CRM/Auth/RLS/intake/Storage | No verificable, permiso denegado |
| 2 | `20261102203714_complete_platform.sql` | Operación, cotizaciones, roles, auditoría y contenido | No verificable, permiso denegado |
| 3 | `20261102213759_installation_concurrency.sql` | Versión monotónica de instalación y RPC de estado con comparación bajo lock | Nueva preparación local; no aplicada remotamente por esta tarea |

Las migraciones 1 y 2 se conservaron sin edición. La tercera fue creada con `supabase migration new` y probada en PGlite con las anteriores. No modifica el modelo de agenda. El código nuevo de cambio de estado requiere la RPC `set_installation_status_checked` de la tercera: preparar esquema antes de desplegar ese código; si la RPC falta, la acción falla sin actualizar estado. No usar como fallback el cambio de estado sin comprobación.

Antes de una ejecución futura: conocer estado del destino, revisar respaldo/recuperación, autorizar explícitamente el diff, aplicar solo lo necesario, regenerar tipos y repetir advisors/permisos. Un permiso MCP de lectura no autoriza migraciones. No asumir que una copia de esquema es respaldo de Auth/Storage.

## 3. Variables y entorno

Configurar los valores reales mediante entorno seguro/local ignorado por Git. No inventar cuentas ni claves y no copiarlas a documentación/logs.

| Variable | Necesidad / comprobación |
|---|---|
| `NEXT_PUBLIC_SITE_URL`, `AUTH_SITE_URL` | Ambas `http://localhost:3000` para esta web local; en preview usar el origen HTTPS exacto y redirects autorizados |
| `NEXT_PUBLIC_SUPABASE_URL` | Solo `https://kqdcotpfzluxkqdkgyts.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública del mismo proyecto; no acredita por sí sola configuración correcta |
| `SUPABASE_SECRET_KEY` | Solo servidor del proyecto exclusivo; necesaria para intake/operaciones confiables/primer administrador |
| `LEAD_RATE_LIMIT_SECRET` | Secreto aleatorio de al menos 32 caracteres, exclusivo del entorno |
| `IRONMALLAS_ENV` | `development` únicamente para el bootstrap de desarrollo |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` | Identidad real aprobada; canal seguro; no crear valores de muestra |
| `AUTH_INVITES_CONFIGURED` | `true` solo después de comprobar plantillas, redirects y envío Auth |
| `QUOTE_SHARE_SECRET` | Aleatorio de al menos 32 caracteres si se habilitan enlaces; PDF administrativo no lo requiere |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LEADS_NOTIFY_EMAIL` | Opcionales para correo comercial, distinto del correo Auth; no impiden pruebas de persistencia/PDF sin envío |
| `CAL_WEBHOOK_SECRET`, `CRON_SECRET` | Posponer si no se probarán webhook/notificaciones; no habilitar procesos externos incidentalmente |
| `SITE_INDEXABLE` | Vacío en local/preview; comprobar noindex y canonical antes de piloto |

No sobrescribir un `.env.local` existente. La plantilla ahora usa 3000 para ambos orígenes. Las instrucciones históricas en FASE-2A con otros puertos describen verificaciones pasadas.

## 4. Auth y primer SUPERADMIN

1. Validar las opciones de Auth anteriores, desactivar registro público/anónimos y proveedores no usados. Ocultar registro en UI no sustituye esa configuración.
2. Revisar `docs/USUARIOS-AUTH.md` y `scripts/bootstrap-admin.ts`; utilizar el administrador aprobado por el propietario. Conocer si ya existe perfil/cuenta antes de crear o invitar.
3. Con autorización de provisión y entorno de desarrollo confirmado: `npm run bootstrap:admin -- --confirm-development`. El script no es un mecanismo de bootstrap de producción. Si ya hay un administrador, usar su gestión autorizada; no sustituirlo.
4. Probar invitación/recuperación mediante `/auth/confirm`, contraseña propia, login/logout, refresh/caducidad y bloqueo inmediato por perfil inactivo. Evitar envío de correo mientras no haya autorización y destinatario real aprobado.
5. Probar ADMIN, SUPERADMIN, inactivo y sin perfil con identidades aprobadas; no inventar cuentas durante preparación. Intentos negativos por API directa además de navegación, aislamiento de sesiones y ausencia de datos privados en caché pública.

## 5. Pruebas de aceptación, en orden

| Flujo | Preparación | Criterio observable |
|---|---|---|
| Registro de lead web | Entorno autorizado, formulario y secretos intake, datos sintéticos aprobados sin destinatarios reales involuntarios | UUID guardado, contacto/lead/historial asociados en base y panel, consentimiento/UTM correctos; éxito solo tras persistencia. Repetir exacto, límite y caída backend; WhatsApp honesto si no configura |
| CRM autenticado | ADMIN/SUPERADMIN aprobados y datos del caso anterior | Buscar/editar contacto, aviso duplicado parcial, asignar lead, registrar actividad/estado y seguimiento, completar tarea y contrastar métricas/exportación. Dos operadores no se sobrescriben |
| Visita/instalación | Contacto válido y horario Santiago | Crear/reprogramar/cancelar visita; verificar DST y edición obsoleta. Instalaciones se revisan en su programación actual hasta implementar la propuesta de agenda única |
| Cotización y PDF | Tarifas, IVA, empresa y condiciones reales aprobadas; no inventar importes para activar el negocio | Guardar por RPC, comparar total esperado, generar PDF administrativo y nueva versión sin alterar la anterior; verificar permisos y paginación; enlace opcional si secret configurado. No enviar correos/WhatsApp en esta prueba sin autorización |
| Instalación y pagos | Cotización aceptada del caso aprobado | Trabajo único, dos editores: segundo guardado obsoleto se rechaza; pagos no sobrepasan aprobado; fotos privadas no accesibles anónimamente; garantía con condiciones aprobadas |

Usar pruebas locales sintéticas para reglas financieras antes de contar con tarifas aprobadas; no confundir sus fixtures con datos comerciales para cargar en el proyecto. Registrar IDs de fixtures únicamente en registro privado del entorno y acordar su limpieza; nunca borrar contactos reales como parte de una prueba.

## 6. Propuesta de fuente única para agenda

**Propuesta técnica:** `appointments` será la única fuente de fecha/hora de inicio y fin, técnico y estado de agenda para visitas y trabajos. `installations` conservará ejecución, datos técnicos, finanzas y garantía. Una instalación programada tendrá una cita única mediante `appointment_id`; las citas de instalación vinculadas se editarán por una operación transaccional común, evitando dos formularios que escriban programaciones separadas.

Antes de implementar:

1. Acordar duración/fin de una instalación (el formulario actual solo tiene inicio). No asignar una hora por defecto inventada.
2. Inventariar trabajos/citas ya existentes: vínculo ausente, varias citas, fechas/responsables/estados divergentes, contacto incorrecto y citas Cal. Resolver con reglas explícitas; no generar duplicados por nombre/fecha.
3. Diseñar migración nueva: unicidad del vínculo, validación contacto/tipo, RPC con lock/control de versión que cree o actualice cita y vínculo juntos. Eliminar escrituras independientes de `scheduled_at` cuando se migren los lectores; mantener compatibilidad temporal de lectura o derivación, sin declarar dos fuentes autoritativas.
4. Separar estado de agenda (`scheduled/rescheduled/completed/cancelled`) de ejecución del trabajo (`pending/in_progress/...`); definir su transición conjunta sin inferir que completar una visita finaliza una instalación.
5. Refactorizar agenda/listado/dashboard y ambas fichas hacia esa fuente, probar conflictos/rollback/idempotencia/duplicados y solo después retirar duplicación antigua. La integración Cal sigue entrante; no añadir cambios salientes sin alcance acordado.

Esta entrega corrige concurrencia sobre el modelo existente. **No implementa ni migra la unificación**: requiere la decisión de duración y el inventario remoto para conservar datos reales.
