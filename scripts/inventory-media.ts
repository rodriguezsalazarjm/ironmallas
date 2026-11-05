import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { siteContent } from "../src/content/site";
import { sourceInventory } from "./lib/media-migration";

// Local inventory only: no HEAD, downloads, uploads or content replacement.
const resources = sourceInventory(siteContent);
async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : Promise.resolve([path.join(directory, entry.name)])))).flat();
}
async function main() {
const local = await Promise.all((await filesIn("public")).map(async file => ({
  path: file.replaceAll("\\", "/"), bytes: (await stat(file)).size,
  sha256: createHash("sha256").update(await readFile(file)).digest("hex"),
})));
const imageCount = resources.filter(resource => !resource.source_url.endsWith(".mp4")).length;
const lines = [
  "# Inventario local de multimedia", "", "Generado por `npm run media:inventory`, sin consultar WordPress ni otros servicios.", "",
  `Contenido estático: **${resources.length} recursos únicos** (${imageCount} imágenes y ${resources.length - imageCount} videos), todos dependientes de WordPress.`,
  "El contenido publicado en CMS y las fotografías privadas requieren inventario autorizado posterior; no están disponibles localmente.", "",
  "| Recurso WordPress | Usos en contenido | Estado |", "|---|---|---|",
  ...resources.map(resource => `| ${resource.source_url} | ${resource.used_at.join(", ")} | Referencia conservada; archivo remoto no validado |`),
  "", "## Archivos en public", "", "| Archivo | Bytes | SHA256 |", "|---|---:|---|",
  ...local.map(file => `| ${file.path} | ${file.bytes} | ${file.sha256} |`),
  "", "La presencia de un logo local no demuestra que sea equivalente al logo remoto. No se reemplaza ninguna referencia automáticamente.", "",
  "## Estrategia de salida de WordPress", "",
  "1. Respaldar originales autorizados con `media:migrate -- --download` en una tarea posterior. Validar firma MIME, bytes y SHA256; conservar manifiesto y originales.",
  "2. Elegir alojamiento público estable: Storage autorizado o un CDN de objetos. No requiere mantener WordPress como origen. Las fotos administrativas permanecen privadas y separadas.",
  "3. Generar imágenes WebP/AVIF a tamaños de uso; conservar originales y transparencia. Mantener dimensions/sizes y revisión visual antes de aceptar derivados. No ampliar imágenes pequeñas.",
  "4. Para videos, conservar MP4 original, preparar derivados H.264 compatibles y poster validado; medir peso, reproducción móvil y calidad. No inventar posters ni sustituir con archivos no comprobados.",
  "5. Publicar con nombres por hash y caché immutable. Comprobar URL pública, MIME, dimensiones, integridad y respuesta del optimizador; añadir solo el host/ruta permitidos a next.config.ts.",
  "6. Preparar mapa de URLs y rollback, comparar visualmente cada uso a 375/768/1440 px. Reemplazar únicamente tras validación completa. No eliminar WordPress ni cambiar DNS.", "",
  "`scripts/migrate-media.ts` ya prepara manifiestos, validación y rollback. En esta tarea no se ejecutaron sus modos de descarga ni subida.",
  "Las fuentes Oswald/Roboto usan next/font/google: se sirven localmente al visitante, pero un build limpio puede necesitar descargar las fuentes. Para un build completamente offline, incorporar WOFF2 con licencia validada y usar next/font/local en una tarea posterior.", "",
];
await writeFile("docs/MULTIMEDIA-INVENTARIO.md", lines.join("\n"));
console.log(`Inventario local escrito: ${resources.length} recursos WordPress; ${local.length} archivos públicos.`);

}
main().catch(error => { console.error(error); process.exitCode = 1; });
