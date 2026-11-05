# Resumen operativo y pagos

El panel Inicio consulta `dashboard_metrics` en PostgreSQL. Los conteos y sumas se calculan en servidor con autorización; no se suman páginas parciales de PostgREST ni se muestran indicadores ficticios.

El filtro **Desde / Hasta** incluye ambos días en `America/Santiago`. Por defecto muestra el mes actual de la empresa. Las horas inexistentes en el cambio de horario se resuelven al primer inicio válido del día.

## Definiciones

- **Leads nuevos / pendientes de contacto:** oportunidades recibidas en el período cuyo estado actual continúa siendo Nuevo. Ambos indicadores coinciden mientras el negocio use Nuevo como cola de primer contacto.
- **Cotizaciones enviadas:** cotizaciones con envío registrado dentro del período, aunque después hayan sido aceptadas o rechazadas.
- **Cotizaciones por aprobar:** estado Enviada, con vigencia al día de Santiago y envío dentro del período.
- **Visitas próximas:** visitas técnicas o evaluaciones programadas/reprogramadas que aún no comienzan y pertenecen al período.
- **Instalaciones programadas:** trabajos programados/reprogramados con fecha futura dentro del período.
- **Instalaciones realizadas:** trabajos finalizados con fecha de ejecución dentro del período.
- **Presupuestos aprobados / importe aprobado:** cantidad y total CLP de cotizaciones aceptadas en el período.
- **Ingresos registrados:** suma de los pagos por fecha de pago. No equivale a facturación tributaria ni a utilidad.
- **Seguimientos vencidos:** tareas pendientes vencidas más oportunidades abiertas con próxima fecha de contacto vencida. Este bloque considera todo el historial pendiente, sin filtro de período. Las dos fuentes se muestran separadas para identificar si hay tareas y oportunidades relacionadas.

Los indicadores enlazan a listados filtrados. El resumen incluye próximas citas, tareas vencidas, oportunidades que requieren contacto y actividad/auditoría reciente. Los estados vacíos orientan hacia la creación de registros reales.

## Historial de pagos

`/admin/pagos` ofrece una consulta de solo lectura, con rango por fecha de pago, total exacto del período y paginación de 30 registros. Cada pago enlaza a la instalación correspondiente. Se añaden pagos desde la ficha del trabajo; no se editan ni borran importes históricos desde este listado.

La validez de estos cálculos se prueba localmente con datos sintéticos en PostgreSQL. Antes de uso operativo se requiere aplicar las migraciones y verificar los flujos en Supabase de desarrollo autorizado.
