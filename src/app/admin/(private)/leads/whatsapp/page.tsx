import {requireAdmin} from "@/lib/auth";
import {siteContent} from "@/content/site";
import {WhatsappLeadForm} from "@/features/leads/whatsapp-form";
import {PageHeading,Panel} from "@/features/crm/ui";
export default async function WhatsappLeadPage(){
  const {db}=await requireAdmin();
  const statuses=await db.from("lead_statuses").select("id,name,key").eq("active",true).order("position");
  if(statuses.error)throw new Error("No se pudo cargar el formulario.");
  return <><PageHeading title="Nuevo lead desde WhatsApp" description="Registra en segundos a quien te escribió. Queda en Comercial → Oportunidades con su fuente y próxima acción."/><div className="max-w-2xl"><Panel title="Datos del contacto"><WhatsappLeadForm services={siteContent.quoteForm.serviceOptions} statuses={statuses.data}/></Panel></div></>;
}
