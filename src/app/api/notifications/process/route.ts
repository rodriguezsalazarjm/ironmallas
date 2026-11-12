import {timingSafeEqual} from "node:crypto";
import {dispatchNotifications} from "@/features/notifications/dispatch";

/** Protected queue processor. POST for external schedulers; GET for Vercel Cron (sends `Authorization: Bearer CRON_SECRET`). */
async function handle(request:Request){
  const secret=process.env.CRON_SECRET;const provided=request.headers.get("authorization")??"";
  if(!secret||secret.length<32)return Response.json({error:"No configurado"},{status:503});
  const expected=`Bearer ${secret}`;
  if(Buffer.byteLength(provided)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return Response.json({error:"No autorizado"},{status:401});
  try{return Response.json(await dispatchNotifications());}catch{return Response.json({error:"No se pudo procesar"},{status:503});}
}
export const POST=handle;
export const GET=handle;
