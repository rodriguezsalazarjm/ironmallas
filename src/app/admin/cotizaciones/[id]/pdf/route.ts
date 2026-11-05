import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { pdfFromSnapshot } from "@/features/quotes/pdf-server";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {db}=await requireAdmin();const {id}=await params;
  const version=Number(new URL(request.url).searchParams.get("version"));
  if(!z.uuid().safeParse(id).success||!Number.isSafeInteger(version)||version<1)return new Response("Solicitud inválida",{status:400});
  const {data,error}=await db.from("quote_versions").select("snapshot").eq("quote_id",id).eq("version",version).maybeSingle();
  if(error)return new Response("No fue posible generar el documento",{status:503});
  if(!data)return new Response("Documento no encontrado",{status:404});
  try{const pdf=await pdfFromSnapshot(data.snapshot);return new Response(new Uint8Array(pdf.bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`${new URL(request.url).searchParams.get("download")==="1"?"attachment":"inline"}; filename="${pdf.filename}"`,"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});}catch{return new Response("No fue posible generar el documento. Revisa sus datos comerciales.",{status:500});}
}
