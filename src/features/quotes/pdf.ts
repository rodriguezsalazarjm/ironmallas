import { PDFDocument,StandardFonts,rgb,type PDFPage,type PDFFont } from "pdf-lib";
import { quickDetailsSchema, type QuoteSnapshot } from "./snapshot";
import { generateQuickPdf } from "./pdf-quick";
import { clp } from "./calculation";
export const navy=rgb(0.024,0.212,0.353),orange=rgb(0.988,0.42,0.016),ink=rgb(0.12,0.18,0.23),muted=rgb(0.35,0.4,0.44),lineColor=rgb(0.86,0.89,0.91);
// Helvetica supports Spanish accents. Unsupported user glyphs are replaced rather than breaking PDF generation.
export function safe(value:string){return value.replace(/[^\x20-\x7e\xa0-\xff\n]/g,"?").replace(/\r/g,"");}
export function wrap(value:string,font:PDFFont,size:number,width:number):string[]{
  const result:string[]=[];
  for(const paragraph of safe(value).split("\n")){
    let current="";
    for(const word of paragraph.split(/\s+/)){
      if(!word)continue;
      const chunks:string[]=[];let chunk="";
      for(const letter of word){if(font.widthOfTextAtSize(chunk+letter,size)>width&&chunk){chunks.push(chunk);chunk="";}chunk+=letter;}if(chunk)chunks.push(chunk);
      for(const part of chunks){const next=current?`${current} ${part}`:part;if(font.widthOfTextAtSize(next,size)>width&&current){result.push(current);current=part;}else current=next;}
    }
    result.push(current);
  }
  return result;
}
export async function generateQuotePdf(snapshot:QuoteSnapshot,logo?:Uint8Array):Promise<Uint8Array>{
  const quick=quickDetailsSchema.safeParse(snapshot.quote.details);
  if(quick.success)return generateQuickPdf(snapshot,quick.data,logo);
  const doc=await PDFDocument.create();
  doc.setTitle(`Cotización IM-${String(snapshot.quote.number).padStart(6,"0")} · v${snapshot.quote.current_version}`);
  doc.setAuthor(snapshot.company.name);doc.setSubject("Cotización comercial Iron Mallas");doc.setCreator("Iron Mallas 2.0");
  const documentDate=new Date(snapshot.quote.created_at);if(!Number.isNaN(documentDate.getTime())){doc.setCreationDate(documentDate);doc.setModificationDate(documentDate);}
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage=logo?await doc.embedPng(logo):null;
  let page!:PDFPage;let y=0;
  const pageWidth=595.28,pageHeight=841.89,margin=42,contentWidth=pageWidth-2*margin;
  function newPage(){
    page=doc.addPage([pageWidth,pageHeight]);page.drawRectangle({x:0,y:pageHeight-106,width:pageWidth,height:106,color:navy});
    if(logoImage){const scaled=logoImage.scaleToFit(215,48);page.drawImage(logoImage,{x:margin,y:pageHeight-68,width:scaled.width,height:scaled.height});}
    else page.drawText("IRON MALLAS",{x:margin,y:pageHeight-51,font:bold,size:24,color:rgb(1,1,1)});
    page.drawText(`COTIZACIÓN IM-${String(snapshot.quote.number).padStart(6,"0")}`,{x:margin,y:pageHeight-89,font:bold,size:12,color:rgb(1,1,1)});
    page.drawText(`VERSIÓN ${snapshot.quote.current_version}`,{x:pageWidth-margin-95,y:pageHeight-89,font:bold,size:10,color:orange});
    page.drawRectangle({x:0,y:pageHeight-110,width:pageWidth,height:4,color:orange});y=pageHeight-138;
  }
  function ensure(height:number){if(y-height<58)newPage();}
  function text(value:string,{size=10,font=regular,color=ink,indent=0,after=5}:{size?:number;font?:PDFFont;color?:ReturnType<typeof rgb>;indent?:number;after?:number}={}){
    const lines=wrap(value,font,size,contentWidth-indent);for(const row of lines){ensure(size+5);page.drawText(row,{x:margin+indent,y,font,size,color});y-=size+4;}y-=after;
  }
  function title(value:string){ensure(40);y-=8;text(value,{size:13,font:bold,color:navy,after:7});}
  newPage();
  const created=new Date(snapshot.quote.created_at);
  const createdLabel=Number.isNaN(created.getTime())?snapshot.quote.created_at:new Intl.DateTimeFormat("es-CL",{dateStyle:"long",timeZone:"America/Santiago"}).format(created);
  text(`Fecha: ${createdLabel}  |  Válida hasta: ${snapshot.quote.valid_until}`,{size:9,color:muted});
  text(snapshot.company.name,{font:bold,size:11});
  if(snapshot.company.rut)text(`RUT: ${snapshot.company.rut}`,{size:9,color:muted});
  text([snapshot.company.address,snapshot.company.phone,snapshot.company.email].filter(Boolean).join(" · "),{size:9,color:muted});
  title("Datos del cliente y del trabajo");
  text(snapshot.contact.name,{font:bold,size:11});
  text([snapshot.contact.phone,snapshot.contact.email].filter(Boolean).join(" · "),{size:10});
  const address=[snapshot.contact.address,snapshot.contact.unit?`Unidad ${snapshot.contact.unit}`:null,snapshot.contact.commune,snapshot.contact.region].filter(Boolean).join(", ");
  text(address||"Dirección del trabajo: por confirmar",{size:10});
  title("Detalle de servicios");
  snapshot.items.forEach((item,index)=>{
    ensure(100);page.drawLine({start:{x:margin,y:y+3},end:{x:pageWidth-margin,y:y+3},thickness:0.6,color:lineColor});y-=15;
    text(`${index+1}. ${item.description}`,{font:bold,size:10});
    const dimensions=item.unit==="m2"?`${(item.width_mm??0)/1000} m × ${(item.height_mm??0)/1000} m · `:"";
    text(`${dimensions}Cantidad: ${item.quantity_milli/1000} · Precio neto: ${clp(item.unit_price)} / ${item.unit}`,{size:9,color:muted});
    if(item.material||item.location)text([item.material?`Material: ${item.material}`:"",item.location?`Ubicación: ${item.location}`:""].filter(Boolean).join(" · "),{size:9});
    if(item.min_price||item.surcharge_bps)text(`Mínimo por concepto: ${clp(item.min_price)} · Recargo: ${item.surcharge_bps/100}%`,{size:9,color:muted});
    text(`Subtotal neto del concepto: ${clp(item.line_total)}`,{font:bold,size:10});
  });
  ensure(170);title("Resumen económico");
  const totals:[string,number][]=[["Subtotal",snapshot.quote.subtotal],[`Descuento (${snapshot.quote.discount_bps/100}%)`,snapshot.quote.discount_amount],["Neto",snapshot.quote.net],[`IVA (${snapshot.quote.tax_bps/100}%)`,snapshot.quote.tax],["TOTAL CLP",snapshot.quote.total]];
  for(const [label,value]of totals){ensure(23);const final=label==="TOTAL CLP";if(final)page.drawRectangle({x:margin,y:y-7,width:contentWidth,height:27,color:navy});page.drawText(label,{x:margin+10,y,font:final?bold:regular,size:final?12:10,color:final?rgb(1,1,1):ink});const amount=safe(clp(value));page.drawText(amount,{x:pageWidth-margin-10-bold.widthOfTextAtSize(amount,final?12:10),y,font:bold,size:final?12:10,color:final?rgb(1,1,1):ink});y-=final?37:23;}
  title("Condiciones de pago");text(snapshot.quote.payment_terms,{size:9});
  if(snapshot.quote.warranty){title("Garantía");text(snapshot.quote.warranty,{size:9});}
  if(snapshot.quote.notes){title("Observaciones");text(snapshot.quote.notes,{size:9});}
  text("Importes expresados en pesos chilenos. Este documento es una cotización, no una factura.",{size:8,color:muted});
  const pages=doc.getPages();pages.forEach((p,index)=>{p.drawLine({start:{x:margin,y:39},end:{x:pageWidth-margin,y:39},thickness:0.5,color:lineColor});p.drawText(safe(`${snapshot.company.name} · IM-${String(snapshot.quote.number).padStart(6,"0")} · Página ${index+1} de ${pages.length}`),{x:margin,y:25,font:regular,size:8,color:muted});});
  return doc.save();
}
