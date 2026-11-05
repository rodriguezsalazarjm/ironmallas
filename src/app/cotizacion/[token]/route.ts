import { createClient } from "@supabase/supabase-js";
import { verifyQuoteShareToken,quoteShareAllowed } from "@/features/quotes/share-token";
import { pdfFromSnapshot } from "@/features/quotes/pdf-server";
import { chileToday } from "@/features/quotes/date";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;const claims=verifyQuoteShareToken(token,process.env.QUOTE_SHARE_SECRET??"");
  if(!claims)return new Response("El enlace no es válido o ya venció.",{status:404,headers:{"Cache-Control":"private, no-store"}});
  const config=supabaseConfig(),secret=process.env.SUPABASE_SECRET_KEY;
  if(!config||!secret)return new Response("Documento temporalmente no disponible",{status:503});
  const db=createClient<Database>(config.url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:quote,error:quoteError}=await db.from("quotes").select("status,valid_until,current_version").eq("id",claims.id).maybeSingle();
  if(quoteError)return new Response("Documento temporalmente no disponible",{status:503});
  const today=chileToday();
  if(!quote||!quoteShareAllowed(claims,quote,today))return new Response("Este presupuesto ya no está disponible mediante este enlace.",{status:404,headers:{"Cache-Control":"private, no-store"}});
  const {data,error}=await db.from("quote_versions").select("snapshot").eq("quote_id",claims.id).eq("version",claims.version).maybeSingle();
  if(error)return new Response("Documento temporalmente no disponible",{status:503});if(!data)return new Response("Documento no encontrado",{status:404});
  try{const pdf=await pdfFromSnapshot(data.snapshot);return new Response(new Uint8Array(pdf.bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${pdf.filename}"`,"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","Referrer-Policy":"no-referrer"}});}catch{return new Response("Documento temporalmente no disponible",{status:503});}
}
