import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {AppointmentForm} from "@/features/appointments/forms";
import {appointmentOptions} from "@/features/appointments/data";
import {PageHeading,Panel} from "@/features/crm/ui";
export default async function AppointmentPage({params}:PageProps<"/admin/agenda/[id]">){
  const {db}=await requireAdmin();const {id}=await params;
  if(!z.uuid().safeParse(id).success) notFound();
  const [appointment,options]=await Promise.all([db.from("appointments").select("*").eq("id",id).maybeSingle(),appointmentOptions()]);
  if(appointment.error) throw new Error("No se pudo cargar la cita."); if(!appointment.data) notFound();
  const linked=await db.from("installations").select("id").eq("appointment_id",id).limit(1);
  if(linked.error)throw new Error("No se pudo comprobar la instalación vinculada.");
  if(linked.data.length)return <><PageHeading title="Cita vinculada a instalación" description="El horario, responsable y estado actuales se gestionan desde el trabajo para evitar fechas divergentes."/><Link className="inline-flex min-h-11 items-center text-navy-700 underline" href={`/admin/instalaciones/${linked.data[0].id}`}>Abrir ficha de instalación</Link></>;
  return <><Link href="/admin/agenda" className="mb-4 inline-block text-sm underline">← Agenda</Link><PageHeading title="Ficha de cita" description="Actualiza horario, responsable y resultado. Reprogramar o cancelar conserva el registro y su auditoría."/><Panel title="Visita y coordinación"><AppointmentForm {...options} appointment={appointment.data}/></Panel>{appointment.data.cal_booking_uid && <p className="mt-4 text-sm text-ink-soft">Reserva recibida desde Cal.com. Esta edición actualiza la agenda interna; modifica la reserva externa en Cal.com si corresponde.</p>}</>;
}
