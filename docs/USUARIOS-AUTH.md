# Usuarios autorizados y primer administrador

## Preparación de Auth (operador técnico, solo entorno autorizado)

1. Aplicar las migraciones y configurar URL, clave pública y clave secret solo servidor.
2. Desactivar registro público y usuarios anónimos en Supabase Auth. No existe registro de administradores en la aplicación.
3. Configurar `AUTH_SITE_URL` con el origen exacto de este entorno. HTTPS obligatorio fuera de localhost. Nunca usar el dominio de producción para pruebas.
4. En Supabase Auth agregar la URL autorizada de retorno. Configurar las plantillas **Invite user** y **Reset password** para verificar OTP en servidor:

   Invitación:
   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Aceptar invitación a Iron Mallas</a>
   ```

   Recuperación:
   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Restablecer acceso a Iron Mallas</a>
   ```

   La aplicación proporciona `AUTH_SITE_URL/auth/confirm` como RedirectTo. No concatenar una segunda ruta. Las plantillas deben usar TokenHash: `inviteUserByEmail` no admite PKCE y no se depende de tokens en el fragmento del navegador.
5. Configurar el envío de Auth/SMTP y sus límites. El correo de Auth es independiente de las notificaciones comerciales de Resend.
6. Después de validar estas opciones, definir `AUTH_INVITES_CONFIGURED=true`. El código impide solicitar invitaciones nuevas sin esa confirmación técnica.

## Primer SUPERADMIN

El script solo está habilitado para desarrollo y no debe ejecutarse contra producción. Usa Node 22 o superior y un `.env.local` excluido de Git. Configura mediante un canal seguro:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `AUTH_SITE_URL`
- `AUTH_INVITES_CONFIGURED=true` (solo si el correo está preparado)
- `IRONMALLAS_ENV=development`
- `BOOTSTRAP_ADMIN_EMAIL`: correo real del administrador autorizado.
- `BOOTSTRAP_ADMIN_NAME`: nombre real.

Ejecuta:

```powershell
npx tsx scripts/bootstrap-admin.ts --confirm-development
```

No se reciben contraseñas en argumentos, no se generan contraseñas para imprimir ni se muestran claves/correos en consola. El script busca el correo en Auth; si ya tiene SUPERADMIN activo, no modifica nada. Si ya tiene otro perfil, se detiene. Si existe otro SUPERADMIN activo, se detiene y remite al panel.

Para una cuenta Auth nueva solicita una invitación. Para una cuenta existente conserva su contraseña y no envía correo. El perfil se provisiona mediante una función transaccional reservada a service_role, que bloquea carreras entre dos bootstrap y solo permite el primer administrador.

Si Auth aceptó una invitación pero falla la creación del perfil, la cuenta permanece sin acceso administrativo. No se elimina automáticamente ningún usuario. Repetir el mismo correo permite recuperar el proceso tras corregir la base; se informa del estado parcial sin mostrar éxito ficticio.

## Gestión por Álvaro

Con SUPERADMIN activo, abre **Usuarios autorizados**:

- **Habilitar acceso**: nombre, correo, rol y confirmación explícita. ADMIN opera el negocio; SUPERADMIN gestiona también permisos y configuración.
- Si el correo ya existe en Auth y no tiene perfil, se puede habilitar sin cambiar su contraseña.
- Si ya tiene perfil, usa su tarjeta. Cambiar nombre, rol o acceso activo se valida por RPC y queda auditado.
- No se puede modificar el propio perfil desde este módulo. La base también impide dejar el sistema sin un SUPERADMIN activo.
- **Solicitar enlace de acceso** pide a Supabase una invitación o un correo de recuperación según el estado de la cuenta. Solo se confirma que Auth aceptó la solicitud, no la entrega del correo.
- Desactivar un perfil bloquea las próximas lecturas/escrituras protegidas aunque aún exista un JWT. No borra su historial.

La persona invitada abre el enlace, el servidor verifica el token, consulta su perfil y abre **Mi cuenta** para establecer una contraseña de al menos 12 caracteres. Un enlace inválido/vencido remite al login con explicación. Mi cuenta solo actualiza la contraseña del usuario autenticado; nunca su rol.

## Comprobaciones

`tests/users.test.ts` prueba validación de identidad, roles permitidos y contraseñas. Las pruebas SQL del esquema validan permisos y gestión de perfiles. El envío de invitaciones, verificación de enlaces y login real requieren Supabase Auth configurado; no se han declarado aprobados con mocks ni se ejecutaron invitaciones sin credenciales/autorización del entorno.

Referencias oficiales consultadas:
- https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
