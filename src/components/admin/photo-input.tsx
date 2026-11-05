"use client";
import {useState} from "react";
export function PhotoInput({className}:{className?:string}){
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);
  return <><input name="file" type="file" accept="image/jpeg,image/png,image/webp" className={className} required disabled={busy} onChange={async event=>{
    const input=event.currentTarget;const file=input.files?.[0];if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setStatus("Usa JPG, PNG o WebP.");input.value="";return;}
    setBusy(true);setStatus("Preparando fotografía…");
    try{const bitmap=await createImageBitmap(file);const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext("2d");if(!ctx)throw new Error();ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.82));if(!blob||blob.size>3*1024*1024)throw new Error();const transfer=new DataTransfer();transfer.items.add(new File([blob],"fotografia.jpg",{type:"image/jpeg"}));input.files=transfer.files;setStatus("Fotografía lista. Se guardará de forma privada al pulsar Subir.");}catch{input.value="";setStatus("No se pudo preparar la imagen. Selecciona otra fotografía de hasta 3 MB.");}finally{setBusy(false);}
  }}/><p role="status" className="text-xs text-ink-soft">{status}</p></>;
}
