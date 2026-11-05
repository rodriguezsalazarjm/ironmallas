# Activación real de Supabase — estado y plan de ejecución

Fecha: 2 de noviembre de 2026. Único destino: **kqdcotpfzluxkqdkgyts**, `https://kqdcotpfzluxkqdkgyts.supabase.co`. No se realizaron cambios remotos. Este documento complementa `ACTIVACION-FASE-2A.md` y registra la nueva comprobación posterior al consentimiento OAuth.

## 1. Conexión real observada

| Comprobación | Resultado de esta ejecución | Qué demuestra |
|---|---|---|
| Configuración local `codex mcp list --json` | `ironmallas-readonly`, enabled=true, auth_status=`o_auth` | OAuth está registrado en el cliente local; ya no corresponde describirlo solamente como el intento vencido anterior |
| URL configurada | `https://mcp.supabase.com/mcp?project_ref=kqdcotpfzluxkqdkgyts&read_only=true` | Alcance configurado al cliente exclusivo y modo lectura |
| Disponibilidad en este chat | `list_mcp_resources(server="ironmallas-readonly")`: **unknown MCP server** | El servidor local no está cargado como herramienta en esta sesión |
| Conector Supabase que sí aparece entre las herramientas | `get_project_url`, `list_tables(public,private)`, `list_migrations`, `get_advisors(security)`, todos con el ref exclusivo | Los cuatro devuelven **You do not have permission to perform this action** |
| Acceso alternativo del cliente local | Proxy de control no disponible; inicialización de servidor auxiliar terminó por timeout | No se obtuvo canal de consulta. No se ejecutó un agente, un turno de modelo ni una consulta de base mediante ese auxiliar |

La configuración OAuth del cliente local y la autorización del conector de este chat son superficies diferentes. No se concluye que OAuth haya fallado, que la cuenta carezca de acceso a la base o que la base esté vacía: **el acceso efectivo de este chat sigue sin verificarse**. No se extrajeron tokens del almacén de credenciales, no se intentó eludir rechazos con otras cuentas y no se consultó otro proyecto.

Para continuar, recargar la sesión del cliente y verificar que aparezcan las herramientas del servidor `ironmallas-readonly`; si no aparecen, revisar la integración local de ese servidor en el cliente. No repetir OAuth por defecto: primero comprobar que la sesión con OAuth registrado es la que carga las herramientas. Después consultar el endpoint del proyecto y sus metadatos en lectura. No basta volver a ver `o_auth` en la configuración.

## 2. Inventario: conocido y no conocido

**Tablas encontradas remotamente:** no se obtuvo un resultado autorizado. Por tanto no se ofrece una lista remota ficticia.

El contrato local espera estas 23 tablas públicas:

`profiles`, `contacts`, `lead_statuses`, `leads`, `lead_activities`, `tasks`, `appointments`, `services`, `pricing_rules`, `settings`, `quotes`, `quote_items`, `quote_versions`, `installations`, `installation_photos`, `warranties`, `payments`, `reviews`, `content_entries`, `notifications`, `audit_logs`, `webhook_events`, `privacy_requests`.

Además espera `private.intake_limits`, funciones privadas de autorización/transacciones y los buckets `admin-documents` y `public-media`. Esto describe exclusivamente las migraciones del repositorio y las pruebas PGlite.

| Área remota | Estado | Lectura requerida para resolver |
|---|---|---|
| Tablas/columnas/constraints/índices | No verificado | Catálogos del proyecto, sin registros de clientes |
| Historial de migraciones | No verificado | `list_migrations`; contrastar contenido y objetos, no solo nombre/versiones |
| RPC y triggers | No verificado | Firmas, resultados, grants, SECURITY DEFINER, search_path y definiciones de los objetos de Iron Mallas |
| RLS y permisos | No verificado | RLS en cada tabla, policies y grants por tabla/columna; permisos EXECUTE de funciones |
| Auth | No verificado | Configuración de signup/anónimos/proveedores, URLs, plantillas/SMTP y sesiones; no exportar identidades/secretos |
| Storage | No verificado | Buckets esperados, privacidad/límites/MIME y políticas de objetos; no descargar archivos reales |
| Advisors de seguridad/rendimiento | No verificado | Herramientas de advisors y enlaces de remediación, en lectura |
| Tipos generados del remoto | No disponible | Generar a archivo temporal y comparar con `src/lib/supabase/database.types.ts` cuando haya acceso |

`scripts/audit-supabase-readonly.sql` ya prepara las lecturas de metadatos y se validó anteriormente contra las migraciones locales. No debe presentarse como inventario del remoto hasta ejecutarlo allí.

## 3. Migraciones locales y clasificación pendiente

| Orden | Migración | Dependencias | Clasificación remota |
|---|---|---|---|
| 1 | `20261102201241_fase_2a_crm.sql` | Auth/Storage Supabase y roles de plataforma; revisión de objetos previos | **No verificable**, no se clasifica como ausente/aplicada/parcial sin inventario |
| 2 | `20261102203714_complete_platform.sql` | Estructura exacta de 1, incluyendo constraints y nombres esperados | **No verificable** |
| 3 | `20261102213759_installation_concurrency.sql` | Tabla installations, trigger touch_updated y RPC de estado de 2 | Preparación local de continuidad; estado remoto actual **no verificable** |

La tercera migración existe aunque el pedido enumere solo las dos originales. Es necesaria para `set_installation_status_checked` usada por el código actual. No se modificaron los SQL en esta ejecución.

SHA-256 de los archivos revisados:

```text
20261102201241_fase_2a_crm.sql
8E0B1E2D6AD5A52F28989BB9448B92E4B357A63AC0034D5F96D134CFAA8D60FF
20261102203714_complete_platform.sql
AB85FE8C95B5BB510335FA76C545DFDE3601CD0FDFBEB290AC6F811FF623E3FF
20261102213759_installation_concurrency.sql
00A24953B66300315BB2FDEA8643BCB33A6980FE69685054BFC33CC3D42961E5
```

## 4. Plan concreto de migración, condicionado al inventario

**No es todavía un plan validado contra la base remota. No se solicita aprobación de aplicación a ciegas.** Tras obtener lecturas, documentar qué rama de esta decisión corresponde y entregar la lista exacta a autorizar:

1. **Proyecto y preflight:** confirmar el ref/URL y revisar historial, todos los objetos de Iron Mallas, roles y buckets. No confundir un esquema public vacío con ausencia de objetos en private/storage ni con un proyecto sin datos.
2. **Si no hay objetos del contrato ni historial:** proponer aplicar 1→2→3. Antes comprobar que no existan funciones/esquema private o bucket `admin-documents` que entren en conflicto. La primera migración crea tablas/funciones sin IF NOT EXISTS y hace INSERT del bucket privado sin ON CONFLICT; requiere preflight real.
3. **Si 1 está aplicada y coincide:** comprobar tipos/constraints/grants/RLS/bucket de 1 y precondiciones para ALTER de 2; proponer 2→3 solo si no hay objetos operativos previos incompatibles.
4. **Si 1 y 2 coinciden:** proponer exclusivamente 3, tras verificar que no exista ya su función/trigger modificado. El DROP TRIGGER de 3 espera el nombre `touch_updated` y su dependencia de 2.
5. **Si las tres coinciden:** no volver a aplicarlas; pasar a configuración y pruebas. Comparar también funciones/grants/policies, no asumir igualdad por versiones.
6. **Si existen objetos parciales, divergentes o sin historial:** detener la aplicación de las originales. Preparar una migración de reconciliación nueva, revisable y compatible; conservar datos, identificar restricciones incumplidas y dependencias. No borrar tablas, sobrescribir clientes, reemplazar un private ajeno ni inventar registros del historial para aparentar aplicación.
7. **Autorización:** presentar archivos/checksums o diff nuevo, efectos por objeto, riesgo y recuperación de la rama elegida. Obtener autorización expresa del propietario antes de aplicar migraciones, cambiar Auth/Storage o provisionar perfiles/cuentas.
8. **Aplicación autorizada posterior:** una migración revisada por vez, con historial registrado por la herramienta correspondiente; comprobar resultado antes de continuar. Los archivos locales usan transacción. No saltar errores ni completar manualmente una parte sin registrarla.
9. **Verificación posterior:** inventario y advisors otra vez; RLS/grants/RPC/buckets, tipos generados temporales y diferencia TypeScript. Ejecutar tests locales/HTTP y después A–E reales. No desplegar este código sobre un esquema que carezca de la RPC nueva.

Conflictos concretos a revisar: unicidad de contactos existentes con teléfono normalizado/NULL, estados comerciales y sus referencias, constraints cuyos nombres usa ALTER de 2, identidad/secuencias de cotizaciones/auditoría, permisos heredados de PUBLIC, buckets existentes con diferente privacidad/MIME y funciones definer con firmas/precondiciones distintas. El avance de estados/siembras de 2 puede alterar semántica de oportunidades previas; requiere inspección antes de aplicar.

**Recuperación:** antes de ejecutar, verificar un respaldo restaurable apropiado del entorno y permisos de recuperación; inventario/definiciones previas con almacenamiento seguro. Si una migración falla, detenerse y comprobar rollback e historial antes de reintentar. Si una migración ya confirmó cambios, no ejecutar un down destructivo: corregir hacia delante o restaurar respaldo bajo autorización y evaluación de registros posteriores. Auth y archivos de Storage requieren su propia estrategia; un backup SQL de public no los garantiza. No utilizar `db reset`, DROP de negocio ni limpieza global como recuperación.

## 5. Correcciones locales y configuración

Las correcciones anteriores siguen presentes: reseñas 100/3000, motivo de privacidad 3000, origen 3000 y concurrencia de programación/ficha/estado de instalación con precisión de microsegundos. Agenda unificada sigue como propuesta en `ACTIVACION-FASE-2A.md`; su implementación depende de inventariar datos y definir duración de trabajos, por lo que no se introduce una funcionalidad nueva aquí.

Hallazgo adicional corregido en esta ejecución: la configuración de la aplicación admitía cualquier URL recibida del entorno y el bootstrap tampoco fijaba el proyecto. `src/lib/supabase/config.ts` ahora acepta únicamente el origen exclusivo HTTPS (con o sin barra final), rechaza otras URLs y credenciales públicas vacías y devuelve no configurado sin crear cliente. Esto protege clientes browser/SSR/service y captación que dependen de ese helper. `scripts/bootstrap-admin.ts` aplica la misma comprobación antes de crear el cliente privilegiado.

`.env.example` declara ahora la URL exclusiva, sin claves. Los dos nuevos tests en `tests/supabase-config.test.ts` verifican URLs válidas, dominios parecidos, HTTP, usuario/contraseña, rutas/queries, claves ausentes, y ejecutan el bootstrap con un host ajeno para comprobar rechazo sin revelar los valores sintéticos.

Estado local observado: `.env.local` ausente y ninguna de las variables URL/clave pública/secret/intake/orígenes presente en el proceso de auditoría. **La app aún no está configurada contra Supabase real**. Registrar OAuth no provisiona las claves de la aplicación.

Preparar en `.env.local` ignorado por Git o en el entorno seguro aprobado:

- `NEXT_PUBLIC_SUPABASE_URL`: URL exclusiva; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable del mismo proyecto.
- `SUPABASE_SECRET_KEY`: solo servidor, necesaria para intake y operaciones privilegiadas autorizadas; nunca NEXT_PUBLIC ni logs. OAuth MCP no sustituye esta credencial de ejecución.
- `LEAD_RATE_LIMIT_SECRET`: aleatorio, al menos 32 caracteres.
- `NEXT_PUBLIC_SITE_URL` y `AUTH_SITE_URL`: `http://localhost:3000`; preview Vercel después usará su origen HTTPS exacto, con secretos separados por entorno y Auth redirects autorizados.
- `AUTH_INVITES_CONFIGURED=true` solo tras revisar plantillas/SMTP/redirects. No habilitarlo por presunción.
- Identidad de primer administrador: nombre/correo real pendientes de confirmación; solicitarlos mediante entrada del usuario cuando el esquema y la provisión estén listos para aprobar. No inventar cuentas. Bootstrap solo en desarrollo autorizado; no ejecutar automáticamente.

No se obtuvieron ni imprimieron claves, no se creó `.env.local` con valores supuestos y no se configuró Vercel en esta tarea.

## 6. Auth, Storage y pruebas reales

Auth: código de login/SSR/perfiles y plantillas documentado; configuración remota, login real y sesiones **no verificados**. Revisar bloqueo de registro público/anónimos, Site URL/redirects, plantillas TokenHash y SMTP antes de invitar. SUPERADMIN y ADMIN deben corresponder a identidades autorizadas y perfil activo; no se creó ninguna cuenta.

Storage: buckets/políticas están preparados en SQL; existencia y privacidad remotas **no verificadas**. No se subió ni descargó archivo alguno en el proyecto.

| Prueba real solicitada | Estado de esta ejecución | Criterio para habilitar |
|---|---|---|
| A — login y rutas protegidas | No ejecutada | Esquema contrastado/aprobado, Auth configurado, administrador autorizado y app configurada |
| B — lead persistido/contacto/UTM/duplicados | No ejecutada | A y secretos de intake; dataset sintético autorizado |
| C — actividad/estado/seguimiento/historial/RLS | No ejecutada | B, sesiones ADMIN/SUPERADMIN y casos negativos autorizados |
| D — dashboard | No ejecutada | Comparar métricas con el registro de fixtures creado por B/C |
| E — anónimo/inactivo/sin perfil/no escalado/advisors | No ejecutada remotamente | Acceso efectivo y cuentas/casos autorizados; pruebas locales no sustituyen esta |
| Cotización/PDF | Solo tests locales | Configuración y tarifas/condiciones aprobadas para emitir un presupuesto real |

Para futura limpieza, registrar UUIDs de cada fixture creado en un manifiesto privado de pruebas (incluidas tareas, actividades, oportunidades, notificaciones y auditoría vinculadas). Inventariar FKs y auditar la limpieza antes de ejecutar. Limpiar solo esos IDs y únicamente bajo el alcance autorizado; no borrar por nombre genérico, rango de fechas, correo parecido ni TRUNCATE. Las políticas no conceden DELETE comercial a ADMIN; no relajar RLS para facilitar la limpieza. Si hay obligación de conservar auditoría, acordar conservarla marcada como prueba antes de usar un rol privilegiado.

## 7. Verificaciones de esta ejecución

- `npm test`: **33 casos, 29 aprobados, 4 HTTP omitidos, 0 fallos**. Incluye dos regresiones nuevas de destino exclusivo y todas las anteriores.
- `npm run check`: **aprobado, exit 0**; lint, tipos y build completos, 41 páginas generadas.
- `npm run test:http`: **4 aprobadas, 0 omitidas, 0 fallos**, después del build de esta tarea; servidor aislado cerrado al terminar. Total entre suites: 29 locales + 4 HTTP = **33 aprobadas**.
- `git diff --check`: aprobado.
- No se regeneraron tipos desde el remoto por falta de acceso; el contrato manual permanece identificado como tal.

## 8. Aprobaciones y siguiente tarea exacta

**No hay todavía una propuesta de migración remota validada para aprobar.** No se cambió recurso remoto alguno. Lo siguiente es habilitar en esta sesión las herramientas del MCP ya autenticado y ejecutar el inventario de lectura del paso 1. Con esos resultados, clasificar las tres migraciones, cerrar el diff y solicitar autorización expresa de ese conjunto exacto.

Después se pedirán la identidad del primer SUPERADMIN y las autorizaciones específicas para configurar Auth/provisionar y ejecutar fixtures reales. La preparación local no equivale a cierre de Fase 2A: el objetivo operacional sigue pendiente hasta pasar A–E contra Supabase real.

No hubo commits, pushes, despliegues, cambios DNS, WordPress ni Google Reviews. Se conservaron los cambios y archivos sin seguimiento existentes.
