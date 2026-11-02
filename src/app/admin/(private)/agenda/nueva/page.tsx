import Link from "next/link";
import {AppointmentForm} from "@/features/appointments/forms";
import {appointmentOptions} from "@/features/appointments/data";
import {PageHeading,Panel,secondaryClass} from "@/features/crm/ui";
export default async function NewAppointmentPage({searchParams}:PageProps<"/admin/agenda/nueva">){
  const options=await appointmentOptions(); const query=await searchParams;
  return <><Link href="/admin/agenda" className="mb-4 inline-block text-sm underline">← Agenda</Link><PageHeading title="Nueva cita" description="Coordina una visita, evaluación o instalación. Las horas se registran en la zona de Santiago."><Link className={secondaryClass} href="/admin/clientes/nuevo">Nuevo contacto</Link></PageHeading><Panel title="Datos de la cita"><AppointmentForm {...options} contactId={typeof query.contact==="string"?query.contact:undefined}/></Panel></>;
}
