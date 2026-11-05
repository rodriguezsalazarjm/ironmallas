# Cotizaciones y tarifario

## Activación comercial

1. SUPERADMIN abre **Tarifario y condiciones** (`/admin/tarifario`).
2. Completa datos reales de la empresa, IVA confirmado por el negocio, días de validez y condiciones de pago.
3. Añade tarifas reales por m², unidad, hora o importe fijo. Cada tarifa puede indicar material, mínimo neto por concepto, recargo y descuento máximo permitido a ADMIN.
4. No se cargan precios ni condiciones de garantía de ejemplo. Sin configuración comercial válida y tarifas activas, el cotizador queda bloqueado.

Los adicionales, materiales, mano de obra y recargos de trabajos específicos se modelan como conceptos con tarifas configuradas; no se acepta un precio libre enviado desde el navegador. SUPERADMIN puede autorizar descuentos superiores al máximo de ADMIN, pero nunca un total cero o negativo.

## Flujo de uso

- Abrir **Cotizaciones → Nueva cotización**.
- Buscar un contacto por nombre, teléfono o correo, o registrarlo desde Clientes. La búsqueda muestra hasta 50 coincidencias.
- Añadir entre 1 y 50 conceptos. Las dimensiones se ingresan en metros y la cantidad admite hasta tres decimales.
- Revisar el resumen y guardar el borrador. El servidor calcula nuevamente los importes a partir del tarifario y guarda una versión inmutable.
- Revisar o descargar el PDF. La ficha conserva los PDFs de versiones anteriores.
- Para editar una cotización, desplegar **Editar y crear nueva versión**. Se aplican los precios actuales solo a la nueva versión; las anteriores conservan sus precios originales.
- Registrar manualmente el envío después de entregarlo, o enviar el PDF por correo cuando Resend esté configurado.
- Marcar aceptada, rechazada o vencida según corresponda. Una cotización aceptada no se puede modificar y permite crear una instalación.

## Cálculo y redondeo

Todos los importes persistidos son enteros CLP. El navegador usa `BigInt` para el cálculo previo y PostgreSQL recalcula la operación al guardar.

- m²: precio × ancho_mm × alto_mm × cantidad_milésimas / 1.000.000.000.
- Unidad, hora y fijo: precio × cantidad_milésimas / 1.000.
- Se redondea cada concepto al peso más cercano; mitades hacia arriba.
- Se aplica el mínimo configurado al concepto y después su recargo, también redondeado al peso.
- El descuento global se calcula y redondea sobre el subtotal de los conceptos.
- El IVA se calcula y redondea sobre el neto después del descuento.
- El total es neto + IVA. El límite de cada importe persistido es 2.147.483.647 CLP.

No se asume un IVA ni se aplican tarifas de muestra. La configuración tributaria y los precios deben validarse comercialmente antes de emitir documentos reales.

## PDF y versiones

El PDF se genera en servidor con `pdf-lib`, desde el snapshot de la versión guardada: cliente, datos comerciales, conceptos, dimensiones, materiales, precios, descuentos, IVA, total y condiciones. Usa el logotipo original almacenado localmente; si el archivo no estuviera disponible, usa la marca textual como respaldo. Incluye número único y versión, validez, pie y numeración de páginas. Los caracteres fuera del alfabeto soportado se sustituyen por `?` para no impedir la descarga.

Las rutas administrativas de PDF requieren sesión y perfil autorizado. El PDF es un presupuesto, no una factura tributaria.

## WhatsApp y enlaces privados

Para enlaces seguros configurar `QUOTE_SHARE_SECRET` (secreto aleatorio de al menos 32 caracteres) y `NEXT_PUBLIC_SITE_URL` con la URL del entorno. Nunca usar el dominio de WordPress si no apunta a esta aplicación.

El enlace usa firma HMAC SHA-256 con id, versión y vencimiento máximo de siete días. Solo funciona para la versión vigente mientras el presupuesto esté enviado o aceptado y vigente según la fecha de Santiago de Chile. Crear una nueva versión o cambiarlo a rechazado/vencido retira el acceso anterior. Las versiones históricas permanecen disponibles mediante descarga administrativa autenticada. Rotar el secreto invalida todos los enlaces anteriores.

El enlace es un permiso de lectura para quien lo posea: compartirlo solo con el destinatario. Abrir el botón de WhatsApp únicamente prepara un mensaje; el operador debe revisarlo y enviarlo en WhatsApp. La aplicación no afirma haber enviado automáticamente ese mensaje.

## Correo

Configurar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` con un dominio remitente verificado. La acción autenticada adjunta el PDF de la versión vigente y registra una notificación `quote_email`. La clave de idempotencia del proveedor usa cotización + versión. Las versiones previamente aceptadas por el proveedor no se reenvían desde el botón; se consulta el registro para resolver incidencias.

Una respuesta exitosa de Resend indica aceptación por el proveedor, no entrega garantizada al buzón. Si el correo falla, la cotización permanece guardada. El trabajador genérico de notificaciones debe excluir `quote_email`, porque su envío necesita la acción específica que adjunta el PDF.

## Pruebas y límites reales

Las pruebas locales cubren precisión decimal, redondeo, mínimos, recargos, descuentos, tarifas ausentes/inactivas, PDF válido con paginación extensa y firma/expiración de enlaces. Sus tarifas y contactos son exclusivamente sintéticos y no se cargan a la aplicación.

La persistencia financiera y el historial se verifican en las pruebas PostgreSQL de migraciones. Antes de habilitar uso real, ejecutar los flujos con Supabase de desarrollo autorizado. El envío real por Resend y los enlaces en Vercel requieren configurar y verificar esos servicios; no se declara superada esa integración mediante pruebas locales.
