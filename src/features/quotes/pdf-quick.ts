import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import type { QuoteSnapshot, QuickDetails } from "./snapshot";
import { clp } from "./calculation";
import { navy, orange, ink, muted, lineColor, safe, wrap } from "./pdf";
import { company, companyIdentification } from "@/content/company";
import { DEFINITIVE_SUBTITLE, DEFINITIVE_TITLE, QUOTE_TERMS, REFERENTIAL_NOTE, REFERENTIAL_SUBTITLE, REFERENTIAL_TITLE } from "./terms";

const ZONE_LABELS: Record<string, string> = { balcon: "Balcón", ventana: "Ventana", logia: "Logia", terraza: "Terraza", otra: "Otra zona" };
const white = rgb(1, 1, 1), soft = rgb(0.955, 0.965, 0.975), orangeSoft = rgb(1, 0.953, 0.918);
const meters = (mm: number) => (mm / 1000).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const area = (milli: number) => `${Math.trunc(milli / 1000).toLocaleString("es-CL")},${String(milli % 1000).padStart(3, "0")}`;
const qty = (milli: number) => (milli / 1000).toLocaleString("es-CL", { maximumFractionDigits: 3 });
type Color = ReturnType<typeof rgb>;
type TextOptions = { size?: number; font?: PDFFont; color?: Color };

/**
 * PDF A4 de la cotización (identidad Iron Mallas: navy #06365A, naranja #FC6B04, blanco y logotipo oficial).
 * Estructura: encabezado · título referencial/definitiva · cliente y dirección · servicio · zonas · conceptos ·
 * resumen · vigencia y condiciones configuradas · términos · contacto. Pie con identificación legal en cada página.
 */
export async function generateQuickPdf(snapshot: QuoteSnapshot, details: QuickDetails, logo?: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const q = snapshot.quote, c = snapshot.contact, co = snapshot.company;
  const definitive = details.definitive === true;
  const code = `IM-${String(q.number).padStart(6, "0")}`;
  const title = definitive ? DEFINITIVE_TITLE : REFERENTIAL_TITLE;
  doc.setTitle(`${title} ${code} · v${q.current_version}`); doc.setAuthor(company.brand); doc.setSubject(`Cotización Iron Mallas · ${company.legalName}`); doc.setCreator("Iron Mallas 2.0");
  const created = new Date(q.created_at);
  if (!Number.isNaN(created.getTime())) { doc.setCreationDate(created); doc.setModificationDate(created); }
  const regular = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logoImage: PDFImage | null = null;
  if (logo) { try { logoImage = await doc.embedPng(logo); } catch { logoImage = null; } }
  const W = 595.28, H = 841.89, M = 44, CW = W - 2 * M, BOTTOM = 78;
  const phone = co.phone || company.phoneDisplay, email = co.email || company.email;
  let page!: PDFPage; let y = 0;

  const fmtDate = (value: string) => {
    const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(d);
  };
  const draw = (t: string, x: number, yy: number, o: TextOptions = {}) => page.drawText(safe(t), { x, y: yy, size: o.size ?? 9.5, font: o.font ?? regular, color: o.color ?? ink });
  const right = (t: string, xr: number, yy: number, o: TextOptions = {}) => { const f = o.font ?? regular, sz = o.size ?? 9.5; draw(t, xr - f.widthOfTextAtSize(safe(t), sz), yy, o); };

  function header(first: boolean) {
    page = doc.addPage([W, H]);
    const logoBox = first ? { w: 178, h: 40 } : { w: 112, h: 25 };
    const top = H - 34;
    if (logoImage) { const s = logoImage.scaleToFit(logoBox.w, logoBox.h); page.drawImage(logoImage, { x: M, y: top - s.height, width: s.width, height: s.height }); }
    else draw("IRON MALLAS", M, top - logoBox.h + 8, { size: first ? 22 : 14, font: bold, color: navy });
    if (first) {
      right(`N° ${code}`, W - M, top - 8, { size: 12, font: bold, color: navy });
      right(`Versión ${q.current_version}`, W - M, top - 22, { size: 8.5, font: bold, color: orange });
      right(`Fecha de emisión: ${fmtDate(q.created_at)}`, W - M, top - 35, { size: 8.5, color: muted });
      right(`Válida hasta: ${fmtDate(q.valid_until)}`, W - M, top - 47, { size: 8.5, color: muted });
    } else right(`${title} ${code} · v${q.current_version} (continuación)`, W - M, top - 14, { size: 8.5, font: bold, color: navy });
    const lineY = first ? top - 60 : top - 34;
    page.drawRectangle({ x: M, y: lineY, width: CW, height: 2, color: orange });
    y = lineY - 26;
  }
  const ensure = (h: number) => { if (y - h < BOTTOM) header(false); };
  function heading(t: string, keep = 40) {
    ensure(keep + 22); y -= 4;
    page.drawRectangle({ x: M, y: y - 2, width: 3, height: 12, color: orange });
    draw(t.toUpperCase(), M + 9, y, { size: 9.5, font: bold, color: navy }); y -= 18;
  }
  function para(t: string, o: TextOptions & { indent?: number; gap?: number } = {}) {
    const sz = o.size ?? 9, f = o.font ?? regular, ind = o.indent ?? 0, lh = sz + 3.6;
    const rows = wrap(t, f, sz, CW - ind);
    if (rows.length <= 4) ensure(rows.length * lh); // párrafos cortos no se parten entre páginas
    for (const row of rows) { ensure(lh); draw(row, M + ind, y, { size: sz, font: f, color: o.color }); y -= lh; }
    y -= o.gap ?? 3;
  }

  // 1. Encabezado y 2. título.
  header(true);
  draw(title, M, y, { size: 19, font: bold, color: navy }); y -= 16;
  draw(definitive ? DEFINITIVE_SUBTITLE : REFERENTIAL_SUBTITLE, M, y, { size: 9.5, font: bold, color: definitive ? muted : orange }); y -= 22;

  // 3. Cliente y dirección del trabajo.
  const colW = (CW - 14) / 2;
  const workAddress = details.work_address || [c.address, c.unit ? `Depto./unidad ${c.unit}` : "", c.commune, c.region].filter(Boolean).join(", ") || "Por confirmar";
  const clientLines = [[c.name, true], [c.whatsapp || c.phone ? `WhatsApp: ${c.whatsapp || c.phone}` : "", false], [c.email ?? "", false]] as [string, boolean][];
  const clientRows = clientLines.filter(([t]) => t).flatMap(([t, b]) => wrap(t, b ? bold : regular, b ? 10.5 : 9, colW - 24).map(row => [row, b] as [string, boolean]));
  const addressRows = wrap(workAddress, bold, 10, colW - 24);
  const cardH = 30 + Math.max(clientRows.length, addressRows.length) * 13;
  ensure(cardH + 10);
  const card = (x: number, label: string, rows: [string, boolean][]) => {
    page.drawRectangle({ x, y: y - cardH + 12, width: colW, height: cardH, color: soft });
    draw(label, x + 12, y - 4, { size: 7.5, font: bold, color: muted });
    rows.forEach(([row, b], i) => draw(row, x + 12, y - 20 - i * 13, { size: b ? 10.5 : 9, font: b ? bold : regular }));
  };
  card(M, "CLIENTE", clientRows);
  card(M + colW + 14, "DIRECCIÓN DEL TRABAJO", addressRows.map(r => [r, true] as [string, boolean]));
  y -= cardH + 12;

  // 4. Descripción del servicio.
  const measure = details.measure ?? (details.pricing.unit === "ml" ? "ml" : details.pricing.mode === "manual" ? "manual" : "m2");
  heading("Descripción del servicio");
  para([details.service, details.mesh_type].filter(Boolean).join(" · "), { font: bold, size: 10 });
  if (details.features?.length) para(`Características: ${details.features.join(" · ")}`, { color: muted });
  para(measure === "ml" ? "Cálculo por metro lineal: ancho + alto de cada zona, multiplicado por la cantidad indicada. No corresponde al perímetro completo."
    : measure === "m2" ? "Cálculo por superficie: ancho × alto de cada zona, multiplicado por la cantidad indicada."
    : "Valor neto definido por Iron Mallas para este trabajo.", { color: muted, size: 8.5, gap: 8 });

  // 5. Zonas, dimensiones y cantidades.
  heading("Zonas, dimensiones y cantidades", 60);
  const lastLabel = measure === "ml" ? "Ancho + alto (m)" : "Superficie (m²)";
  const cols = [{ t: "#", w: 20 }, { t: "Zona", w: 60 }, { t: "Descripción", w: CW - 20 - 60 - 56 - 56 - 36 - 86 }, { t: "Ancho (m)", w: 56, r: true }, { t: "Alto (m)", w: 56, r: true }, { t: "Cant.", w: 36, r: true }, { t: lastLabel, w: 86, r: true }];
  const tableHeader = () => {
    ensure(40); page.drawRectangle({ x: M, y: y - 6, width: CW, height: 19, color: navy });
    let x = M; for (const col of cols) { if (col.r) right(col.t, x + col.w - 6, y, { size: 7.8, font: bold, color: white }); else draw(col.t, x + 6, y, { size: 7.8, font: bold, color: white }); x += col.w; }
    y -= 21;
  };
  tableHeader();
  details.zones.forEach((z, i) => {
    const desc = wrap(z.description || "—", regular, 8.8, cols[2].w - 12);
    const notes = z.notes ? wrap(`Obs.: ${z.notes}`, regular, 8, CW - 96) : [];
    const h = desc.length * 11.5 + notes.length * 10.5 + 8;
    if (y - h < BOTTOM) { header(false); tableHeader(); }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - h + 10, width: CW, height: h, color: soft });
    const linear = z.linear_mm ?? (z.width_mm + z.height_mm) * z.quantity;
    const values = [String(i + 1), ZONE_LABELS[z.kind] ?? z.kind, "", meters(z.width_mm), meters(z.height_mm), String(z.quantity), measure === "ml" ? meters(linear) : area(z.area_milli_m2)];
    let x = M;
    cols.forEach((col, k) => {
      if (k === 2) desc.forEach((row, j) => draw(row, x + 6, y - j * 11.5, { size: 8.8 }));
      else if (col.r) right(values[k], x + col.w - 6, y, { size: 8.8, font: k === 6 ? bold : regular });
      else draw(values[k], x + 6, y, { size: 8.8 });
      x += col.w;
    });
    let yy = y - desc.length * 11.5;
    notes.forEach(row => { draw(row, M + 86, yy, { size: 8, color: muted }); yy -= 10.5; });
    y -= h;
  });
  ensure(26);
  page.drawRectangle({ x: M, y: y - 6, width: CW, height: 21, color: orangeSoft });
  const totalLinear = details.linear_mm ?? details.zones.reduce((s, z) => s + (z.linear_mm ?? (z.width_mm + z.height_mm) * z.quantity), 0);
  draw(measure === "ml" ? "Total metros lineales" : "Superficie total", M + 10, y + 1, { size: 9, font: bold, color: navy });
  right(measure === "ml" ? `${meters(totalLinear)} m` : `${area(details.area_milli_m2)} m²`, W - M - 6, y + 1, { size: 10, font: bold, color: navy });
  y -= 34;

  // 6. Conceptos y adicionales (netos).
  heading("Conceptos y adicionales (valores netos)", 50);
  const unitPrice = details.pricing.unit_price;
  const mainDetail = details.pricing.mode === "rate" && unitPrice
    ? measure === "ml" ? `${meters(totalLinear)} m lineales × ${clp(unitPrice)} neto` : `${area(details.area_milli_m2)} m² × ${clp(unitPrice)} neto`
    : "Valor neto acordado";
  const concepts: [string, string, number][] = [[details.pricing.rule_name || details.service, `${mainDetail}${details.pricing.min_applied ? " · se aplica valor mínimo" : ""}`, details.main_amount]];
  if (details.surcharge_amount > 0) concepts.push(["Recargo de tarifa", `${(details.pricing.surcharge_bps ?? 0) / 100}%`, details.surcharge_amount]);
  for (const extra of details.extras ?? []) concepts.push([extra.description, extra.quantity_milli && extra.unit_price ? `${qty(extra.quantity_milli)} × ${clp(extra.unit_price)} neto` : "", extra.amount]);
  const conceptW = CW * 0.46, detailW = CW - conceptW - 96;
  ensure(30); page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.6, color: lineColor });
  for (const [label, detail, value] of concepts) {
    const lr = wrap(label, bold, 9, conceptW - 12), dr = detail ? wrap(detail, regular, 8.5, detailW - 8) : [];
    const h = Math.max(lr.length, dr.length, 1) * 12 + 9;
    ensure(h);
    lr.forEach((row, j) => draw(row, M + 6, y - j * 12, { size: 9, font: bold }));
    dr.forEach((row, j) => draw(row, M + conceptW, y - j * 12, { size: 8.5, color: muted }));
    right(clp(value), W - M - 6, y, { size: 9.5, font: bold });
    page.drawLine({ start: { x: M, y: y - h + 12 }, end: { x: W - M, y: y - h + 12 }, thickness: 0.5, color: lineColor });
    y -= h;
  }
  y -= 10;

  // 7. Resumen económico.
  const taxed = q.tax > 0;
  const totals: [string, number][] = [["Subtotal neto", q.subtotal]];
  if (q.discount_amount) totals.push([`Descuento autorizado (${q.discount_bps / 100}%)`, -q.discount_amount], ["Neto", q.net]);
  if (taxed) totals.push([`IVA (${q.tax_bps / 100}%)`, q.tax]);
  const noteRows = definitive ? [] : wrap(REFERENTIAL_NOTE, regular, 8.5, CW - 24);
  heading("Resumen económico", totals.length * 19 + 40 + (noteRows.length ? noteRows.length * 11.5 + 24 : 0));
  const bw = 250, bx = W - M - bw;
  for (const [label, value] of totals) {
    draw(label, bx + 12, y, { size: 9.5, color: muted }); right(value < 0 ? `-${clp(-value)}` : clp(value), W - M - 10, y, { size: 9.5, font: bold });
    page.drawLine({ start: { x: bx, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.5, color: lineColor }); y -= 19;
  }
  y -= 4;
  page.drawRectangle({ x: bx, y: y - 10, width: bw, height: 30, color: navy }); page.drawRectangle({ x: bx, y: y - 10, width: 4, height: 30, color: orange });
  draw(taxed ? "TOTAL (IVA incluido)" : "TOTAL", bx + 14, y, { size: 11, font: bold, color: white }); right(clp(q.total), W - M - 10, y, { size: 13, font: bold, color: white });
  y -= 26;
  draw(taxed ? "Valores en pesos chilenos (CLP)." : "Valores en pesos chilenos (CLP). Operación sin IVA según indicación de Iron Mallas.", bx, y, { size: 7.5, color: muted }); y -= 16;
  if (noteRows.length) {
    const nh = noteRows.length * 11.5 + 22;
    ensure(nh);
    page.drawRectangle({ x: M, y: y - nh + 12, width: CW, height: nh, color: orangeSoft });
    page.drawRectangle({ x: M, y: y - nh + 12, width: 3, height: nh, color: orange });
    draw("Valor referencial", M + 12, y - 2, { size: 8.5, font: bold, color: navy });
    noteRows.forEach((row, i) => draw(row, M + 12, y - 15 - i * 11.5, { size: 8.5 }));
    y -= nh + 8;
  }

  // 8. Vigencia y condiciones comerciales configuradas por Iron Mallas.
  heading("Vigencia y condiciones comerciales");
  para(`Vigencia: esta cotización es válida hasta el ${fmtDate(q.valid_until)}.`);
  para(`Condiciones de pago: ${q.payment_terms}`);
  if (q.warranty) para(`Garantía: ${q.warranty}`);
  if (q.notes) para(`Observaciones: ${q.notes}`);
  y -= 6;

  // 9. Términos y condiciones.
  heading("Términos y condiciones", 60);
  for (const section of QUOTE_TERMS) {
    ensure(36);
    para(section.title, { font: bold, size: 8.8, color: navy, gap: 1 });
    for (const text of section.paragraphs) para(text, { size: 8.3, gap: 2 });
    for (const item of section.items ?? []) {
      const rows = wrap(item, regular, 8.3, CW - 14);
      ensure(rows.length * 11.9);
      page.drawRectangle({ x: M + 3, y: y + 2, width: 3, height: 3, color: orange });
      rows.forEach((row, i) => draw(row, M + 12, y - i * 11.9, { size: 8.3 }));
      y -= rows.length * 11.9;
    }
    if (section.items?.length) y -= 2;
    for (const text of section.after ?? []) para(text, { size: 8.3, gap: 2 });
    y -= 4;
  }

  // 10. Contacto.
  ensure(58); y -= 4;
  page.drawRectangle({ x: M, y: y - 40, width: CW, height: 52, color: navy });
  page.drawRectangle({ x: M, y: y - 40, width: 4, height: 52, color: orange });
  draw("¿Aceptas la cotización o tienes dudas?", M + 16, y - 6, { size: 10.5, font: bold, color: white });
  draw([`WhatsApp ${phone}`, email, company.website].join("   ·   "), M + 16, y - 24, { size: 9, color: white });

  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 50 }, end: { x: W - M, y: 50 }, thickness: 0.5, color: lineColor });
    const foot = (t: string, yy: number) => pg.drawText(safe(t), { x: M, y: yy, size: 7.2, font: regular, color: muted });
    foot(`${companyIdentification} · ${company.addressShort}`, 38);
    foot(`${email} · ${phone} · ${company.website} · ${code} v${q.current_version} · Presupuesto: no constituye boleta ni factura.`, 28);
    const label = safe(`Página ${i + 1} de ${pages.length}`);
    pg.drawText(label, { x: W - M - bold.widthOfTextAtSize(label, 7.2), y: 28, size: 7.2, font: bold, color: navy });
  });
  return doc.save();
}
