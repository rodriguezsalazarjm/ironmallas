# Arquitectura — Iron Mallas 2.0

Proyecto independiente: no comparte base de datos, autenticación, código de negocio ni servicios con
Upzites Flow.

## Stack

| Capa | Elección | Estado |
|------|----------|--------|
| Framework | Next.js 16.4 (App Router, Turbopack, Cache Components) + React 19 + TypeScript estricto | ✅ Fase 1 |
| Estilos | Tailwind CSS v4 con tokens de marca en `src/app/globals.css` | ✅ Fase 1 |
| Iconos | Lucide + SVG propios (WhatsApp, Instagram) | ✅ Fase 1 |
| Validación | Zod (servidor) | ✅ Fase 1 |
| UI admin | shadcn/ui | ⏳ Fase 2 |
| Datos / Auth / Storage | Supabase (Postgres + RLS, Auth, Storage) | ⏳ Fase 2 |
| Email | Resend | ⏳ Fase 2–4 |
| Agenda | Cal.com (embed actual) → webhooks hacia la BD | Embed ✅ · Webhooks ⏳ |
| Hosting | Vercel | ⏳ Fase 4 (requiere aprobación) |

## Estructura

```
src/
├── app/
│   ├── layout.tsx            # Raíz: fuentes, metadatos globales, lang es-CL
│   ├── globals.css           # Tokens de marca, utilidades, animaciones
│   ├── (site)/               # Sitio público (route group, no afecta la URL)
│   │   ├── layout.tsx        # Header, footer, WhatsApp flotante, skip link
│   │   └── page.tsx          # Home + JSON-LD (negocio y FAQ)
│   ├── admin/                # Panel privado — solo placeholder en Fase 1 (noindex)
│   ├── robots.ts / sitemap.ts / opengraph-image.tsx / icon.tsx / apple-icon.tsx
│   └── not-found.tsx
├── components/
│   ├── site/                 # Secciones del sitio (server components + islas cliente)
│   └── ui/                   # Primitivas: botón, encabezado de sección, iconos, rich text
├── content/
│   ├── types.ts              # Modelo de contenido (contrato con el futuro CMS)
│   └── site.ts               # Contenido real recuperado del WordPress
├── features/
│   └── leads/                # Formulario: esquema Zod, Server Action, repositorio, rate limit
└── lib/                      # getSiteContent(), helpers de enlaces, URL canónica
```

### Principios

- **Server Components por defecto.** Solo son cliente: menú móvil, video del hero, contador,
  tarjetas de servicios (acordeón), galería/lightbox, embed de Cal.com y formulario.
- **El contenido no vive en los componentes.** Todo pasa por `getSiteContent()` con los tipos de
  `content/types.ts`. En Fase 2 esa función leerá Supabase (con `"use cache"` + `cacheTag`) y el
  panel invalidará la caché al guardar; los componentes no cambian.
- **Texto sin HTML.** El contenido usa `**negrita**` como único formato, para que el panel pueda
  editarlo sin riesgo de inyección.
- **Integraciones honestas.** El formulario valida en servidor y llama a `saveLead()`. Sin base de
  datos configurada responde `not_configured` y la UI lo dice claramente (con alternativa por
  WhatsApp). Nunca se muestra "éxito" sin persistencia confirmada.

## Plan del panel `/admin` (Fase 2 en adelante)

### Autenticación y roles

- Supabase Auth (email + contraseña o magic link), sesión en cookies httpOnly vía `@supabase/ssr`.
- `src/proxy.ts` (antes `middleware`) refresca la sesión y redirige `/admin/**` a `/admin/login`.
- Verificación de rol **en servidor** en `app/admin/layout.tsx` y en cada Server Action
  (defensa en profundidad; el proxy no es la única barrera).
- Tabla `profiles(id → auth.users, role: 'SUPERADMIN' | 'ADMIN', full_name)`.
- RLS activado en todas las tablas; políticas basadas en `auth.uid()` y el rol del perfil.
  La inserción de leads desde la web se hace solo desde el servidor.

### Rutas previstas

| Ruta | Módulo | Rol | Fase |
|------|--------|-----|------|
| `/admin/login` | Acceso | público | 2 |
| `/admin` | Dashboard (leads nuevos, cotizaciones pendientes, visitas, instalaciones, actividades) | ADMIN+ | 2 |
| `/admin/leads`, `/admin/clientes/[id]` | CRM: ficha, historial, estado comercial, próximo seguimiento | ADMIN+ | 2 |
| `/admin/agenda` | Visitas técnicas e instalaciones (sincronizado con Cal.com) | ADMIN+ | 2 |
| `/admin/contenido/*` | Textos, servicios, proyectos, FAQ, reseñas, promociones, medios | ADMIN+ | 2 |
| `/admin/cotizaciones` | Cotizador, versiones, PDF, envío por WhatsApp/email | ADMIN+ | 3 |
| `/admin/instalaciones` | Ficha técnica, fotos antes/después, garantía, pago | ADMIN+ | 3 |
| `/admin/resenas` | Reseñas reales con autorización de publicación | ADMIN+ | 2–3 |
| `/admin/configuracion` | Usuarios, roles, estados comerciales, tarifario, integraciones | SUPERADMIN | 2–3 |

### Modelo de datos preliminar

```
profiles(id, role, full_name)
pipeline_stages(id, key, label, position, is_terminal, is_lost)   -- configurable
clients(id, first_name, last_name, phone, whatsapp, email, address, commune, geo, notes, created_at)
leads(id, client_id?, service, message, stage_id, source, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term, landing_page, referrer, consent_at, next_follow_up_at, assigned_to,
      created_at)
activities(id, client_id, lead_id?, type[call|whatsapp|email|note|visit], body, created_by, created_at)
appointments(id, client_id, kind[visita|instalacion], starts_at, ends_at, address, assignee,
             status, cal_booking_uid, rescheduled_from)
price_items(id, name, unit, unit_price, active, validated_by, validated_at)      -- Fase 3
quotes(id, client_id, version, status[borrador|enviada|aceptada|rechazada|vencida], net, tax, total,
       valid_until, pdf_path)                                                      -- Fase 3
quote_lines(id, quote_id, price_item_id?, description, width, height, area, qty, unit_price, discount)
installations(id, client_id, quote_id, scheduled_at, technician, specs, status, warranty, payment_status)
media(id, bucket, path, kind, alt, public)
reviews(id, client_id?, display_name, publish_consent, rating, comment, photos, published, featured)
content_blocks(key, data jsonb, updated_by, updated_at)                          -- CMS del sitio
```

Estados comerciales iniciales (editables): Nuevo lead → Contactado → Visita agendada → Cotizado →
En seguimiento → Aprobado → Instalación programada → Instalado → Cerrado, más Perdido/Rechazado.

### Integraciones

- **Cal.com**: webhook `BOOKING_CREATED/RESCHEDULED/CANCELLED` → Route Handler firmado
  (`CAL_WEBHOOK_SECRET`) → `appointments` + vínculo con cliente por email/teléfono.
- **Meta Ads**: UTMs, página de entrada y referrer ya se capturan en el formulario (first-touch en
  `sessionStorage`); `fbclid` se añadirá junto con la tabla `leads`.
  Conversions API se evaluará en Fase 4 con autorización.
- **WhatsApp**: enlaces `wa.me` prellenados hoy; WhatsApp Business API solo con autorización.
- **Resend**: aviso interno de lead nuevo (Fase 2, cuando exista almacenamiento).

## Seguridad aplicada en Fase 1

- Validación Zod en servidor, honeypot, tiempo mínimo de llenado y rate limit por IP (en memoria,
  por instancia — se moverá a BD en Fase 2).
- Consentimiento explícito para el uso de datos del formulario.
- Cabeceras: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS;
  `poweredByHeader` desactivado.
- `robots.txt` bloquea todo salvo en producción (`VERCEL_ENV=production` o `SITE_INDEXABLE=true`);
  `/admin` siempre `noindex`.
- Sin secretos en el repositorio (`.env*` ignorado, solo `.env.example`).
- Pendiente: Content-Security-Policy (requiere listar dominios de Cal.com) y CAPTCHA invisible
  (Cloudflare Turnstile) si aparece spam real.

## Implementación Fase 2A

La especificación previa es una hoja de ruta. El alcance implementado y la configuración vigente
están en [FASE-2A.md](FASE-2A.md). En particular, contacts conserva los datos de contacto,
leads las oportunidades, lead_statuses el flujo comercial y lead_activities el historial.
Los perfiles solo los provisiona un operador confiable. El grupo admin/(private) aplica autorización
junto con los helpers de datos, acciones y RLS; admin/login queda fuera de ese grupo.
El área admin se resuelve por solicitud detrás de Suspense/connection(), sin caché compartida de sesión.
No se añadieron dependencias de componentes UI: se reutilizan Tailwind y los tokens de marca.
