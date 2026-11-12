import type {Notification} from "@/lib/supabase/database.types";
type Event={startsAt:string|null;status:string;source:string};
/** Decide at send time whether a queued agenda notice is still valid. Pure: covered by tests. */
export function agendaNoticeVerdict(n:Pick<Notification,"kind"|"event_starts_at">,event:Event|null,now:number,opts:{clientEmail:string|null;audience:"client"|"admin";calSendsClientConfirmation:boolean}):{send:true}|{send:false;reason:string}{
  if(!event)return {send:false,reason:"El evento ya no existe"};
  if(n.kind!=="agenda_cancelled"){
    if(event.status==="cancelled")return {send:false,reason:"Evento cancelado"};
    if(event.status==="completed")return {send:false,reason:"Evento realizado"};
    if(!event.startsAt||!n.event_starts_at||Date.parse(event.startsAt)!==Date.parse(n.event_starts_at))return {send:false,reason:"Horario reemplazado"};
    if(n.kind==="agenda_reminder"&&Date.parse(event.startsAt)<=now)return {send:false,reason:"El evento ya comenzó"};
  }
  if(opts.audience==="client"&&!opts.clientEmail)return {send:false,reason:"El cliente no tiene correo registrado"};
  if(opts.audience==="client"&&n.kind==="agenda_scheduled"&&event.source==="cal_booking"&&opts.calSendsClientConfirmation)return {send:false,reason:"Cal.com envía la confirmación de la reserva al cliente"};
  return {send:true};
}

