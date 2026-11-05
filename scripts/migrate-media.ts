import { createHash,randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access,lstat,mkdir,open,readFile,rename,unlink,writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { siteContent } from "../src/content/site";
import { allowedSource,sourceInventory,inventoryHash,sniffMime,sha256,containedPath,downloadPath,downloadManifestSchema,replaceMediaUrls,type DownloadedResource,type DownloadManifest } from "./lib/media-migration";

const root=path.resolve(process.cwd(),".media-migration"),manifestPath=path.join(root,"manifest.json");
const MAX_BYTES=250*1024*1024,MAX_TOTAL_BYTES=2*1024*1024*1024;
class MigrationError extends Error{}
const inventory=sourceInventory(siteContent),fingerprint=inventoryHash(inventory);
async function safeDirectory(directory:string){
  await mkdir(directory,{recursive:true});const stat=await lstat(directory);if(stat.isSymbolicLink())throw new MigrationError("El respaldo no puede ser un enlace simbólico.");
}
async function writeJson(file:string,value:unknown){
  const temporary=`${file}.${randomUUID()}.tmp`;await writeFile(temporary,`${JSON.stringify(value,null,2)}\n`,{flag:"wx"});await rename(temporary,file);
}
async function existingManifest():Promise<DownloadManifest|null>{
  try{await access(manifestPath);}catch{return null;}
  const parsed=downloadManifestSchema.safeParse(JSON.parse(await readFile(manifestPath,"utf8")));
  if(!parsed.success||parsed.data.inventory_sha256!==fingerprint)throw new MigrationError("El manifiesto local no coincide con el contenido actual. Conserva ese respaldo y usa un directorio de proyecto limpio para una nueva revisión.");
  return parsed.data;
}
async function verifyFile(resource:DownloadedResource){
  allowedSource(resource.source_url);
  if(resource.relative_path!==downloadPath(resource))throw new MigrationError("El manifiesto contiene una ruta de respaldo inválida.");
  const file=containedPath(root,resource.relative_path),stat=await lstat(file);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size!==resource.bytes)throw new MigrationError("El archivo local no coincide con el manifiesto.");
  const hash=createHash("sha256");let first=Buffer.alloc(0);
  for await(const chunk of createReadStream(file)){hash.update(chunk);if(first.length<32)first=Buffer.concat([first,Buffer.from(chunk)]).subarray(0,32);}
  if(hash.digest("hex")!==resource.sha256||sniffMime(first)!==resource.mime)throw new MigrationError("Falló la integridad SHA256/MIME del respaldo.");
  return file;
}
async function sourceResponse(source:string){
  let current=allowedSource(source);
  for(let hop=0;hop<5;hop++){
    const response=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(120000),headers:{"User-Agent":"IronMallas-Media-Migration/1.0","Accept":"image/*,video/mp4"}});
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get("location");await response.body?.cancel();if(!location)throw new MigrationError("Redirección sin destino.");
      current=allowedSource(new URL(location,current).toString());continue;
    }
    if(!response.ok||!response.body)throw new MigrationError(`El recurso público devolvió HTTP ${response.status}.`);
    return response;
  }
  throw new MigrationError("Demasiadas redirecciones en un recurso público.");
}
async function download(resource:typeof inventory[number]):Promise<DownloadedResource>{
  const response=await sourceResponse(resource.source_url);
  const declaredLength=response.headers.get("content-length");
  if(declaredLength&&(!/^\d+$/.test(declaredLength)||Number(declaredLength)>MAX_BYTES)){await response.body?.cancel();throw new MigrationError("El recurso excede el límite de tamaño.");}
  const declaredMime=response.headers.get("content-type")?.split(";")[0].trim().toLowerCase()??"";
  if(declaredMime&&!declaredMime.startsWith("image/")&&declaredMime!=="video/mp4"&&declaredMime!=="application/octet-stream"){await response.body?.cancel();throw new MigrationError("El servidor devolvió un MIME que no corresponde a multimedia.");}
  const temporary=containedPath(root,`files/download-${randomUUID()}.part`),file=await open(temporary,"wx");
  const hash=createHash("sha256");let bytes=0,first=Buffer.alloc(0),closed=false;
  try{
    const reader=response.body!.getReader();
    try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>MAX_BYTES)throw new MigrationError("El recurso excede el límite de tamaño.");if(first.length<32)first=Buffer.concat([first,Buffer.from(chunk.value)]).subarray(0,32);hash.update(chunk.value);await file.write(chunk.value);}}
    finally{await reader.cancel();}
    await file.close();closed=true;
    const mime=sniffMime(first);if(!mime||!bytes)throw new MigrationError("No se reconoce el formato real del recurso.");
    if(declaredMime&&declaredMime!=="application/octet-stream"&&declaredMime!==mime)throw new MigrationError("El MIME declarado no coincide con la firma del archivo.");
    const record:DownloadedResource={...resource,sha256:hash.digest("hex"),bytes,mime,relative_path:"",verified_at:new Date().toISOString(),etag:response.headers.get("etag"),last_modified:response.headers.get("last-modified")};
    record.relative_path=downloadPath(record);const destination=containedPath(root,record.relative_path);
    try{await access(destination);await verifyFile(record);await unlink(temporary);}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")await rename(temporary,destination);else throw error;}
    await verifyFile(record);return record;
  }catch(error){if(!closed)await file.close();await unlink(temporary).catch(()=>{});throw error;}
}
async function uploadManifest(manifest:DownloadManifest,confirmation:string){
  const url=process.env.MEDIA_MIGRATION_SUPABASE_URL,secret=process.env.MEDIA_MIGRATION_SUPABASE_SECRET_KEY;
  if(process.env.MEDIA_MIGRATION_ENV!=="development"||!url||!secret||!confirmation)throw new MigrationError("Upload bloqueado: requiere MEDIA_MIGRATION_ENV=development, URL/clave explícitas y --confirm-development=PROJECT_REF.");
  const parsed=new URL(url);if(!/^[a-z0-9]{10,40}$/.test(confirmation)||parsed.protocol!=="https:"||parsed.hostname!==`${confirmation}.supabase.co`||parsed.username||parsed.password||parsed.port||parsed.pathname!=="/"||parsed.search||parsed.hash)throw new MigrationError("La URL no coincide con el proyecto de desarrollo confirmado.");
  if(manifest.resources.length!==inventory.length||inventory.some(source=>!manifest.resources.some(r=>r.source_url===source.source_url)))throw new MigrationError("Upload bloqueado: faltan recursos del inventario.");
  let total=0;for(const resource of manifest.resources){await verifyFile(resource);total+=resource.bytes;if(total>MAX_TOTAL_BYTES)throw new MigrationError("El respaldo excede el límite total de dos GiB.");}
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const bucket=await db.storage.getBucket("public-media");if(bucket.error||!bucket.data?.public)throw new MigrationError("El bucket public-media no existe o no está configurado como público. No se crean ni cambian buckets desde este script.");
  for(const resource of manifest.resources){
    const target=`wordpress/${resource.sha256}.${resource.relative_path.split(".").at(-1)}`;
    const blob=await readFile(await verifyFile(resource));
    const uploaded=await db.storage.from("public-media").upload(target,blob,{contentType:resource.mime,cacheControl:"31536000",upsert:false});
    if(uploaded.error&&uploaded.error.statusCode!=="409")throw new MigrationError("Storage rechazó un archivo. Se conserva el respaldo y no se sustituyen URLs.");
    const verified=await db.storage.from("public-media").download(target);if(verified.error||!verified.data)throw new MigrationError("No fue posible verificar el archivo subido.");
    const remote=new Uint8Array(await verified.data.arrayBuffer());if(remote.length!==resource.bytes||sha256(remote)!==resource.sha256||sniffMime(remote)!==resource.mime)throw new MigrationError("El archivo de Storage no coincide con el respaldo. No se sustituyen URLs.");
    const publicUrl=db.storage.from("public-media").getPublicUrl(target).data.publicUrl;
    // Verify the unauthenticated public URL too; generating a URL alone does not prove public availability.
    const publicResponse=await fetch(publicUrl,{redirect:"error",signal:AbortSignal.timeout(120000)});if(!publicResponse.ok)throw new MigrationError("La URL pública todavía no está disponible.");
    const publicBytes=new Uint8Array(await publicResponse.arrayBuffer());if(publicBytes.length!==resource.bytes||sha256(publicBytes)!==resource.sha256)throw new MigrationError("La URL pública no conserva la integridad del archivo.");
    resource.upload={project_ref:confirmation,bucket:"public-media",path:target,public_url:publicUrl,verified_at:new Date().toISOString()};await writeJson(manifestPath,manifest);
    console.log(`Verificado en desarrollo: ${resource.source_url}`);
  }
  if(manifest.resources.some(r=>r.upload?.project_ref!==confirmation))throw new MigrationError("La verificación no está completa.");
  const mapping=Object.fromEntries(manifest.resources.map(r=>[r.source_url,r.upload!.public_url]));
  await writeJson(path.join(root,"url-map.json"),mapping);
  await writeJson(path.join(root,"content-storage.json"),replaceMediaUrls(siteContent,mapping));
  await writeJson(path.join(root,"rollback.json"),{format_version:1,created_at:new Date().toISOString(),project_ref:confirmation,original_content:"content-original.json",restore_map:Object.fromEntries(Object.entries(mapping).map(([source,target])=>[target,source])),instruction:"Revisar y restaurar contenido original en el CMS autorizado. No eliminar objetos ni cambiar WordPress/DNS automáticamente."});
  console.log("Todos los recursos fueron verificados. Se prepararon mapa CMS y rollback locales; no se modificó site.ts ni se publicó contenido.");
}
async function main(){
  const args=process.argv.slice(2);const known=(arg:string)=>["--download","--upload","--dry-run","--help"].includes(arg)||arg.startsWith("--confirm-development=");
  if(args.some(arg=>!known(arg)))throw new MigrationError("Argumento desconocido. Usa --help.");
  if(args.includes("--help")){console.log("Dry-run por defecto: tsx scripts/migrate-media.ts\nDescarga local: --download\nUpload explícito desarrollo, desde respaldo completo: --upload --confirm-development=PROJECT_REF\n--dry-run nunca descarga, sube ni escribe. No se cargan archivos .env automáticamente.");return;}
  const downloadRequested=args.includes("--download"),uploadRequested=args.includes("--upload"),dryRun=args.includes("--dry-run")||(!downloadRequested&&!uploadRequested);
  if(dryRun){console.log(JSON.stringify({mode:"dry-run",source:"site.ts",inventory_sha256:fingerprint,resource_count:inventory.length,resources:inventory},null,2));return;}
  await safeDirectory(root);await safeDirectory(path.join(root,"files"));
  const manifest=await existingManifest()??{format_version:1,source:"site.ts",inventory_sha256:fingerprint,created_at:new Date().toISOString(),resources:[]};
  if(downloadRequested){
    if(!manifest.resources.length)await writeJson(path.join(root,"content-original.json"),siteContent);
    let total=manifest.resources.reduce((sum,r)=>sum+r.bytes,0);
    for(const source of inventory){const existing=manifest.resources.find(r=>r.source_url===source.source_url);if(existing){await verifyFile(existing);continue;}console.log(`Descargando recurso público: ${source.source_url}`);const resource=await download(source);total+=resource.bytes;if(total>MAX_TOTAL_BYTES)throw new MigrationError("El respaldo excede el límite total de dos GiB.");manifest.resources.push(resource);await writeJson(manifestPath,manifest);}
    console.log(`${manifest.resources.length} recursos respaldados y verificados localmente. Referencias originales intactas.`);
  }
  if(uploadRequested){const confirmation=args.find(arg=>arg.startsWith("--confirm-development="))?.split("=")[1]??"";await uploadManifest(manifest,confirmation);}
}
main().catch(error=>{console.error(error instanceof MigrationError?error.message:"La migración no se completó. Revisa conectividad, permisos y respaldo; no se muestran credenciales ni respuestas privadas.");process.exitCode=1;});
