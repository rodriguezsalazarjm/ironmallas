# Inventario local de multimedia

Generado por `npm run media:inventory`, sin consultar WordPress ni otros servicios.

Contenido estático: **21 recursos únicos** (14 imágenes y 7 videos), todos dependientes de WordPress.
El contenido publicado en CMS y las fotografías privadas requieren inventario autorizado posterior; no están disponibles localmente.

| Recurso WordPress | Usos en contenido | Estado |
|---|---|---|
| https://ironmallas.cl/wp-content/uploads/2026/04/20250926_233415-scaled.webp | projects[3].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20250929_170631-scaled.webp | projects[4].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251007_193141-scaled.webp | projects[5].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251017_140745-scaled.webp | projects[8].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251022_205102-scaled.webp | projects[7].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251029_192623-scaled.webp | projects[6].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251101_141021.mp4 | projects[16].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251106_191454.mp4 | projects[15].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251108_124317-scaled.webp | services[0].image.src, projects[0].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251122_155614-scaled.webp | projects[10].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251122_161700-scaled.webp | services[2].image.src, projects[9].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251128_131949-scaled.webp | projects[2].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251128_131956-scaled.webp | about.image.src, projects[1].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251202_150437.mp4 | projects[14].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251209_183335.mp4 | projects[13].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251209_202409.mp4 | projects[12].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/20251219_181637.mp4 | projects[11].src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/Balcony_Safety_Net_A_Family_s_Peace.mp4 | hero.video.src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/ChatGPT-Image-11-abr-2026-12_08_00-p.webp | services[1].image.src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/Recurso-2.png | brand.logo.src | Referencia conservada; archivo remoto no validado |
| https://ironmallas.cl/wp-content/uploads/2026/04/Recurso-4.png | brand.mascot.src | Referencia conservada; archivo remoto no validado |

## Archivos en public

| Archivo | Bytes | SHA256 |
|---|---:|---|
| public/brand/logo.png | 31242 | ee40390599cdfcb936df2755b420b4e27db64b1d544d1d65584208f9f6694547 |

La presencia de un logo local no demuestra que sea equivalente al logo remoto. No se reemplaza ninguna referencia automáticamente.

## Estrategia de salida de WordPress

1. Respaldar originales autorizados con `media:migrate -- --download` en una tarea posterior. Validar firma MIME, bytes y SHA256; conservar manifiesto y originales.
2. Elegir alojamiento público estable: Storage autorizado o un CDN de objetos. No requiere mantener WordPress como origen. Las fotos administrativas permanecen privadas y separadas.
3. Generar imágenes WebP/AVIF a tamaños de uso; conservar originales y transparencia. Mantener dimensions/sizes y revisión visual antes de aceptar derivados. No ampliar imágenes pequeñas.
4. Para videos, conservar MP4 original, preparar derivados H.264 compatibles y poster validado; medir peso, reproducción móvil y calidad. No inventar posters ni sustituir con archivos no comprobados.
5. Publicar con nombres por hash y caché immutable. Comprobar URL pública, MIME, dimensiones, integridad y respuesta del optimizador; añadir solo el host/ruta permitidos a next.config.ts.
6. Preparar mapa de URLs y rollback, comparar visualmente cada uso a 375/768/1440 px. Reemplazar únicamente tras validación completa. No eliminar WordPress ni cambiar DNS.

`scripts/migrate-media.ts` ya prepara manifiestos, validación y rollback. En esta tarea no se ejecutaron sus modos de descarga ni subida.
Las fuentes Oswald/Roboto usan next/font/google: se sirven localmente al visitante, pero un build limpio puede necesitar descargar las fuentes. Para un build completamente offline, incorporar WOFF2 con licencia validada y usar next/font/local en una tarea posterior.
