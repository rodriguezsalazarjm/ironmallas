import {createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {supabaseConfig} from "@/lib/supabase/config";
import type {Database} from "@/lib/supabase/database.types";
import {company} from "@/content/company";
import {santiagoDateTime} from "@/features/notifications/agenda-templates";

/**
 * Public attendance confirmation. GET only shows the page (mail scanners that prefetch links confirm nothing);
 * POST records the confirmation. No customer data is shown beyond the type, date and time of the visit.
 */
type Result={state:"invalid"|"unavailable"|"outdated"|"ready"|"confirmed";starts_at?:string;kind?:string};
const headers={"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"};
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);

async function check(token:string,commit:boolean):Promise<Result|null>{
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {state:"invalid"};
  const config=supabaseConfig(),secret=process.env.SUPABASE_SECRET_KEY;if(!config||!secret)return null;
  const db=createClient<Database>(config.url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("confirm_attendance",{p_token_hash:createHash("sha256").update(token).digest("hex"),p_commit:commit});
  if(error)return null;return data as Result;
}
function page(result:Result|null,token:string,status=200){
  const when=result?.starts_at?santiagoDateTime(result.starts_at):null;
  const what=escape(result?.kind??"visita");
  const body=!result?`<h1>Servicio no disponible</h1><p>No pudimos registrar tu respuesta en este momento. Inténtalo más tarde o contáctanos.</p>`
    :result.state==="ready"?`<h1>Confirmar asistencia</h1><p><strong>${what}</strong><br>${escape(when!.date)} · ${escape(when!.time)} (hora de Santiago)</p><form method="post"><button type="submit">Confirmar asistencia</button></form><p class="muted">Si no puedes asistir, contáctanos para reprogramar.</p>`
    :result.state==="confirmed"?`<h1>¡Asistencia confirmada!</h1><p><strong>${what}</strong><br>${when?`${escape(when.date)} · ${escape(when.time)}`:""}</p><p>Gracias. Te esperamos.</p>`
    :result.state==="outdated"?`<h1>Este enlace corresponde a un horario anterior</h1><p>La cita fue reprogramada. Revisa el correo más reciente o contáctanos.</p>`
    :result.state==="unavailable"?`<h1>La cita ya no está activa</h1><p>Fue cancelada o finalizada. Contáctanos si necesitas coordinar una nueva fecha.</p>`
    :`<h1>Enlace no válido o vencido</h1><p>Contáctanos para confirmar tu cita.</p>`;
  void token;
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Iron Mallas · Confirmación</title>
<style>body{margin:0;background:#f4f7fa;font-family:Roboto,system-ui,sans-serif;color:#031726}main{max-width:32rem;margin:10vh auto;padding:2rem 1.25rem;background:#fff;border-radius:1rem;border-top:6px solid #FC6B04}h1{font-family:Oswald,"Arial Narrow",sans-serif;color:#06365A;font-size:1.75rem;margin:0 0 1rem}button{min-height:3rem;width:100%;border:0;border-radius:.75rem;background:#06365A;color:#fff;font-size:1.05rem;font-weight:700;cursor:pointer}button:focus-visible{outline:3px solid #FC6B04;outline-offset:2px}.muted,footer{color:#4b5b6b;font-size:.875rem}footer{margin-top:2rem}</style></head>
<body><main>${body}<footer>${escape(company.brand)} · ${escape(company.phoneDisplay)} · ${escape(company.email)}</footer></main></body></html>`,{status,headers});
}
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const result=await check(token,false);
  return page(result,token,result?200:503);
}
export async function POST(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const result=await check(token,true);
  return page(result,token,result?200:503);
}
