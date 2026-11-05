# Iron Mallas 2.0

Aplicación independiente: web comercial y panel administrativo privado para operar contactos,
oportunidades, agenda, cotizaciones, instalaciones, pagos, garantías y contenido.
WordPress y el dominio ironmallas.cl no se modifican desde este repositorio.

## Estado real

El software y las migraciones están implementados con pruebas locales. La activación del backend
está pendiente del acceso autorizado al proyecto Supabase indicado por el propietario.
Las pruebas PGlite usan PostgreSQL embebido con Auth/Storage de prueba: no equivalen a una prueba
real de Supabase Auth, Storage, Cal.com o Resend. Consulta docs/ENTREGA-FINAL.md.
No hay tarifas ni testimonios de ejemplo en la base de producción/desarrollo remoto.

## Requisitos e instalación

- Node.js 22 o superior (build local verificado con Node 25; CI y Vercel configurados en 22).
- npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --port 3000
```

Abrir http://localhost:3000. Sin Supabase configurado, el sitio público conserva su contenido original,
el acceso al panel informa configuración pendiente y el formulario ofrece WhatsApp sin afirmar guardado.

## Comprobaciones

```powershell
npm test
npm run check
npm run test:http
```

- test: reglas monetarias, PDF/token, validación, fechas Chile y SQL/RLS en PostgreSQL embebido.
- check: ESLint, tipos de rutas/TypeScript y build de producción.
- test:http: arranca temporalmente el build, fuerza Supabase sin configurar y comprueba rutas/headers.
  Cierra su proceso al finalizar. Requiere ejecutar build antes.
- bootstrap:admin -- --confirm-development: provisionamiento controlado del primer SUPERADMIN;
  leer docs/USUARIOS-AUTH.md antes de ejecutarlo.
- media:migrate: inventario dry-run; descargas/uploads requieren flags explícitos, ver docs/MEDIA-MIGRATION.md.

## Panel

/admin, /admin/leads, /admin/clientes, /admin/agenda, /admin/cotizaciones,
/admin/instalaciones, /admin/pagos, /admin/resenas, /admin/contenido,
/admin/tarifario, /admin/notificaciones, /admin/privacidad, /admin/usuarios y /admin/configuracion.

Roles validados en servidor y RLS: ADMIN opera el negocio; SUPERADMIN administra acceso,
tarifas/condiciones, preferencias y política de privacidad. No hay registro público de administradores.

## Documentación

- docs/ENTREGA-FINAL.md: estado de entrega, verificaciones y pendientes.
- docs/ARQUITECTURA.md: arquitectura y modelo de datos vigentes.
- docs/CONFIGURACION.md: variables, instalación y activación segura de Supabase.
- docs/DESPLIEGUE.md: GitHub, preview Vercel y salida a producción.
- docs/INTEGRACIONES.md: webhooks Cal.com y correo Resend.
- docs/MANUAL-ALVARO.md: uso cotidiano del panel.
- docs/CRM-AGENDA.md, docs/COTIZACIONES.md, docs/DASHBOARD.md, docs/USUARIOS-AUTH.md.
- docs/MEDIA-MIGRATION.md: respaldo y migración independiente de medios.
- docs/MIGRACION.md: origen del WordPress y afirmaciones comerciales por validar.
- docs/FASE-2A.md: registro histórico de la base inicial.

## Datos y secretos

.env.local, backups, exportaciones XML, archivos de clientes y .vercel no se versionan.
No copiar secretos en issues, PRs o logs. Solo las claves publishable llevan NEXT_PUBLIC_.
Los archivos técnicos de instalaciones son privados. Publicar testimonios/fotos requiere consentimiento.
La política de privacidad se entrega como borrador privado sujeto a validación legal/comercial.
