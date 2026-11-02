import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {siteContent} from "@/content/site";
import {ManualLeadForm} from "@/features/crm/forms";
import {PageHeading,Panel,secondaryClass} from "@/features/crm/ui";
export default async function NewLeadPage({searchParams}:PageProps<"/admin/leads/nuevo">){
  const {db}=await requireAdmin(); const query=await searchParams;
  const [contacts,profiles]=await Promise.all([db.from("contacts").select("*").order("name").limit(500),db.from("profiles").select("id,full_name").eq("active",true).order("full_name")]);
  if(contacts.error || profiles.error) throw new Error("No se pudo cargar el formulario.");
  return <><PageHeading title="Nueva oportunidad" description="Asocia la solicitud a un contacto existente para conservar su historial."><Link className={secondaryClass} href="/admin/clientes/nuevo">Nuevo contacto</Link></PageHeading><Panel title="Solicitud"><ManualLeadForm contacts={contacts.data} profiles={profiles.data} services={siteContent.quoteForm.serviceOptions} contactId={typeof query.contact==="string" ? query.contact : undefined}/></Panel></>;
}
