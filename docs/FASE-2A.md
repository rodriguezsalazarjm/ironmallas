# Fase 2A — implementación y activación

## Auditoría inicial

Se revisaron README, ARQUITECTURA, MIGRACION, las rutas y componentes de src,
el esquema Zod, Server Action, repositorio y rate limiter del formulario, dependencias y Git.
La aplicación existente usa Next 16.4.4, React 19.3 y Cache Components. No se reescribió la web.
No había commits ni archivos .env con credenciales. Se revisó el índice y se creó fe19c83.
El XML de migration, node_modules, .next y secretos no se incluyeron.

## Implementado

- Clientes Supabase browser/servidor tipados, sesión SSR y refresco mediante src/proxy.ts.
- Login email/contraseña, logout y autorización por profiles activo con getUser().
- Cada acceso a datos y acción valida el usuario en servidor; RLS aplica también al acceso directo.
- /admin: métricas reales mediante COUNT exacto, seguimientos y actividades recientes.
- /admin/leads: bandeja paginada de 30 solicitudes.
- /admin/leads/[id]: contacto, solicitud, UTMs, consentimiento e historial (últimas 100 actividades).
- Registro transaccional de nota, estado y próximo seguimiento. Fechas mostradas en America/Santiago;
  el editor de seguimiento indica explícitamente UTC para evitar ambigüedades entre dispositivos.
- /admin/clientes: contactos marcados como clientes (hasta 100); conversión a trabajo aún no implementada.
- /admin/configuracion: nombre, orden, activo y final de estados; escritura solo SUPERADMIN.
- Estados vacíos, errores genéricos y navegación responsive. Sin métricas simuladas.
- Formulario público: preserva Zod, honeypot, tiempo mínimo, UTMs y consentimiento. Persistencia
  transaccional con clave privada solo servidor. Éxito solo al recibir el UUID del registro guardado.
- Límite compartido de 5 envíos/10 minutos por HMAC de IP en PostgreSQL; limpieza de entradas antiguas
  al recibir solicitudes. La IP no se almacena. Se mantiene el limitador en memoria como primera barrera.
- Storage: bucket privado admin-documents, lectura solo administradores activos, sin subida pública.
  No se migraron los medios de WordPress ni se añadieron módulos de fotografías/documentos.

## Modelo y permisos

Migración: supabase/migrations/20261102201241_fase_2a_crm.sql.

contacts conserva identidad/contacto, dirección, comuna e is_client; leads conserva la oportunidad,
servicio, mensaje, estado, atribución, consentimiento y fechas. Al convertir una oportunidad en trabajo,
se reutilizará contact_id. La captura pública reutiliza contactos solo por coincidencia exacta de email
normalizado + teléfono en dígitos; no sobrescribe datos previos. Coincidencias ambiguas requieren
revisión manual futura para evitar mezclar personas. Una misma persona puede tener varias oportunidades.
No se crean cotizaciones, visitas, instalaciones ni automatizaciones en esta fase.

profiles referencia auth.users. No hay trigger que conceda roles, registro público ni escrituras de
profiles desde anon/authenticated (tampoco SUPERADMIN puede autoeditarse desde la API).
Un operador de confianza provisiona y desactiva perfiles. private.is_admin tiene SECURITY DEFINER,
search_path vacío, revisa auth.uid() y solo sirve como lookup interno para evitar recursión de RLS.
Las operaciones comerciales son SECURITY INVOKER. Los roles no dependen de user_metadata ni de JWT
con roles potencialmente obsoletos. ADMIN no cambia estados configurables; SUPERADMIN sí.
No se conceden DELETE en las tablas comerciales. Las actividades son append-only.
El estado inicial new no puede desactivarse, hacerse final ni cambiar de clave desde la API.

## Configuración pendiente (no realizada)

1. Elegir un proyecto Supabase de desarrollo autorizado. No se creó ni modificó ningún proyecto remoto.
2. Revisar y aplicar la migración únicamente en ese entorno, previa autorización explícita.
3. En Supabase Auth desactivar Allow new users to sign up, proveedores anónimos y los proveedores no usados.
   No basta con ocultar el formulario de registro. Mantener las protecciones/rate limits de Auth habilitadas.
4. Crear por canal administrativo la cuenta de Álvaro y provisionar su perfil con su UUID real:

   ```sql
   -- Sustituir el UUID y el nombre; ejecutar como operador confiable en el entorno autorizado.
   insert into public.profiles (id, full_name, role, active)
   values ('UUID_REAL_DE_AUTH_USERS', 'NOMBRE_REAL', 'SUPERADMIN', true);
   ```

   No ejecutar este ejemplo sin sustituir los valores. No distribuir contraseñas por el repositorio.
5. Copiar .env.example a .env.local y configurar:
   - NEXT_PUBLIC_SUPABASE_URL: URL del proyecto.
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: clave pública publishable.
   - SUPABASE_SECRET_KEY: clave secret de servidor (nunca NEXT_PUBLIC_).
   - LEAD_RATE_LIMIT_SECRET: secreto aleatorio de al menos 32 caracteres, solo servidor.
6. Configurar URL del sitio en Auth para el entorno local/staging; no se usa magic link/OAuth en esta fase.
7. Servir siempre por HTTPS fuera de localhost. El proxy/hosting debe reemplazar cabeceras de IP
   suministradas por clientes para que el rate limit no dependa de x-forwarded-for manipulable.
8. Tras aplicar: regenerar database.types.ts con Supabase CLI y verificar diferencias con el contrato manual.
   Ejecutar advisors en el proyecto autorizado y probar con cuentas ADMIN, SUPERADMIN, desactivada y sin perfil.

Sin URL/clave pública el login muestra configuración pendiente y las rutas privadas redirigen al acceso.
Sin secreto de servidor y secreto de rate limit, el formulario conserva WhatsApp y no afirma haber guardado.
Una configuración incompleta o una migración no aplicada devuelve error seguro, nunca éxito ficticio.

## Verificación y límites

- npm test: Zod y migración completa en PostgreSQL embebido PGlite, sin datos reales ni conexión remota.
  Comprueba RLS, roles, perfil inactivo, no autoescalado, contacto reutilizado, rate limit y actividades.
  auth.users, auth.uid(), roles y storage se simulan en el entorno de prueba; no sustituye Supabase Auth real.
- npm run lint, npm run typecheck y npm run build: correctos.
- Navegador local: /admin/leads redirige a /admin/login sin configuración; acceso deshabilitado con aviso.
  Web pública y calendario Cal.com renderizan; envío con datos sintéticos devuelve unavailable + WhatsApp.
  Prueba móvil: formulario sin desbordamiento horizontal (375px de ancho de documento).
- Pendiente: login real, renovación/expiración de cookies, permisos de Storage y persistencia mediante
  PostgREST del proyecto autorizado. No se simula éxito remoto ni se declara validación end-to-end completa.
- npm audit --omit=dev: sin vulnerabilidades de producción al verificar. npm install reporta
  16 vulnerabilidades moderadas en herramientas de desarrollo; no se ejecutó audit fix --force.

Referencias oficiales consultadas:
- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/database/postgres/row-level-security
- Guías instaladas de Next.js: authentication-with-cache-components.md y proxy.md.

Siguiente paso: activar y validar en Supabase de desarrollo, con autorización para aplicar la migración.
Producción, WordPress, DNS y servicios pagados permanecen sin cambios.

## Archivos de esta entrega

- `.env.example`, `.gitignore`, `package.json`, `package-lock.json`.
- `src/lib/supabase/{config,browser,server,database.types}.ts`, `src/lib/auth.ts`, `src/proxy.ts`.
- `src/app/admin/layout.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/error.tsx`.
- `src/app/admin/(private)/layout.tsx`, `page.tsx`, `leads/page.tsx`, `leads/[id]/page.tsx`,
  `clientes/page.tsx`, `configuracion/page.tsx`. El antiguo admin/page.tsx se reemplazó por el grupo privado.
- `src/components/admin/forms.tsx`, `src/features/admin/{actions,data}.ts`.
- `src/features/leads/{actions,repository}.ts`; el esquema y los componentes públicos no cambiaron.
- `supabase/migrations/20261102201241_fase_2a_crm.sql`.
- `tests/security.test.ts`, `tests/routes.test.ts`.
- `README.md`, `docs/ARQUITECTURA.md`, `docs/FASE-2A.md`.

Resultado final: 4 pruebas aprobadas con TEST_BASE_URL=http://localhost:3100. Para repetir todas,
arrancar el build sin variables de Supabase y ejecutar en otra consola PowerShell:

```powershell
$env:TEST_BASE_URL='http://localhost:3100'
npm test
```

Sin TEST_BASE_URL se ejecutan las 2 pruebas Zod/SQL y las 2 HTTP quedan explícitamente omitidas.
La prueba SQL usa solo datos sintéticos en memoria y cierra la base al terminar.
`git diff --check` pasó. No hubo cambios en src/components/site, src/content ni src/app/(site).
Los cambios de Fase 2A quedan sin commit para revisión; el commit inicial de Fase 1 es fe19c83.
