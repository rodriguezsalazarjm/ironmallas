import Link from "next/link";
import {AppointmentForm} from "@/features/appointments/forms";
import {appointmentOptions} from "@/features/appointments/data";
import {PageHeading,Panel,secondaryClass} from "@/features/crm/ui";
export default async function NewAppointmentPage({searchParams}:PageProps<"/admin/agenda/nueva">){
  const options=await appointmentOptions(); const query=await searchParams;
  // Prefill only the start chosen in the calendar; the end is set by the operator (no invented duration).
  const start=typeof query.start==="string"&&/^20\d\d-\d\d-\d\dT\d\d:\d\d$/.test(query.start)?query.start:undefined;
  return <><Link href="/admin/agenda" className="mb-4 inline-block text-sm underline">← Agenda</Link><PageHeading title="Nueva visita técnica" description="Coordina una visita o evaluación. Las instalaciones se programan desde su cotización aceptada. Las horas se registran en la zona de Santiago."><Link className={secondaryClass} href="/admin/clientes/nuevo">Nuevo contacto</Link></PageHeading><Panel title="Datos de la cita"><AppointmentForm {...options} defaultStart={start} contactId={typeof query.contact==="string"?query.contact:undefined}/></Panel></>;
}
