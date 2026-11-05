import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth";
// Pestaña retirada: los controles técnicos viven en Mi cuenta (solo SUPERADMIN).
export default async function RetiredSettingsPage(){await requireAdmin();redirect("/admin/cuenta");}
