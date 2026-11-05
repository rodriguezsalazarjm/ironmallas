import {createServiceClient} from "@/lib/supabase/service";
import {normalizeCalEvent,readLimitedBody,verifyCalSignature} from "@/features/integrations/cal";

export async function POST(request:Request){
  const secret=process.env.CAL_WEBHOOK_SECRET;
  if(!secret||secret.length<32)return Response.json({error:"Integración no configurada"},{status:503});
  let raw:string;try{raw=await readLimitedBody(request);}catch{return Response.json({error:"Solicitud demasiado grande"},{status:413});}
  if(!verifyCalSignature(raw,request.headers.get("x-cal-signature-256"),secret))return Response.json({error:"Firma inválida"},{status:401});
  let event;try{event=normalizeCalEvent(raw);}catch{return Response.json({error:"Evento no compatible o incompleto"},{status:400});}
  try{const db=createServiceClient();const {error}=await db.rpc("sync_cal_booking",{p_event_key:event.eventKey,p_event_type:event.type,p_payload:event.payload});if(error)return Response.json({error:"No se pudo registrar el evento"},{status:503});return Response.json({received:true});}
  catch{return Response.json({error:"Integración pendiente de configuración"},{status:503});}
}
