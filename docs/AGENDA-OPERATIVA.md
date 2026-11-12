# Agenda operativa, fichas técnicas y automatizaciones

Fecha: 11 de noviembre de 2026 (America/Santiago). Este documento es la referencia **vigente** de la agenda centralizada. Reemplaza las secciones de agenda de [CRM-AGENDA.md](CRM-AGENDA.md) y [ESTADO-ACTUAL.md](ESTADO-ACTUAL.md).

> **Estado:** implementado y probado **localmente** (PGlite + pruebas unitarias). La migración `20261111173128_agenda_operations.sql` **está aplicada** en Supabase remoto desde el 11-11-2026, con pruebas remotas revertidas (ver §10). El código todavía no está desplegado. Nada se probó contra Cal.com ni Resend reales.

## 1. Qué se reutilizó (sin duplicar)

| Existente | Uso |
|---|---|
| `appointments` / `installations` | Siguen siendo las únicas fuentes. `installations.scheduled_at` sigue siendo la verdad para instalaciones. |
| `unifiedAgenda()` | Contrato conservado: deduplicación **solo** por vínculo explícito (`installations.appointment_id`), nunca por fecha, hora o cliente. Se añadieron filtros (técnico, búsqueda sin acentos). |
| `sync_cal_booking` + webhook `/api/webhooks/cal` | Firma HMAC, idempotencia por `eventKey`, eventos fuera de orden y UID ya existían; ahora también crea lead/contacto con dirección, comuna, WhatsApp, tipo de zona y consentimiento. |
| `notifications` + `/api/notifications/process` + Resend | Se usa la misma cola, con `send_after`, `entity` y estado `cancelled`. No se creó otra cola. |
| `save_quick_quote` | Misma fórmula (ancho+alto)×cantidad×tarifa; se agregó precio excepcional por cotización y tratamiento de IVA validado. |
| `audit_logs` | Historial de cambios de fichas, citas, tarifas y exenciones. |
| Bucket privado `admin-documents` | Fotos antes/después de la ficha técnica. |

## 2. Agenda (Comercial → Agenda)

- Vistas **Día, Semana, Mes, Año y Listado**. En móvil, la semana se muestra como tarjetas por día. Día y Listado conservan los horarios completos.
- Visita y instalación se distinguen **sin depender del color**: VT tiene borde sólido, ícono de portapapeles y etiqueta "VT". INST tiene borde discontinuo, rayado, ícono de llave y etiqueta "INST". Las marcas de asistencia confirmada, sincronización pendiente y cancelación también usan íconos.
- Un evento sin duración conocida se dibuja con contorno punteado y la leyenda "Duración por confirmar". No se inventa una duración.
- Acciones disponibles:
  - Crear desde un día u hora (`/admin/agenda/nueva?start=`).
  - Abrir la ficha.
  - Reprogramar o asignar técnico desde el panel lateral, mediante formulario. No hay arrastrar y soltar.
  - Cancelar con motivo.
  - Filtrar por tipo, técnico (incluido "sin asignar") y estado.
  - Buscar por cliente o dirección.
  - Navegar entre cliente, cotización e instalación.
- No hay eventos ficticios. Las capturas de [qa-local/](qa-local/) usaron una ruta temporal de desarrollo con datos de demostración rotulados, ya eliminada.

## 3. Ficha técnica

`/admin/agenda/[id]` e `/admin/instalaciones/[id]`:

- **Identificación:** cliente, contacto, dirección, comuna, edificio, depto, piso y acceso.
- **Programación:** fecha, duración, técnico, estado y asistencia.
- **Evaluación técnica** (`technical_assessments`): zonas con ancho, alto, cantidad y tipo; tipo de malla; pilares de 2,00 y 2,40 m; observaciones.
- **Fotos antes/después** (`assessment_photos`): almacenamiento privado y re-codificación JPEG.
- **Cadena comercial:** visita → cotización → instalación → pagos.
- **Historial** de cambios.
- **Botón "Crear cotización con estas medidas":** prellena el cotizador rápido con las zonas y pilares, y vincula `quotes.appointment_id`.
- **Botón "Programar instalación"** en una cotización aceptada: prellena cliente, dirección, acceso y servicio sin volver a escribirlos.

## 4. Conflictos de técnico

- `public.schedule_conflict(...)` y el trigger `schedule_guard` se aplican a citas e instalaciones. El error 23P01 se traduce a un mensaje legible.
- La duración de una instalación se toma de `duration_minutes`, si no de `settings.agenda.default_installation_minutes`, y si no de 1 minuto. En ese último caso solo se bloquea el inicio, y se documenta como limitación.
- `settings.agenda.buffer_minutes` (por defecto 0) agrega un margen antes y después de cada evento.
- La cita vinculada a su propia instalación no cuenta como conflicto.
- Se usa un advisory lock por técnico para evitar carreras.
- Limitación: solo se controlan técnicos, no vehículos ni otros recursos.

## 5. Cal.com (reserva pública solo para visitas)

### Flujo en el sitio

El flujo del sitio (`booking-flow.tsx`) tiene dos pasos:

1. Se piden nombre, correo, WhatsApp, dirección, comuna, tipo de zona, detalle, consentimiento y aviso de privacidad.
2. Se muestra el embed de Cal.com con esos datos prellenados y `metadata[consent]=1`.

### Configuración requerida (pendiente, externa)

1. En el tipo de evento "visita-tecnica", crear preguntas de reserva con estos identificadores exactos: `direccion`, `comuna`, `tipo_zona` (balcon/ventana/logia/terraza/otra), `whatsapp`, `detalle` y `consentimiento` (checkbox). Están definidos en `src/content/cal-fields.ts`.
2. Configurar el webhook hacia `https://<dominio>/api/webhooks/cal` con BOOKING_CREATED, BOOKING_RESCHEDULED y BOOKING_CANCELLED, usando el secreto `CAL_WEBHOOK_SECRET` (≥32 caracteres).
3. Configurar `CAL_API_KEY` (API v2). Si falta, el admin **no** puede reprogramar ni cancelar visitas reservadas por Cal.com y se muestra un error, nunca un éxito falso.
4. **Bloqueo de disponibilidad por eventos internos:** instalar la app *ICS Feed* en Cal.com con la URL `https://<dominio>/api/agenda/busy/<AGENDA_ICS_TOKEN>`. Cal.com refresca el feed cada cierto tiempo, así que **no es instantáneo** y una reserva puede colarse en esa ventana. El trigger de conflicto sigue protegiendo al técnico asignado, pero las visitas Cal.com sin técnico no se bloquean.
5. Desactivar los workflows de recordatorio de Cal.com, o bien dejar `settings.agenda.client_emails_for_cal=false` (por defecto), para evitar correos duplicados. Con el valor `false` el sistema no reenvía la confirmación inicial de Cal.com al cliente, pero sí el recordatorio de 24 h con enlace de confirmación.

### Sincronización desde el admin

La regla es primero Cal.com y después la base:

- Si Cal.com rechaza el cambio, la cita no cambia y queda `cal_sync_status=failed` con el motivo.
- Si Cal.com acepta pero la actualización local falla, queda `pending` y se avisa.
- Una reserva cancelada nunca se reactiva por eventos tardíos.

## 6. Correos (Resend)

- El trigger `enqueue_agenda_notifications` crea avisos de agendado, reprogramado, cancelado y recordatorio a −24 h, para el cliente y para el admin.
  - Asunto del cliente: "Tu visita técnica con Iron Mallas está agendada".
  - Un reprogramado o cancelado invalida los recordatorios anteriores (`status=cancelled`).
  - Nunca se recuerda un evento cancelado: además del trigger, el despachador revalida el estado y el horario antes de enviar.
- **Regla para eventos a menos de 24 h:** no se crea recordatorio. El aviso de agendado incluye el enlace de confirmación (`near=true`).
- **Confirmación de asistencia:** el enlace `/confirmar/<token>` es de un solo uso lógico y vence al inicio del evento. Solo se guarda el hash SHA-256 del token. La página GET no confirma; confirmar exige POST, para que los antivirus de correo no confirmen solos. El resultado queda en `attendance_status` y `attendance_confirmed_at`.
- **Idempotencia y reintentos:**
  - `dedupe_key` en la cola.
  - Reclamo optimista por `attempts`, como control de concurrencia.
  - Máximo 3 intentos.
  - Clave `idempotencyKey` hacia Resend.
  - Los reintentos con más de 23 h de antigüedad quedan para revisión manual.
- **Horario:** todas las horas se muestran en America/Santiago, con el cambio de horario (DST) probado.
- Se activa en Notificaciones → "Avisos de agenda" (`agenda_alerts`).

**Programador:** decisión 11-11-2026: cron-job.org cada 15 min con `Authorization: Bearer <CRON_SECRET>` (sin Vercel Pro). Configuración, garantías y pruebas: [CRON-NOTIFICACIONES.md](CRON-NOTIFICACIONES.md). Alternativas descartadas:

- Vercel Pro con `*/15 * * * *` hacia `/api/notifications/process`.
- GitHub Actions programado (menos preciso: sus crons pueden retrasarse en horas punta).

**Requisito antes de declarar funcional:** dominio verificado en Resend, `RESEND_FROM_EMAIL` en ese dominio, y prueba con destinatarios autorizados.

## 7. Cotizador

- Las tarifas siguen en `settings.commercial`: solo ángulos $6.000/ml, recambio $5.000/ml, pilar 2,00 m $17.990 y pilar 2,40 m $19.990. Solo SUPERADMIN las edita, y el historial se ve en Tarifario (desde `audit_logs`).
- **Precio excepcional por ml:** opción "Precio excepcional", solo SUPERADMIN, con monto entre 1 y 10.000.000 y motivo de 5 a 300 caracteres. Se guarda en el `pricing` de esa cotización junto a la tarifa base y a quién lo ingresó. **No** modifica la tarifa general.
- Las cotizaciones aceptadas siguen siendo inmutables (regla existente, cubierta por pruebas).
- **IVA:** por defecto es "afecta 19 %". Para dejarla "exenta" o "no afecta":
  - Debe elegirse una exención configurada en Tarifario → Exenciones, solo por SUPERADMIN, con fundamento legal de 10 a 500 caracteres.
  - Al guardar la exención se exige marcar la casilla de validación por el contador.
  - Ser empresa o pedir factura **no** basta.
- Los PDF son **cotizaciones comerciales, no facturas**.
- **Requiere aprobación del contador:** cada exención o caso de no afecto (fundamento SII), la leyenda del PDF, y si el precio excepcional necesita un respaldo documental.

## 8. Configuración `settings.agenda`

```json
{"buffer_minutes":0,"client_emails_for_cal":false}
```

La migración inserta esos valores. Se puede agregar `default_installation_minutes` (opcional); si no existe, solo se bloquea el inicio de las instalaciones sin duración.

## 9. Variables de entorno nuevas

`CAL_API_KEY`, `CAL_API_URL` (opcional, por defecto `https://api.cal.com/v2`) y `AGENDA_ICS_TOKEN` (≥32 caracteres aleatorios). Ver `.env.example`.

## 10. Migración (APLICADA en remoto)

`supabase/migrations/20261111173128_agenda_operations.sql`. Aplicada el 11-11-2026 en `kqdcotpfzluxkqdkgyts` con `apply_migration`, autorizada por el propietario. Supabase la registró como versión `20261111173128`; el archivo local, preparado como `20261111120000`, se renombró para coincidir con el historial remoto.

- Es aditiva y no modifica migraciones aplicadas.
- Reemplaza (`create or replace`) `sync_cal_booking` y `private.save_quick_quote`, conservando sus grants.
- Se aplicó sin las líneas `begin;`/`commit;`, porque `apply_migration` ya la ejecuta en su propia transacción. El resto del archivo es idéntico: el md5 de las 10 funciones remotas coincide con el archivo.
- **Antes de aplicar** (11-11-2026) se comprobó:
  - Rol `postgres` con escritura habilitada.
  - Las 5 migraciones previas aplicadas.
  - Conteos y hash de `save_quick_quote` iguales al estado auditado.
  - Sin colisiones de nombres.
- **Después de aplicar** se verificó:
  - 23 columnas nuevas.
  - RLS y políticas de admin en `technical_assessments` y `assessment_photos`.
  - 12 triggers.
  - Grants de las RPC: `confirm_attendance` e `issue_attendance_token` solo para service_role; `schedule_conflict` para authenticated, con rechazo interno a quien no es admin.
  - `settings.agenda` creado.
  - Check de estados con `cancelled`.
  - Datos previos intactos.
- **Advisor de seguridad nuevo (aceptado):** `schedule_conflict` es SECURITY DEFINER ejecutable por authenticated. Es intencional: devuelve `Forbidden` a quien no es admin (probado). El otro aviso, la protección de contraseñas filtradas desactivada en Auth, ya existía.
- **Respaldo y recuperación:** el respaldo lógico previo, las definiciones anteriores de las funciones y `rollback.sql` están en `.local/backups/20261111-pre-agenda-operations/`. Esa carpeta está ignorada por git porque contiene datos personales. No se verificaron los respaldos de la plataforma Supabase.

### Pruebas remotas controladas (11-11-2026)

Se ejecutaron dentro de bloques que terminan siempre con `raise exception`, de modo que **todo se revierte**. Se usaron datos de prueba `QA-ROLLBACK` con correos `@example.invalid`. No se modificaron clientes reales y no se envió ningún correo: los avisos se revierten y el despachador no corre. Después de las pruebas quedan 0 filas QA y los conteos son iguales a los previos.

| Prueba | Resultado |
|---|---|
| Crear visita con técnico y acceso | ✅ `source=admin`, 4 avisos en cola (agendado + recordatorio, cliente y admin), asunto "Tu visita técnica con Iron Mallas está agendada" |
| Visita superpuesta del mismo técnico | ✅ rechazada con 23P01 |
| Reprogramar | ✅ los avisos anteriores pasan a `cancelled`; nuevo aviso de reprogramación + recordatorio |
| Cotizador, modo tarifa (comportamiento anterior) | ✅ 3,5 ml × $6.000 = $21.000 + IVA $3.990 = $24.990, vinculada a la visita, 1 versión |
| Precio excepcional $7.000/ml | ✅ neto $24.500; la tarifa general sigue en $6.000 |
| IVA exento sin exención configurada | ✅ rechazado |
| Instalación desde cotización aceptada (120 min) | ✅ creada con 4 avisos; una visita dentro de su duración se rechaza con 23P01 |
| Cotización aceptada | ✅ el RPC no la reedita; un admin autenticado solo tiene SELECT sobre quotes, ítems y versiones (42501). La protección no aplica a conexiones directas como dueño de la base. |
| Token de asistencia | ✅ `ready` sin efectos, después `confirmed`; al mover el evento la asistencia vuelve a `pending` y el token queda `outdated`; un token desconocido da `invalid`; tras cancelar da `unavailable` |
| Cancelar | ✅ 0 recordatorios pendientes, 2 avisos de cancelación en cola |
| Webhook Cal.com simulado (llamada SQL) | ✅ `cal_booking/synced`, zona, lead creado, alerta `lead_created` duplicada cancelada, reenvío idempotente |
| RLS como authenticated no admin | ✅ 0 citas y 0 fichas visibles; insertar ficha y llamar `confirm_attendance` da 42501; `schedule_conflict` da `Forbidden` |
| Ficha técnica como admin | ✅ insertada; una zona inválida se rechaza |

**No verificado aún:** la UI del admin contra el remoto (requiere desplegar o un login real), Cal.com real y Resend real.

## 11. Verificación

| Qué | Tipo |
|---|---|
| 12 pruebas `tests/agenda-operations.test.ts`: conflictos/buffer, dedupe por vínculo, recordatorios <24 h, cancelación invalida avisos, tokens, Cal fuera de orden/idempotente, precio excepcional, exención IVA, RLS | **Simulada** (PGlite/mocks) |
| lint, typecheck, build | Real (local) |
| QA visual 375/768/escritorio, vistas día/semana/mes/año/listado y panel de acciones | Real en navegador local, con datos de demostración |
| Cal.com API v2, webhook real, ICS en Cal.com, Resend | **No verificado** |
