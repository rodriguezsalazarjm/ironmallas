import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {ContactForm} from "@/features/crm/forms";
import {PageHeading,Panel} from "@/features/crm/ui";
export default async function EditContactPage({params}:PageProps<"/admin/clientes/[id]/editar">){
  const {db}=await requireAdmin(); const {id}=await params;
  if(!z.uuid().safeParse(id).success) notFound();
  const {data,error}=await db.from("contacts").select("*").eq("id",id).maybeSingle();
  if(error) throw new Error("No fue posible cargar el contacto."); if(!data) notFound();
  return <><Link className="mb-4 inline-block text-sm underline" href={`/admin/clientes/${id}`}>← Ficha del contacto</Link><PageHeading title="Editar contacto" description="Los cambios no eliminan las oportunidades ni el historial existente."/><Panel title="Datos del contacto"><ContactForm contact={data}/></Panel></>;
}
