# Análisis de migración — ironmallas.cl (WordPress + Elementor)

Fuente: `migration/ironmallas.WordPress.2026-11-02.xml` (copiado desde Descargas, 47 ítems, 670 KB).
La web pública devolvió `406` a peticiones automatizadas (protección del hosting), por lo que el
análisis se basa en el XML. Los archivos de `wp-content/uploads` sí responden `200`.

## 1. Inventario del export

| ID | Tipo | Nombre | Uso |
|----|------|--------|-----|
| 22 | page | `home` | **Página principal** — 7 widgets HTML de Elementor |
| 130 | elementor_library | Elementor Header #130 | **Header** (1 widget HTML) |
| 178 | elementor_library | Elementor Footer #178 | **Footer** (1 widget HTML) |
| 96 | page | `home-2` ("home no hay nada") | Vacía — ignorada |
| 265 | elementor_library | UPZITES Home - Tropical Underground Premium | **Ajena al proyecto — ignorada** |
| 268 | elementor_library | Single Page #268 (borrador) | Vacía — ignorada |
| 1 | post | Hola mundo | Por defecto de WP — ignorada |
| 8, 7, 11, 4 | kit / estilos / navegación | — | Configuración de WP, sin contenido útil |
| 26 adjuntos | attachment | imágenes, videos, logos | Ver §4 |

SEO: la página `home` tiene metadatos de Yoast pero **sin título ni descripción personalizados**
(solo puntuación y fecha de IndexNow). Los metadatos del nuevo sitio se redactaron a partir del
contenido real.

## 2. Bloques de la página principal (ID 22)

| # | Bloque | Ancla original | Contenido clave | Interacción JS |
|---|--------|----------------|-----------------|----------------|
| 1 | Hero con video | `#inicio` | H1 "Instalamos mallas de seguridad certificadas en Santiago de Chile", subtítulo, CTA cotización + WhatsApp, 4 pills de confianza, contador "1247+ mallas instaladas" | Altura dinámica del header, contador animado |
| 2 | Servicios | `#servicios` | 3 tarjetas: Mallas (mono/multifilamento + specs), Soportes TV, Cortinas Roller; badges "Venta e instalación / Solo instalación" | Acordeón "Ver más detalles" (una abierta a la vez) |
| 3 | Nosotros | `#nosotros` | Historia, cita "La seguridad no se improvisa.", 6 checks, badge "100% compromiso profesional", 3 pilares | Ninguna |
| 4 | Portafolio | `#portafolio` | 11 fotos (mallas, cortinas) + 6 videos con título, comuna y descripción | Slideshow con autoplay, filtros, puntos, lightbox |
| 5 | Agenda | `#agenda-visita` | Texto de visita técnica + embed Cal.com `ironmallas-ironmallas-9xsuaw/visita-tecnica` | Snippet oficial de Cal.com (inline, `month_view`) |
| 6 | FAQ | `#faq` | 7 preguntas con respuestas y etiquetas | Acordeón exclusivo |
| 7 | Formulario | `#cotizacion` | Nombre, teléfono, email, servicio (9 opciones), mensaje | **`mailto:contacto@ironmallas.cl` + mensaje de éxito sin verificar el envío** |

### Header (#130)
- Barra superior naranja: "📍 Santiago de Chile" / "📱 +569 4582 3209".
- Header navy (`#0f3b5c`) fijo con logo `Recurso-2.png`, menú en píldora translúcida
  (Inicio, Servicios, Nosotros, Trabajos, FAQ, Contacto) y botón naranja "Contacto" → WhatsApp.
- Móvil: botón hamburguesa y menú modal centrado con enlaces, WhatsApp e Instagram.
- Scroll suave con offset calculado en JS.

### Footer (#178)
- Franja con logo, tagline "Seguridad real · Trabajo bien hecho", ilustración de gorila (`Recurso-4.png`).
- Columnas: descripción + slogan + redes, Servicios (7), Navegación, Contacto.
- Créditos "Diseñado por @upzites".
- Problemas: Instagram y Facebook enlazan a `#`; anclas `#por-que-elegirnos`, `#portfolio` y `#contacto`
  no existen; "Política de privacidad" y "Términos de uso" enlazan a `#`.

## 3. Identidad visual encontrada

| Elemento | En WordPress | En Iron Mallas 2.0 |
|----------|--------------|--------------------|
| Navy | `#063c60`, `#0f3b5c`, `#0b2f4a`, `#04283f` (inconsistentes) | `#06365A` (oficial) + escala derivada |
| Naranja | `#ff6a00`, `#f58200`, `#ff7b1f` (inconsistentes) | `#FC6B04` (oficial) + escala derivada |
| Fondos | `#eef3f6`, `#f4f7f8` | Neutros fríos unificados |
| Titulares | Oswald 500–700, mayúsculas | Oswald vía `next/font` (sin peticiones a Google en runtime) |
| Texto | Roboto 400–700 | Roboto vía `next/font` |
| Iconos | Font Awesome 6 (CDN, ~100 KB) + emojis | Lucide (tree-shaking) + SVG propios para WhatsApp/Instagram |
| Animaciones | `slideInFromBottom`, `fadeInText`, `expandWidth`, `lbpop` | Reproducidas en CSS, desactivadas con `prefers-reduced-motion` |
| Radios / sombras | 12–24 px, sombras navy suaves | Tokens `--radius-*` y sombras unificadas |

## 4. Recursos multimedia

Se referencian desde `https://ironmallas.cl/wp-content/uploads/` mediante `next/image` (optimización
automática a AVIF/WebP y tamaños responsivos). **Pendiente**: migrarlos a Supabase Storage en Fase 2
para no depender del WordPress.

| Recurso | Tipo | Uso |
|---------|------|-----|
| `Recurso-2.png` (1421×279) | Logo horizontal claro | Header y footer |
| `Recurso-4.png` (1629×1547) | Ilustración gorila | Footer |
| `logos-02.png`, `cropped-logos-02.png` | Isotipo | Referencia para favicon |
| `Balcony_Safety_Net_A_Family_s_Peace.mp4` | Video | Fondo del hero |
| `ChatGPT-Image-11-abr-2026-*.webp` (4) | **Imágenes generadas con IA** | Tarjetas de servicios y "Nosotros" |
| `2025xxxx_xxxxxx-scaled.webp` (11) | **Fotos reales de instalaciones** | Portafolio |
| `2025xxxx_xxxxxx.mp4` (6) | Videos reales | Portafolio |
| `KINGSHEAD-full-logo.png`, `placeholder-*.png`, `Recurso-1/3.png`, `logos_Mesa-de-trabajo-1.png`, `Logo-Footer.png` | Sin uso en la home | No migrados |

## 5. Integraciones externas

| Integración | Estado en WP | Estado en 2.0 |
|-------------|--------------|----------------|
| Cal.com | Embed inline `ironmallas-ironmallas-9xsuaw/visita-tecnica` | **Conservado**, cargado de forma diferida al acercarse a la sección |
| WhatsApp | `wa.me/56945823209` | Conservado, con mensajes prellenados |
| Instagram | `instagram.com/ironmallas.cl` | Conservado |
| Email | `mailto:contacto@ironmallas.cl` (formulario) | Solo como dato de contacto; el formulario usa Server Action |
| Google Fonts / Font Awesome CDN | Cargados 4 veces | Eliminados (fuentes auto-alojadas por Next) |

## 6. Afirmaciones comerciales a validar con Álvaro

Estas frases **existen en la web actual** y se conservaron, pero deben confirmarse antes del lanzamiento
porque son compromisos verificables:

- "Mallas de seguridad **certificadas**" / "materiales certificados" — ¿qué certificación y de quién?
- Contador "**1.247+** mallas instaladas en Santiago" — ¿cifra real y actualizada?
- Especificaciones: monofilamento 90 kg/m² y hasta 2 años; multifilamento 250 kg/m² y hasta 5 años.
- "Garantía sobre la instalación" (FAQ 06) — condiciones y plazo.
- "Respuesta en menos de 24 horas (hábiles)".
- "Evaluamos ... en la visita de cotización sin costo adicional" y "Cotización gratuita".
- Servicios del formulario/footer sin tarjeta propia: pintura, piso epóxico, remodelación de cocina / general.

Todas están centralizadas en `src/content/site.ts` para corregirlas en un solo lugar.

## 7. Cambios respecto del original

| Cambio | Motivo |
|--------|--------|
| Tarjeta de mallas muestra solo "Venta e instalación" (el original también decía "Solo instalación") | Contradecía la FAQ 03: las mallas se instalan solo con material propio |
| Fotos de servicios de mallas y cortinas, y foto de "Nosotros": reemplazadas por fotos **reales** del portafolio | Las originales eran imágenes generadas con IA; la de "Nosotros" decía "Equipo Iron Mallas en terreno" sin serlo. Soportes TV mantiene la imagen IA por no haber foto real |
| Título "MALLAS DEN VENTANAS" → "Mallas en ventanas" | Error tipográfico |
| Footer: Instagram con URL real; Facebook, "Política de privacidad" y "Términos de uso" retirados | Enlazaban a `#` |
| Footer: anclas rotas (`#por-que-elegirnos`, `#portfolio`, `#contacto`) | Ahora usa el mismo menú del header |
| Botones naranjas con texto navy oscuro en lugar de blanco | Blanco sobre `#FC6B04` tiene contraste 2,9:1 (no cumple WCAG AA); navy-950 llega a ~6:1 |
| Formulario: Server Action con validación en servidor, campo comuna opcional, consentimiento y captura de UTMs | Reemplaza `mailto:` y el falso mensaje de éxito |
| Portafolio: grilla + lightbox accesible (teclado, `<dialog>`), carrusel deslizable en móvil | El slideshow con autoplay ocultaba proyectos y no era accesible |
| Agenda en menú principal | Antes no tenía acceso directo desde la navegación |
| Botón flotante de WhatsApp | El original tenía una píldora fija de Instagram; WhatsApp es el canal de conversión principal |
