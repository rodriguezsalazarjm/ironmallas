# Programador de avisos: cron-job.org (gratuito)

Fecha: 11-11-2026. Decisión del propietario: usar cron-job.org cada 15 minutos y **no** contratar Vercel Pro para esto. `vercel.json` sigue sin crons.

> **Estado:** código **desplegado en producción** el 11-11-2026 (`dpl_hB7xabBgpyLJ8u1yBSQEtCcSjgt5`, CLI, sin commit), con el lease anti-duplicados (ver §3). La tarea de cron-job.org **no está creada ni activada** y no se han enviado correos reales. Resend no está configurado en Vercel (`RESEND_API_KEY` y `RESEND_FROM_EMAIL` ausentes), así que hoy el procesador responde `configured:false`.

## 1. Endpoint

| | |
|---|---|
| URL | `https://ironmallas-preview.vercel.app/api/notifications/process` (cuando `ironmallas.cl` apunte a Vercel, cambiar solo el dominio) |
| Método | **POST** (recomendado). GET también funciona, con la misma autenticación. |
| Encabezado obligatorio | `Authorization: Bearer <CRON_SECRET>` |
| Cuerpo | Ninguno |
| Respuestas | `200 {"configured":true,"sent":n,"failed":n}`; `200 {"configured":false,...}` si Resend o las notificaciones están deshabilitados (no envía nada); `401` si el secreto es incorrecto; `503` si falta `CRON_SECRET` (o tiene menos de 32 caracteres) o la base no responde |

- Código: `src/app/api/notifications/process/route.ts` → `dispatchNotifications()` (`src/features/notifications/dispatch.ts`) → `dispatchAgendaNotices()` (`agenda.ts`).
- **El secreto va solo en el encabezado.** La comparación es de tiempo constante. Nunca se pone en la URL ni llega al navegador: es una variable sin `NEXT_PUBLIC_` y solo la lee este route handler. La respuesta contiene solo contadores, sin datos personales.
- El botón "Procesar avisos pendientes" del admin (`/admin/notificaciones`, solo SUPERADMIN) usa el mismo código.

## 2. Qué procesa cada ejecución

1. Si `RESEND_API_KEY` y `RESEND_FROM_EMAIL` existen, y `settings.notifications.enabled=true` con un destinatario válido, procesa hasta 20 alertas internas (`lead_created`, `task_due`).
2. Si además `agenda_alerts=true`, procesa hasta 30 avisos de agenda cuyo `send_after` ya venció.

Con todo eso deshabilitado la llamada es inocua: responde `configured:false`.

## 3. Garantías (verificadas en código y pruebas)

| Requisito | Cómo se cumple |
|---|---|
| Sin duplicados con ejecuciones concurrentes | El reclamo es atómico: un `UPDATE` compare-and-set sobre `attempts`. Además, `send_after` se adelanta 10 min como lease mientras el aviso se envía, así que otra ejecución no lo ve. Probado en `tests/notification-queue.test.ts`. |
| Idempotencia ante el proveedor | Se usa `idempotencyKey: notification-<id>` en Resend (24 h). Si Resend responde 409 `invalid_idempotent_request`, el aviso va a **revisión manual**: nunca se reenvía ni se marca como enviado. |
| Error de Resend o de red | El aviso queda `failed` con reintento controlado: a los 5 min y luego a los 15 min, máximo 3 intentos. Después pasa a revisión manual con el motivo en `last_error`. |
| Ventana de reintento | Se mide desde el **primer intento** (`payload.first_attempt_at`), no desde la creación del aviso. Antes, un recordatorio encolado días antes que fallaba quedaba atascado sin explicación. |
| El proveedor aceptó pero la base no registró | No se marca `failed`, porque un reintento chocaría con la clave de idempotencia: queda para revisión. |
| Visitas canceladas o reprogramadas | Doble protección. El trigger anula los avisos viejos al cancelar o mover el evento. Además, justo antes de enviar, `agendaNoticeVerdict` vuelve a leer el evento y descarta el aviso si está cancelado, realizado, si su horario cambió o si el evento ya empezó. Probado en remoto el 11-11 (ver AGENDA-OPERATIVA §10) y en `tests/agenda-operations.test.ts`. |
| Horario | Cada 15 minutos, así que un recordatorio de 24 h sale entre 0 y 15 min después de su hora. Las horas del correo se muestran en America/Santiago. |

## 4. Protección de Vercel (comprobado el 11-11-2026)

- `POST https://ironmallas-preview.vercel.app/api/notifications/process` sin encabezado respondió `401 {"error":"No autorizado"}`. Ese mensaje lo devuelve **nuestro** handler, así que Vercel Authentication **no** bloquea ese dominio. Además confirma que `CRON_SECRET` ya está configurado en Vercel; si faltara, la respuesta sería 503.
- Las URLs de deployments de preview (`*-git-*.vercel.app` o con hash) sí suelen estar protegidas por Vercel Authentication. **Usa siempre el dominio de producción.**
- Si en el futuro se activa la protección en producción, la solución segura es **Protection Bypass for Automation** (Project → Settings → Deployment Protection):
  - Genera un secreto propio que se envía en el **encabezado** `x-vercel-protection-bypass: <secreto>`, nunca como parámetro de la URL.
  - Agrégalo como segundo encabezado en cron-job.org. El `Authorization` sigue siendo obligatorio.
- Si se activa el Firewall o el Attack Challenge Mode, cron-job.org (que no es un navegador) quedaría bloqueado. En ese caso, agrega una regla de bypass solo para la ruta `/api/notifications/process` con método POST.

## 5. Crear la tarea en cron-job.org (dejarla DESACTIVADA)

1. Crear una cuenta en https://cron-job.org, con la cuenta del negocio.
2. **Dashboard → Create cronjob**.
3. Pestaña **Common**:
   - **Title:** `Iron Mallas · procesar avisos`
   - **URL:** `https://ironmallas-preview.vercel.app/api/notifications/process`
   - **Enable job:** **apagado**, hasta terminar §6.
   - **Execution schedule:** *Every 15 minutes*. En modo personalizado: minutos `0,15,30,45`, todas las horas, días y meses.
   - **Time zone:** `America/Santiago`. Es solo para el historial; el envío no depende de esto.
4. Pestaña **Advanced**:
   - **Request method:** `POST`.
   - **Headers:** agregar `Authorization` = `Bearer <CRON_SECRET>`, con el mismo valor configurado en Vercel → Settings → Environment Variables (Production). Si se usa bypass, agregar también `x-vercel-protection-bypass`.
   - **Request body:** vacío.
   - **Timeout:** el máximo que permita el plan gratuito (30 s). Una ejecución normal tarda pocos segundos. Si alguna se corta, el lease evita duplicados y el aviso se retoma en la siguiente.
   - **Treat redirects with HTTP 3xx as success:** **no**. Una redirección indicaría que la llamada no llegó al endpoint (por ejemplo, la página de login de Vercel).
   - **Save responses:** opcional; la respuesta no contiene datos personales.
5. Pestaña **Notifications**: activar el aviso por correo **on failure** (por ejemplo, después de 2 fallos seguidos).
6. Guardar.

**Rotar el secreto:**
- Genera uno nuevo con al menos 32 caracteres, por ejemplo con `openssl rand -base64 48`.
- Actualízalo primero en Vercel y redespliega.
- Después actualiza el encabezado en cron-job.org.
- Nunca lo pegues en tickets, chats ni en la URL.

## 6. Pruebas antes de activar (en orden, sin correos reales hasta el paso 5)

1. **Desplegar** el código actual. ✅ Hecho el 11-11-2026.
2. **Sin credenciales:** `curl -i -X POST https://ironmallas-preview.vercel.app/api/notifications/process` → `401`. Ya verificado.
3. **Secreto incorrecto:** el mismo comando con `-H "Authorization: Bearer incorrecto"` → `401`. ✅ Verificado tras el despliegue, también por GET.
4. **Secreto correcto, con las notificaciones aún deshabilitadas** (hoy no existe `settings.notifications`): **Test run** desde cron-job.org (botón "Test run" o "Execute now") → `200 {"configured":false,...}`. Esto prueba la red, Vercel y la autenticación sin enviar nada.
5. **Envío controlado** (requiere autorización explícita):
   - Verificar el dominio en Resend.
   - En `/admin/notificaciones`, poner como destinatario un correo interno autorizado y activar solo "Agenda".
   - Crear una visita de prueba para un contacto de prueba con un correo autorizado.
   - Ejecutar "Test run" y comprobar en el admin el estado "aceptado por el proveedor", y la recepción del correo.
   - Repetir el "Test run" de inmediato: el resultado debe ser 0 enviados (sin duplicados).
   - Cancelar la visita y ejecutar otra vez: debe salir solo el aviso de cancelación, sin recordatorio.
6. **Activar** la tarea ("Enable job") y revisar el historial de cron-job.org durante la primera hora.
