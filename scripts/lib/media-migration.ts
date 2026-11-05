import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
export type SourceResource={source_url:string;used_at:string[]};
export const mediaTypes={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","video/mp4":"mp4"} as const;
export type MediaMime=keyof typeof mediaTypes;
export function allowedSource(value:string):URL{
  const url=new URL(value);
  const decoded=decodeURIComponent(url.pathname);
  if(url.protocol!=="https:"||url.hostname!=="ironmallas.cl"||url.port||url.username||url.password||url.search||url.hash||!url.pathname.startsWith("/wp-content/uploads/")||/%2f|%5c/i.test(url.pathname)||decoded.split("/").some(p=>p===".."||p===".")||decoded.includes("\\"))throw new Error("Solo se admiten recursos HTTPS de ironmallas.cl/wp-content/uploads sin parámetros ni credenciales.");
  return url;
}
export function sourceInventory(content:unknown):SourceResource[]{
  const found=new Map<string,string[]>();
  function visit(value:unknown,location:string){
    if(typeof value==="string"&&value.includes("ironmallas.cl/wp-content/uploads/")){
      const url=allowedSource(value).toString();found.set(url,[...(found.get(url)??[]),location]);
    }else if(Array.isArray(value))value.forEach((item,index)=>visit(item,`${location}[${index}]`));
    else if(value&&typeof value==="object")Object.entries(value).forEach(([key,item])=>visit(item,location?`${location}.${key}`:key));
  }
  visit(content,"");return [...found].sort(([a],[b])=>a.localeCompare(b)).map(([source_url,used_at])=>({source_url,used_at}));
}
export function sniffMime(bytes:Uint8Array):MediaMime|null{
  const b=Buffer.from(bytes);
  if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "image/png";
  if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return "image/jpeg";
  if(b.length>=12&&b.subarray(0,4).toString()==="RIFF"&&b.subarray(8,12).toString()==="WEBP")return "image/webp";
  if(b.length>=12&&b.subarray(4,8).toString()==="ftyp")return "video/mp4";
  return null;
}
export function sha256(bytes:Uint8Array){return createHash("sha256").update(bytes).digest("hex");}
export function containedPath(root:string,relative:string){
  const resolved=path.resolve(root,relative),remainder=path.relative(path.resolve(root),resolved);
  if(remainder===".."||remainder.startsWith(`..${path.sep}`)||path.isAbsolute(remainder))throw new Error("La ruta sale del directorio de respaldo.");
  return resolved;
}
export function replaceMediaUrls<T>(value:T,mapping:Record<string,string>):T{
  if(typeof value==="string")return (mapping[value]??value) as T;
  if(Array.isArray(value))return value.map(item=>replaceMediaUrls(item,mapping)) as T;
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,replaceMediaUrls(item,mapping)])) as T;
  return value;
}
export const downloadedSchema=z.object({source_url:z.string(),used_at:z.array(z.string()),sha256:z.string().regex(/^[a-f0-9]{64}$/),bytes:z.number().int().positive().max(262144000),mime:z.enum(["image/png","image/jpeg","image/webp","video/mp4"]),relative_path:z.string(),verified_at:z.iso.datetime(),etag:z.string().nullable(),last_modified:z.string().nullable(),upload:z.object({project_ref:z.string(),bucket:z.literal("public-media"),path:z.string(),public_url:z.url(),verified_at:z.iso.datetime()}).optional()});
export const downloadManifestSchema=z.object({format_version:z.literal(1),source:z.literal("site.ts"),inventory_sha256:z.string().regex(/^[a-f0-9]{64}$/),created_at:z.iso.datetime(),resources:z.array(downloadedSchema)});
export type DownloadedResource=z.infer<typeof downloadedSchema>;
export type DownloadManifest=z.infer<typeof downloadManifestSchema>;
export function inventoryHash(inventory:SourceResource[]){return sha256(Buffer.from(JSON.stringify(inventory)));}
export function downloadPath(resource:Pick<DownloadedResource,"sha256"|"mime">){return `files/${resource.sha256}.${mediaTypes[resource.mime]}`;}
