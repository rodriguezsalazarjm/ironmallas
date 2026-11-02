import {loadEnvConfig} from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {z} from "zod";
import type {Database} from "../src/lib/supabase/database.types";
loadEnvConfig(process.cwd());
class BootstrapError extends Error {}
async function main(){
  if(!process.argv.includes("--confirm-development") || process.env.IRONMALLAS_ENV!=="development")throw new BootstrapError("Solo desarrollo autorizado: define IRONMALLAS_ENV=development y usa --confirm-development.");
  const config=z.object({url:z.url(),secret:z.string().min(20),email:z.email().max(120).transform(v=>v.toLowerCase()),name:z.string().trim().min(2).max(120),site:z.url()}).safeParse({url:process.env.NEXT_PUBLIC_SUPABASE_URL,secret:process.env.SUPABASE_SECRET_KEY,email:process.env.BOOTSTRAP_ADMIN_EMAIL,name:process.env.BOOTSTRAP_ADMIN_NAME,site:process.env.AUTH_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL});
  if(!config.success)throw new BootstrapError("Faltan URL/clave de Supabase, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME o AUTH_SITE_URL. No se muestran valores en consola.");
  const d=config.data,origin=new URL(d.site);if(origin.protocol!=="https:" && !["localhost","127.0.0.1"].includes(origin.hostname))throw new BootstrapError("AUTH_SITE_URL debe usar HTTPS fuera de localhost.");
  const db=createClient<Database>(d.url,d.secret,{auth:{persistSession:false,autoRefreshToken:false}});
  let userId:string|null=null;
  for(let page=1;;page++){const found=await db.auth.admin.listUsers({page,perPage:1000});if(found.error)throw new BootstrapError("No se pudo consultar Auth. Comprueba la clave de servidor.");const user=found.data.users.find(u=>u.email?.toLowerCase()===d.email);if(user){userId=user.id;break;}if(found.data.users.length<1000)break;}
  const admins=await db.from("profiles").select("id").eq("role","SUPERADMIN").eq("active",true);
  if(admins.error)throw new BootstrapError("No se pudo consultar profiles. Aplica primero las migraciones en el entorno autorizado.");
  if(userId){const profile=await db.from("profiles").select("role,active").eq("id",userId).maybeSingle();if(profile.error)throw new BootstrapError("No se pudo comprobar el perfil.");if(profile.data?.role==="SUPERADMIN" && profile.data.active){console.log("El SUPERADMIN indicado ya está activo. No se realizaron cambios ni se envió correo.");return;}if(profile.data)throw new BootstrapError("La cuenta ya tiene perfil. Gestiona su acceso desde otro SUPERADMIN; este script no cambia perfiles existentes.");}
  if(admins.data.length)throw new BootstrapError("Ya existe un SUPERADMIN activo. Usa Usuarios autorizados; el bootstrap solo habilita el primero.");
  let invited=false;
  if(!userId){if(process.env.AUTH_INVITES_CONFIGURED!=="true")throw new BootstrapError("Configura la plantilla de invitación y AUTH_INVITES_CONFIGURED=true antes de enviar un correo.");const result=await db.auth.admin.inviteUserByEmail(d.email,{redirectTo:`${origin.origin}/auth/confirm`});if(result.error || !result.data.user)throw new BootstrapError("Supabase no aceptó la invitación. No se creó ningún perfil.");userId=result.data.user.id;invited=true;}
  const saved=await db.rpc("bootstrap_admin_profile",{p_user_id:userId,p_full_name:d.name});
  if(saved.error)throw new BootstrapError(invited?"La invitación pudo crearse, pero no se confirmó el perfil. No hay acceso sin perfil. Repite con el mismo correo después de revisar la base; no se eliminó ningún usuario.":"No se pudo crear el perfil. No se modificó la cuenta existente.");
  console.log(invited?"Primer SUPERADMIN provisionado. Supabase aceptó la solicitud de invitación; verifica la recepción y establece la contraseña desde el enlace.":"Primer SUPERADMIN provisionado para la cuenta existente. No se envió correo ni se cambió su contraseña.");
}
main().catch((error:unknown)=>{console.error(error instanceof BootstrapError?error.message:"No se pudo provisionar el primer administrador.");process.exitCode=1;});
