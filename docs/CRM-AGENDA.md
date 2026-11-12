# CRM y agenda — operación diaria

> La agenda centralizada (vistas, fichas técnicas, conflictos, Cal.com y avisos) se documenta en [AGENDA-OPERATIVA.md](AGENDA-OPERATIVA.md); las secciones de agenda de este archivo pueden estar desactualizadas.

## Clientes y contactos

- En **Clientes**, usa **Nuevo contacto** para registrar nombre, correo y teléfono. El correo y teléfono se normalizan para buscar coincidencias.
- Antes de guardar, el sistema compara correo y teléfono con contactos existentes. Una coincidencia exacta se bloquea; una coincidencia parcial muestra advertencia y exige confirmar que son personas diferentes. No fusiona ni borra historial automáticamente.
- Marca la autorización de tratamiento únicamente si existe consentimiento real. La fecha queda registrada. Crear una oportunidad manual exige esa autorización.
- La ficha reúne datos del contacto, oportunidades, cotizaciones, trabajos, últimas citas, actividades y tareas.
- **Editar datos** conserva sus relaciones. **Cliente** identifica una relación comercial confirmada; no cambia una oportunidad ni crea un trabajo.
- **Exportar datos JSON** descarga datos del contacto y registros relacionados (incluye historial y metadatos de fotografías; no adjunta archivos privados). Requiere una sesión administrativa activa y no tiene enlaces públicos.

## Oportunidades y seguimientos

1. Selecciona **Nueva oportunidad** y un contacto. Si no existe, regístralo primero.
2. Indica servicio, solicitud y responsable activo.
3. En la ficha puedes registrar llamada, correo, WhatsApp o nota, cambiar estado y programar el próximo seguimiento.
4. Desde la ficha del contacto, **Programar seguimiento** permite crear varias tareas independientes, con fecha, responsable, nota y oportunidad opcional.
5. Al terminar una tarea, actualiza su estado a Completada; si ya no corresponde, usa Cancelada. Los registros permanecen disponibles.

La búsqueda de oportunidades acepta nombre, teléfono o correo. También permite filtrar por comuna y estado comercial. El directorio de contactos se pagina de 30 en 30 y permite mostrar solo clientes.

Abrir WhatsApp o redactar un correo no confirma que se haya enviado un mensaje. Registra la gestión después de realizarla.

## Agenda

- Elige **Listado** o **Calendario** y filtra por mes y estado.
- Usa **Nueva cita** para visita técnica, evaluación o instalación. Selecciona contacto, servicio, dirección, comuna, horario y técnico responsable.
- Los horarios se introducen y muestran en **America/Santiago**. El sistema aplica horario de verano/invierno; rechaza horas inexistentes en cambios de horario. Si una hora se repite por cambio de horario, elige la primera ocurrencia.
- El término debe ser posterior al inicio. La UI limita una cita manual a 24 horas.
- Edita la ficha para reprogramar: si cambias las horas de una cita programada, su estado pasa a Reprogramada.
- Cambia a Realizada y registra el resultado al completar la visita. Para anular, selecciona Cancelada. La cita no se elimina.
- Si otra persona editó la cita mientras estaba abierta, se bloquea el guardado para evitar sobrescribir cambios. Recarga la ficha y revisa los datos.

Las reservas de Cal.com pueden no traer teléfono: la ficha muestra Sin teléfono y permite completarlo después. La sincronización externa solo debe considerarse activa después de configurar y probar el webhook. Editar una cita interna no modifica una reserva en Cal.com; para eso usa el servicio externo.

## Límites visibles y acceso

Los selectores muestran hasta 500 contactos y las 1.000 oportunidades más recientes. Las fichas muestran las últimas 100 oportunidades/actividades/tareas, 30 citas, 30 cotizaciones y 30 trabajos. El calendario muestra hasta 1.000 citas por mes e informa si hay más. La exportación JSON pagina todos los registros relacionados accesibles por RLS.

Todas las pantallas, acciones y exportaciones requieren autenticación y perfil ADMIN/SUPERADMIN activo. Los campos se validan en servidor y la base aplica RLS. No se envían mensajes externos desde estos formularios.

## Verificación

`tests/crm.test.ts` comprueba normalización/validaciones de contacto, filtros seguros, horario de Santiago (verano, invierno y cambio DST) y duración de citas. TypeScript y ESLint comprueban las rutas y acciones. Las pruebas de CRUD contra Supabase real requieren el proyecto de desarrollo configurado y sus migraciones aplicadas; no se presentan como ejecutadas sin ese entorno.
