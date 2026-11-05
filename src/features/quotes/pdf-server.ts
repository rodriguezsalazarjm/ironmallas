import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateQuotePdf } from "./pdf";
import { quoteSnapshotSchema } from "./snapshot";
export async function pdfFromSnapshot(value:unknown){
  const snapshot=quoteSnapshotSchema.parse(value);
  let logo:Uint8Array|undefined;
  try{logo=await readFile(path.join(process.cwd(),"public/brand/logo.png"));}catch{/* The textual brand fallback remains readable when a local logo is unavailable. */}
  return {bytes:await generateQuotePdf(snapshot,logo),filename:`Iron-Mallas-IM-${String(snapshot.quote.number).padStart(6,"0")}-v${snapshot.quote.current_version}.pdf`};
}
