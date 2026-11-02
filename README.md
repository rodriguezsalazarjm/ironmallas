# Iron Mallas 2.0

Nueva versión de [ironmallas.cl](https://ironmallas.cl): web comercial en Next.js y, en fases
siguientes, plataforma privada de gestión (CRM, agenda, cotizaciones, instalaciones, reseñas y
contenidos).

> **Fase actual: 2A — Base administrativa implementada; activación de Supabase pendiente.** El WordPress de producción sigue intacto; este
> proyecto no modifica WordPress, DNS ni dominio.

## Requisitos

- Node.js 22 o superior (probado con Node 25 / npm 11)
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre <http://localhost:3000>.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint (config de Next.js + TypeScript) |
| `npm run typecheck` | Genera tipos de rutas y ejecuta `tsc --noEmit` |
| `npm run check` | Lint + typecheck + build |

## Variables de entorno

Ver [`.env.example`](.env.example). Las variables de Supabase se describen en `docs/FASE-2A.md`.
Sin Supabase configurado se mantiene WhatsApp. Resend y los webhooks de Cal.com siguen pendientes.

## Dónde está cada cosa

| Necesito… | Archivo |
|-----------|---------|
| Cambiar textos, servicios, FAQ, proyectos, teléfono | [`src/content/site.ts`](src/content/site.ts) |
| Cambiar colores, fuentes, sombras, animaciones | [`src/app/globals.css`](src/app/globals.css) |
| Ver/editar una sección | [`src/components/site/`](src/components/site) |
| Lógica del formulario | [`src/features/leads/`](src/features/leads) |
| Metadatos SEO globales | [`src/app/layout.tsx`](src/app/layout.tsx) |

## Documentación

- [`docs/MIGRACION.md`](docs/MIGRACION.md) — análisis del export de WordPress, recursos, integraciones
  y afirmaciones comerciales por validar.
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — estructura, principios, plan del panel `/admin`,
  modelo de datos y seguridad.

## Estado de integraciones

| Integración | Estado |
|-------------|--------|
| Cal.com (visita técnica) | ✅ Embed funcionando con el mismo enlace que WordPress |
| WhatsApp / Instagram | ✅ Enlaces directos |
| Formulario de cotización | ⚠️ Valida en servidor, pero **no guarda** hasta configurar Supabase (Fase 2). Lo informa al usuario y ofrece WhatsApp. |
| Imágenes y videos | ⚠️ Se sirven desde `ironmallas.cl/wp-content/uploads` (optimizados por `next/image`). Migrar a Supabase Storage. |
| Panel `/admin` | Implementado con login, roles y RLS; requiere configurar Supabase y provisionar perfiles. |

## Material de migración

El export `migration/ironmallas.WordPress.2026-11-02.xml` está excluido de Git (contiene datos de
usuarios de WordPress). Conserva una copia local para consultas.

## Fase 2A — panel y Supabase preparados

La implementación actual añade login, autorización/RLS, bandeja y ficha de oportunidades,
actividades, seguimientos, resumen y configuración de estados. La configuración remota está pendiente.
Ver [docs/FASE-2A.md](docs/FASE-2A.md) para migración, permisos, variables, activación y pruebas.
Las secciones anteriores describen el punto de partida de Fase 1; este apartado refleja el estado actual.

Comprobación adicional: `npm test` ejecuta validación Zod y políticas SQL en PostgreSQL embebido,
sin conectar servicios remotos. No sustituye las pruebas con Supabase real después de configurarlo.
