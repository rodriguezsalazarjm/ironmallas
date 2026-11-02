import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {ContactForm} from "@/features/crm/forms";
import {PageHeading,Panel} from "@/features/crm/ui";
export default async function NewContactPage(){
  await requireAdmin();
  return <><Link className="mb-4 inline-block text-sm underline" href="/admin/clientes">← Clientes y contactos</Link><PageHeading title="Nuevo contacto" description="Registra los datos reales de la persona. El contacto conserva su identidad en todas sus oportunidades y trabajos."/><Panel title="Datos del contacto"><ContactForm/></Panel></>;
}
