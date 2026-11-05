# Entrega local — diseño y calidad sin activar servicios

Fecha: 2 de noviembre de 2026, America/Santiago. Checkout: `C:\dev\Ironmallas`.

Esta continuación pospone Supabase/Vercel y sustituye el orden de activación anterior mientras dure esa decisión. Se preservaron los cambios existentes. No se intentaron reparar MCP, OAuth ni credenciales; no se hicieron consultas a Google, operaciones remotas, migraciones, commits, pushes, despliegues ni cambios de DNS.

## Web pública

- Se conserva contenido comercial, navy #06365A, naranja #FC6B04, Oswald y Roboto. No se cambian cifras/afirmaciones históricas del sitio: su validación comercial anterior sigue pendiente.
- Hero con altura acotada en pantallas grandes, espacio para control del video y beneficios en dos columnas en móvil. El video dispone de pausa/reproducción y respeta movimiento reducido y pausa manual.
- Menú móvil limitado al alto disponible y desplazable; botón de cierre de al menos 44 px. Header/footer vuelven correctamente a secciones de inicio desde otras páginas.
- Servicios mantienen tarjetas alineadas y efectos discretos sujetos a preferencias de movimiento.
- Galería con grupo de filtros accesible, visor desplazable en pantallas bajas y controles existentes de anterior/siguiente/cierre.
- Agenda pública carga el proveedor solo al solicitar disponibilidad. Sin dependencia para mostrar el bloque: estado inicial útil, carga limitada a 15 segundos y enlace de respaldo. No se creó ninguna reserva.
- Formulario con texto de 16 px y estado ocupado anunciado; se conserva éxito solo con persistencia y alternativa WhatsApp cuando falta backend. Footer con enlaces táctiles más amplios.
- Google Reviews tiene sección propia y estado vacío honesto. Los testimonios manuales conservan su fuente y consentimiento.

## Panel administrativo

Auditoría de código y estilos compartidos sobre las rutas existentes; no se acredita una sesión autenticada real. Se mantienen tarjetas en listados de clientes, cotizaciones, instalaciones y agenda, evitando imponer tablas anchas en teléfono.

| Pantallas | Mejora o revisión local |
|---|---|
| Layout y navegación | Accesos inferiores a Inicio, Clientes, Agenda y Cotizaciones; menú completo desplegable, cierre al navegar; cuenta/sesión plegadas en móvil; área segura y espacio inferior |
| Dashboard | Métricas siguen calculándose desde registros; próximas visitas excluyen instalaciones para corresponder con el indicador de visitas; no se añaden números de muestra |
| Clientes/contactos y fichas | Campos compartidos legibles; llamada directa; estados de cotizaciones/trabajos traducidos; agenda de ficha usa la misma proyección canónica que el calendario |
| Oportunidades y tareas | Revisión de formularios y tarjetas existentes; heredan controles táctiles, foco y disposición móvil |
| Cotizaciones y tarifario | Se conservan cálculos/estado/historial; filtros y formularios heredan altura y tamaño legibles; no se cargan tarifas ficticias |
| Agenda | Vista unificada de citas y trabajos; calendario desplazable con alternativa de listado y enlaces de 44 px; fuentes limitadas con aviso explícito |
| Instalaciones | Filtros por estado/fechas, limpiar y acceso a agenda; contactos consultados por IDs visibles; error de período presentado en pantalla; vacío contextual |
| Pagos y garantías | Formularios y fichas heredan controles móviles; lógica financiera existente preservada |
| Reseñas | Google separado de testimonios manuales; estado desconectado e instrucciones concretas |
| Contenido, privacidad, notificaciones, auditoría, configuración, cuenta y usuarios | Revisión de pantallas y controles compartidos; checkboxes amplios, texto largo contenido y formularios legibles; permisos existentes conservados |

Los mensajes de `ActionForm` aparecen como bloques de éxito/error anunciados; el formulario expone `aria-busy`. Los campos compartidos conservan foco visible, mínimo 48 px y 16 px de texto, textarea redimensionable y checkboxes con separación.

## Contratos y errores

Las correcciones anteriores ya alineaban nombre de reseña a 100 caracteres, texto a 3000 y motivo de privacidad a 3000; `.env.example` ya unificaba Auth y sitio en puerto 3000. Se conservaron y probaron de nuevo con sus límites SQL reales en PGlite.

La concurrencia de programación/ficha técnica usa id + updated_at original sin perder microsegundos; los cambios de estado conservan la RPC con lock preparada en la tercera migración. No se modificaron las migraciones existentes ni se aplicaron remotamente.

### Decisión de agenda: proyección unificada de lectura

En esta entrega se elige **installations como fuente de programación del trabajo**, compatible con los datos/migraciones actuales. La propuesta histórica de hacer appointments la fuente única queda como alternativa futura, no como contrato de esta implementación.

`unifiedAgenda` combina visitas/citas independientes y trabajos programados. Cada instalación conserva fecha, técnico, dirección y estado de su ficha, sin duración inventada. Las citas vinculadas por appointment_id quedan fuera de la proyección incluso si el trabajo fue movido de mes, cancelado o quedó sin fecha. Se consultan también trabajos vinculados a las citas del período para evitar eventos fantasma fuera del rango. No se deduplican por coincidencia de hora/nombre: sin vínculo explícito se conservan registros independientes.

Una cita vinculada conduce a la ficha de instalación y su acción de guardado rechaza editarla por el formulario antiguo. Los registros históricos de appointments no se reescriben. Clientes API antiguos todavía pueden modificarlos; la UI muestra siempre la programación del trabajo y no promete una restricción SQL nueva. La vista de agenda avisa cuando alcanza el límite de carga; no representa ese subconjunto como inventario total. La ficha de cliente limita historial visible a 30 eventos y carga hasta 1000 instalaciones.

## Google y multimedia

- Contrato y permisos: [GOOGLE-REVIEWS.md](GOOGLE-REVIEWS.md).
- Inventario reproducible: [MULTIMEDIA-INVENTARIO.md](MULTIMEDIA-INVENTARIO.md), `npm run media:inventory`.
- 21 recursos únicos de WordPress: referencias preservadas, sin descarga ni sustitución. Un archivo local público inventariado con tamaño y SHA256. No se supone equivalencia entre ese logo y el remoto.
- Estrategia de alojamiento/derivados, validación y rollback preparada. El build limpio aún puede necesitar acceso para descargar Oswald/Roboto; no se declara build completamente offline.

## Verificación visual

Navegador local a 375×812, 768×1024 y 1440×1000: sin desbordamiento horizontal de documento. Menú abrir/cerrar, filtro Cortinas (dos proyectos existentes), visor siguiente/cierre y FAQ probados. El calendario no inyecta script Cal.com en estado inicial. No se pulsaron enlaces de envío/WhatsApp ni se hicieron reservas.

Para revisar el panel sin Supabase se creó una ruta **temporal** que reutilizaba navegación, campos, paneles y GoogleReviews con aviso visible «sin datos ni operaciones reales». No había métricas ni operaciones funcionales. Se comprobó diseño a los mismos tres anchos, campos de ~50 px/16 px y menú móvil. La ruta se eliminó antes del build final. Esto valida componentes compartidos, no todas las pantallas con datos ni autorización de negocio.

Evidencia: [panel móvil](qa-local/admin-375.png), [panel escritorio](qa-local/admin-1440.png), [Google desconectado en web pública](qa-local/google-1440.png). No sustituyen QA autenticado posterior.

## Pruebas

Resultados finales bajo Node 25.9.0 (no se ejecutó una segunda matriz Node 22):

| Verificación | Resultado |
|---|---|
| `npm test` | 39 casos: 35 aprobados, 4 HTTP omitidos por diseño, 0 fallos |
| `npm run test:http` | Los 4 HTTP aprobados por separado, 0 omitidos, 0 fallos |
| `npm run check` | Lint + TypeScript + build aprobados; 41 páginas, sin ruta temporal |
| `npm run media:inventory` | Aprobado: 14 imágenes y 7 videos WordPress; 1 archivo público local |
| `git diff --check` | Aprobado |

Total entre suites: **39 pruebas aprobadas**, sin contar omisiones como aprobaciones. Un primer intento HTTP mientras el build aún generaba archivos falló; se repitió correctamente después del build. Los errores intermedios de sintaxis/lint y el inventario con top-level await en CommonJS se corrigieron antes de los resultados finales.

 Las regresiones nuevas cubren agregados oficiales sin promedio calculado, paginación/deduplicación Google, vacíos, respuesta inválida, revocación, ciclos y URLs peligrosas; agenda sin duplicados, cambio de fecha/técnico, cancelación, reprogramación fuera del mes, ausencia de duración y filtros/límites temporales. HTTP comprueba sección Google vacía y ausencia de AggregateRating.

## Próximos pasos

1. Revisar diseño y contenido comercial con Álvaro; validar cifras/certificaciones existentes y tarifas/condiciones reales.
2. Cuando se autorice retomar infraestructura: comparar las tres migraciones locales con el remoto exclusivo, activar configuración/Auth/Storage y probar todo el circuito autenticado. No aplicar SQL a ciegas.
3. Ejecutar QA de todas las pantallas con registros autorizados, dos operadores concurrentes, teclado y dispositivos reales. Contrastar métricas y fechas con datos guardados.
4. Autorizar por separado ficha/permisos GBP y transporte servidor; revisar políticas antes de publicar caché o habilitar enlaces Google.
5. Migrar multimedia solo después de obtener/validar archivos y destino; publicar o cambiar DNS en otra tarea expresamente autorizada.
