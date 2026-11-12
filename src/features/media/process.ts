import "server-only";
import sharp from "sharp";
import { imageSignature, MAX_PHOTO_BYTES } from "./validation";
/** Validate signature/size and re-encode (strips EXIF/GPS) before private upload. */
export async function photo(file: File) {
  if (!file.size || file.size > MAX_PHOTO_BYTES || !["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Usa JPG, PNG o WebP de hasta 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageSignature(bytes)) throw new Error("El contenido no corresponde a una imagen permitida.");
  return sharp(bytes,{ limitInputPixels: 40000000 }).rotate().resize({ width:2400,height:2400,fit:"inside",withoutEnlargement:true }).jpeg({quality:85}).toBuffer();
}
