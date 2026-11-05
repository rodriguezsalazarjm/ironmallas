import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth";
// El contenido web se mantiene en el código (src/content/site.ts). Ruta retirada del panel.
export default async function RetiredContentPage(){await requireAdmin();redirect("/admin");}
