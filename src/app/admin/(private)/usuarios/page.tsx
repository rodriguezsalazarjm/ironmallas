import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {InviteAdminForm,ProfileForm,AccessLinkForm} from "@/features/users/forms";
import {PageHeading,Panel,secondaryClass} from "@/features/crm/ui";
export default async function UsersPage(){const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return <><PageHeading title="Usuarios autorizados" description="Solo SUPERADMIN puede administrar accesos."/><Link className={secondaryClass} href="/admin">Volver al inicio</Link></>;
  const result=await db.from("profiles").select("*").order("created_at");if(result.error)throw new Error("No se pudieron cargar los usuarios.");
  return <><PageHeading title="Usuarios autorizados" description="Habilita personas de confianza y asigna permisos. Desactivar un perfil bloquea sus próximas operaciones sin eliminar sus registros."/><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><Panel title="Habilitar una persona"><InviteAdminForm/><p className="mt-4 text-xs text-ink-soft">Si el correo ya existe en Auth, se habilita su perfil sin modificar la contraseña. Las cuentas nuevas reciben una invitación cuando Auth está configurado.</p></Panel><Panel title="Accesos registrados"><div className="grid gap-4 md:grid-cols-2">{result.data.map(p=><article className="rounded-xl border border-line p-4" key={p.id}><p className="mb-3 break-all text-xs text-ink-soft">{p.id}{p.id===profile.id?" · Tu cuenta":""}</p><ProfileForm profile={p} self={p.id===profile.id}/>{p.active && <AccessLinkForm id={p.id}/>}</article>)}</div></Panel></div></>;
}
