import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
export function verifyCalSignature(raw:string,signature:string|null,secret:string){
  if(!signature||!/^[a-f0-9]{64}$/i.test(signature)||secret.length<32)return false;
  const expected=createHmac("sha256",secret).update(raw).digest();
  return timingSafeEqual(expected,Buffer.from(signature,"hex"));
}
const person=z.object({name:z.string().trim().min(1).max(80),email:z.email().max(120),phoneNumber:z.string().max(30).nullable().optional()});
/** Cal.com booking questions arrive as `responses[slug] = {label, value}` (or a bare value in older payloads). */
const responses=z.record(z.string().max(80),z.unknown()).optional();
const payload=z.object({uid:z.string().min(1).max(200),startTime:z.iso.datetime({offset:true}).optional(),endTime:z.iso.datetime({offset:true}).optional(),title:z.string().max(160).optional(),additionalNotes:z.string().max(4000).nullish(),location:z.string().max(240).nullish(),attendees:z.array(person).max(50).optional(),rescheduleUid:z.string().max(200).nullish(),rescheduledFromUid:z.string().max(200).nullish(),responses,metadata:z.record(z.string().max(80),z.unknown()).nullish()});
const event=z.object({triggerEvent:z.enum(["BOOKING_CREATED","BOOKING_RESCHEDULED","BOOKING_CANCELLED"]),createdAt:z.iso.datetime({offset:true}),payload});
/** Booking question identifiers expected in the Cal.com event type (see docs/AGENDA-OPERATIVA.md). */
export {CAL_BOOKING_FIELDS as CAL_FIELDS} from "@/content/cal-fields";
import {CAL_BOOKING_FIELDS as CAL_FIELDS} from "@/content/cal-fields";
const ZONES=new Set(["balcon","ventana","logia","terraza","otra"]);
function answer(source:Record<string,unknown>|undefined,key:string,max:number){
  const raw=source?.[key];const value=raw&&typeof raw==="object"&&"value" in raw?(raw as {value:unknown}).value:raw;
  if(typeof value==="boolean")return value?"true":"";
  return typeof value==="string"?value.trim().slice(0,max):"";
}
export function normalizeCalEvent(raw:string){
  const parsed=event.parse(JSON.parse(raw));const p=parsed.payload;
  const eventKey=createHash("sha256").update(`${parsed.triggerEvent}:${p.uid}:${parsed.createdAt}`).digest("hex");
  if(parsed.triggerEvent==="BOOKING_CANCELLED")return {eventKey,type:parsed.triggerEvent,payload:{uid:p.uid,occurred_at:parsed.createdAt}};
  const person=p.attendees?.[0];
  if(!person||!p.startTime||!p.endTime||Date.parse(p.endTime)<=Date.parse(p.startTime))throw new Error("Reserva incompleta");
  const r=p.responses as Record<string,unknown>|undefined;
  const phoneRaw=answer(r,CAL_FIELDS.whatsapp,30)||answer(r,"attendeePhoneNumber",30)||person.phoneNumber||"";
  const digits=phoneRaw.replace(/\D/g,"");
  if(digits&&!(digits.length>=8&&digits.length<=15))throw new Error("Teléfono inválido");
  const zone=answer(r,CAL_FIELDS.zone,20).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const consentAnswer=answer(r,CAL_FIELDS.consent,10).toLowerCase();
  const consentMeta=typeof p.metadata?.consent==="string"?p.metadata.consent:"";
  const address=answer(r,CAL_FIELDS.address,240)||(p.location&&!/^https?:/i.test(p.location)?p.location:"");
  const details=answer(r,CAL_FIELDS.details,3000);
  const notes=[details,p.additionalNotes?.trim()].filter(Boolean).join("\n\n").slice(0,4000)||null;
  return {eventKey,type:parsed.triggerEvent,payload:{uid:p.uid,occurred_at:parsed.createdAt,old_uid:p.rescheduledFromUid??p.rescheduleUid??null,
    contact:{name:person.name,email:person.email.toLowerCase(),phone:digits||null,address:address||null,commune:answer(r,CAL_FIELDS.commune,60)||null},
    starts_at:p.startTime,ends_at:p.endTime,service:p.title??"Visita técnica",notes,
    zone_kind:ZONES.has(zone)?zone:null,consent:["true","1","si","sí","yes","on"].includes(consentAnswer)||consentMeta==="1"}};
}
export async function readLimitedBody(request:Request,max=128*1024){
  const reader=request.body?.getReader();if(!reader)return "";
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error("Payload demasiado grande");}chunks.push(value);}}
  finally{reader.releaseLock();}
  return Buffer.concat(chunks).toString("utf8");
}
