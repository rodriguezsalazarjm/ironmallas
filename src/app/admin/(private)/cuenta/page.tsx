import {requireAdmin} from "@/lib/auth";
import {PasswordForm} from "@/features/users/forms";
import {PageHeading,Panel} from "@/features/crm/ui";
export default async function AccountPage(){const {profile}=await requireAdmin();return <><PageHeading title="Mi cuenta" description={`${profile.full_name} · ${profile.role}. La contraseña solo se guarda en Supabase Auth.`}/><Panel title="Establecer contraseña"><PasswordForm/></Panel></>;}
