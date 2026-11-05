# Google Reviews — preparación local

Fecha: 2 de noviembre de 2026. Estado: **interfaz y contrato preparados; integración desconectada**.

## Lo disponible

- Sección pública antes de Agenda, con identidad navy/naranja y estado vacío sin estrellas ni cifras.
- Bloque separado en `/admin/resenas`; la tabla `reviews` sigue siendo exclusivamente de testimonios manuales, con consentimiento y texto original.
- `src/features/reviews/google.ts`: contrato discriminado (`disconnected`, `unavailable`, `connected`), validación de enlaces oficiales y adaptador inyectable para respuestas GBP `reviews.list`.
- La vista conectada contempla promedio oficial, total oficial, autor, calificación, comentario opcional, fecha en Santiago, acceso a la ficha y botón para dejar reseña. El enlace de cada tarjeta abre la ficha: no se fabrica un permalink de reseña que GBP no ha proporcionado.
- El promedio no se calcula sobre las tarjetas visibles. Cero reseñas se representa sin promedio. Se deduplican IDs entre páginas y se rechazan ciclos, límites excesivos, valores inválidos y cambios de agregados entre páginas. Los errores del proveedor no se muestran ni registran con posibles secretos.
- No hay fetch de Google, OAuth, tokens, persistencia, scraping, migración, cron ni datos de ejemplo en las pantallas reales. `getGoogleReviews()` siempre devuelve desconectado. El transporte inyectable se utiliza únicamente con fixtures sintéticos en pruebas.

## Permisos y decisiones para la futura conexión

1. El propietario debe identificar y confirmar la ficha exacta, sus enlaces de consulta y de escritura y los IDs de cuenta/ubicación. Un dominio Google permitido no demuestra que el enlace pertenezca a Iron Mallas; esa comprobación humana sigue pendiente. No se ha verificado ningún enlace Google en esta tarea.
2. La cuenta OAuth deberá tener acceso de propietario o administrador a la ubicación. El proyecto Google Cloud necesita acceso aprobado a Google Business Profile API y habilitación de las APIs correspondientes. Tener una cuenta Cloud no acredita elegibilidad ni cuota.
3. Preparar la pantalla de consentimiento y cliente OAuth, con retornos exactos por entorno. El scope previsto es `https://www.googleapis.com/auth/business.manage`, que tiene capacidades más amplias que lectura. Explicar ese alcance al propietario; el transporte de esta integración solo deberá llamar `reviews.list`, sin respuestas ni cambios de ficha.
4. Obtener autorización explícita antes de abrir OAuth o consultar la API. Guardar client secret y refresh token solo en almacenamiento de secretos del servidor; nunca en `NEXT_PUBLIC_*`, tablas públicas, logs o bundle. Renovación/revocación y desconexión deben borrar credenciales y cachés según política aprobada.
5. Implementar el transporte exclusivamente servidor contra la cuenta/ubicación aprobadas. Pasarlo a `readGoogleBusinessReviews`, con orden documentado, timeout por solicitud, límites de cuota y reintentos acotados para 429/5xx. 401/403 deben dejar estado de diagnóstico sin reutilizar otra cuenta. Añadir observabilidad sin cuerpo de reseñas ni tokens.
6. Revisar las políticas vigentes de Google sobre presentación pública, atribución, almacenamiento, selección de reseñas, retención y borrado antes de habilitar publicación/caché. Este contrato local no concede derecho a republicar ni define un TTL universal. No reutilizar reglas de Places para GBP ni mezclar sus resultados.
7. Definir diagnóstico administrativo para cuota, conexión, última actualización y errores sanitizados. Hasta entonces no hay un botón de conectar/sincronizar que simule una operación no implementada.

Referencias para revisar al autorizar la integración (no consultadas en esta tarea): documentación oficial de Google Business Profile, método `accounts.locations.reviews.list`, requisitos de acceso y políticas de API. Confirmar entonces requisitos y scopes vigentes.

## Persistencia futura

No se modifica `public.reviews`. Si se autoriza caché, diseñar almacenamiento separado y protegido con proveedor, cuenta/ubicación, ID externo, datos originales, fetched_at y vencimiento basado en políticas verificadas. Definir borrado de datos revocados/expirados y copias de seguridad. No incorporar `AggregateRating` al JSON-LD sin revisión específica.

## Aceptación pendiente

Pruebas reales autorizadas de lectura: ficha correcta, agregados oficiales, múltiples páginas, autores anónimos, comentarios ausentes, 0 resultados, revocación, cuota, caducidad y desconexión. Verificar atribución/accesibilidad y enlaces de consulta/escritura con el propietario. Las pruebas locales no acreditan una conexión Google real.
