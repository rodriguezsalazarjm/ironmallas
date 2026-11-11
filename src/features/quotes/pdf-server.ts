import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateQuotePdf } from "./pdf";
import { quoteSnapshotSchema } from "./snapshot";
export async function pdfFromSnapshot(value:unknown){
  const snapshot=quoteSnapshotSchema.parse(value);
  const load=async(file:string)=>{try{return await readFile(path.join(process.cwd(),"public/brand",file));}catch{return undefined;/* The textual brand fallback remains readable when a local logo is unavailable. */}};
  const [logo,colorLogo]=await Promise.all([load("logo.png"),load("logo-color.png")]);
  return {bytes:await generateQuotePdf(snapshot,logo,colorLogo),filename:`Iron-Mallas-IM-${String(snapshot.quote.number).padStart(6,"0")}-v${snapshot.quote.current_version}.pdf`};
}
