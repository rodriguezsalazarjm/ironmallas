"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import {createServiceClient} from "@/lib/supabase/service";
import {isRateLimited} from "@/features/leads/rate-limit";
import {inviteSchema,profileSchema,passwordSchema} from "./schema";
function origin(){const configured=process.env.AUTH_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;if(!configured)throw new Error("Configura AUTH_SITE_URL");const url=new URL(configured);if(url.protocol!=="https:" && !["localhost","127.0.0.1"].includes(url.hostname))throw new Error("URL inválida");return url.origin;}
async function findUser(email:string){const admin=createServiceClient();for(let page=1;;page++){const result=await admin.auth.admin.listUsers({page,perPage:1000});if(result.error)throw new Error("No se pudo consultar Auth");const user=result.data.users.find(u=>u.email?.toLowerCase()===email);if(user)return user;if(result.data.users.length<1000)return null;}}
export async function inviteAdmin(_:string,form:FormData){
  const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return "Solo SUPERADMIN puede habilitar usuarios.";
  const parsed=inviteSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return "Revisa el nombre, correo y rol.";
  if(form.get("confirm_access")!=="on")return "Confirma que autorizas el acceso administrativo de esta persona.";
  if(isRateLimited(`invite:${profile.id}`))return "Espera unos minutos antes de habilitar más cuentas.";
  const d=parsed.data;let userId:string|null=null;let invitationCreated=false;
  try{
    const service=createServiceClient();const existing=await findUser(d.email);userId=existing?.id ?? null;
    if(userId){const current=await db.from("profiles").select("id").eq("id",userId).maybeSingle();if(current.error)return "No se pudo comprobar el perfil existente.";if(current.data)return "La cuenta ya tiene un perfil. Usa su ficha para modificar el acceso o enviar un enlace.";}
    if(!userId){if(process.env.AUTH_INVITES_CONFIGURED!=="true")return "Las invitaciones requieren configurar la plantilla Auth, URL de retorno y AUTH_INVITES_CONFIGURED=true.";const result=await service.auth.admin.inviteUserByEmail(d.email,{redirectTo:`${origin()}/auth/confirm`});if(result.error || !result.data.user)return "Supabase no aceptó la invitación. Revisa la configuración de Auth y vuelve a intentar.";userId=result.data.user.id;invitationCreated=true;}
    const saved=await db.rpc("manage_profile",{p_user_id:userId,p_full_name:d.full_name,p_role:d.role,p_active:true});
    if(saved.error)return invitationCreated?"Supabase aceptó la invitación, pero no se pudo guardar el perfil. La cuenta NO tiene acceso. Reintenta habilitar el mismo correo; no se borró ningún usuario.":"No se pudo habilitar el perfil. La cuenta permanece sin acceso administrativo.";
    revalidatePath("/admin/usuarios");return invitationCreated?"Perfil habilitado y solicitud de invitación aceptada por Supabase. La entrega depende del correo configurado; la persona debe abrir el enlace y establecer su contraseña.":"Perfil habilitado para la cuenta Auth existente. No se envió correo ni se cambió su contraseña.";
  }catch{return userId && invitationCreated?"La invitación pudo crearse, pero no se confirmó el perfil. Reintenta con el mismo correo; sin perfil activo no hay acceso.":"No fue posible habilitar el acceso. Revisa la configuración de Supabase Auth y la clave de servidor.";}
}
export async function updateProfile(_:string,form:FormData){
  const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return "No tienes permiso para gestionar accesos.";
  const parsed=profileSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return "Revisa el usuario, nombre y rol.";
  if(parsed.data.id===profile.id)return "No puedes modificar tu propio perfil administrativo desde este módulo.";
  const result=await db.rpc("manage_profile",{p_user_id:parsed.data.id,p_full_name:parsed.data.full_name,p_role:parsed.data.role,p_active:form.get("active")==="on"});
  if(result.error)return "No se pudo actualizar. Debe quedar al menos un SUPERADMIN activo y no puedes modificar tu propio acceso.";
  revalidatePath("/admin/usuarios");return "Acceso actualizado. Los permisos se comprueban contra el perfil en cada operación.";
}
export async function sendAccessLink(_:string,form:FormData){
  const {db,profile}=await requireAdmin();if(profile.role!=="SUPERADMIN")return "No tienes permiso para gestionar accesos.";
  const id=z.uuid().safeParse(form.get("id"));if(!id.success)return "Usuario inválido.";
  if(process.env.AUTH_INVITES_CONFIGURED!=="true")return "Configura primero las plantillas de invitación y recuperación de Auth.";
  if(isRateLimited(`access-link:${profile.id}`))return "Espera unos minutos antes de solicitar más enlaces.";
  const target=await db.from("profiles").select("active").eq("id",id.data).single();if(target.error || !target.data.active)return "El usuario no tiene un perfil activo.";
  try{const service=createServiceClient();const result=await service.auth.admin.getUserById(id.data);const user=result.data.user;if(result.error || !user?.email)return "No se pudo consultar el correo de la cuenta.";
    const delivery=user.email_confirmed_at?await db.auth.resetPasswordForEmail(user.email,{redirectTo:`${origin()}/auth/confirm`}):await service.auth.admin.inviteUserByEmail(user.email,{redirectTo:`${origin()}/auth/confirm`});
    if(delivery.error)return "Supabase no aceptó el envío. Revisa los límites y configuración de correo.";
    return "Supabase aceptó la solicitud de enlace. No se confirma la entrega hasta que la persona reciba el correo.";
  }catch{return "No se pudo solicitar el enlace. Revisa Auth y la configuración del servidor.";}
}
export async function setOwnPassword(_:string,form:FormData){
  const {db}=await requireAdmin();const parsed=passwordSchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return "Usa al menos 12 caracteres y confirma la misma contraseña.";
  const result=await db.auth.updateUser({password:parsed.data.password});
  if(result.error)return "No se pudo establecer la contraseña. El enlace puede haber vencido o requerir una sesión reciente. Solicita un nuevo enlace al SUPERADMIN.";
  return "Contraseña actualizada. Ya puedes acceder con tu correo y contraseña.";
}
