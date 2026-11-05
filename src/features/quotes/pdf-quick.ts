import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { QuoteSnapshot, QuickDetails } from "./snapshot";
import { clp } from "./calculation";
import { navy, orange, ink, muted, lineColor, safe, wrap } from "./pdf";

const ZONE_LABELS: Record<string, string> = { balcon: "Balcón", ventana: "Ventana", logia: "Logia", terraza: "Terraza", otra: "Otra zona" };
const white = rgb(1, 1, 1), soft = rgb(0.95, 0.96, 0.97), orangeSoft = rgb(1, 0.95, 0.91);
const meters = (mm: number) => (mm / 1000).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const area = (milli: number) => `${Math.trunc(milli / 1000).toLocaleString("es-CL")},${String(milli % 1000).padStart(3, "0")}`;
type Color = ReturnType<typeof rgb>;
type TextOptions = { size?: number; font?: PDFFont; color?: Color };

/** Presupuesto del cotizador rápido: identidad Iron Mallas (#06365A / #FC6B04), tabla de medidas y conceptos. */
export async function generateQuickPdf(snapshot: QuoteSnapshot, details: QuickDetails, logo?: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const q = snapshot.quote, c = snapshot.contact, co = snapshot.company;
  const code = `IM-${String(q.number).padStart(6, "0")}`;
  doc.setTitle(`Presupuesto ${code} · v${q.current_version}`); doc.setAuthor(co.name); doc.setSubject("Presupuesto Iron Mallas"); doc.setCreator("Iron Mallas 2.0");
  const created = new Date(q.created_at);
  if (!Number.isNaN(created.getTime())) { doc.setCreationDate(created); doc.setModificationDate(created); }
  const regular = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = logo ? await doc.embedPng(logo) : null;
  const W = 595.28, H = 841.89, M = 40, CW = W - 2 * M;
  let page!: PDFPage; let y = 0;

  const fmtDate = (value: string) => {
    const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(d);
  };
  const draw = (t: string, x: number, yy: number, o: TextOptions = {}) => page.drawText(safe(t), { x, y: yy, size: o.size ?? 9.5, font: o.font ?? regular, color: o.color ?? ink });
  const right = (t: string, xr: number, yy: number, o: TextOptions = {}) => { const f = o.font ?? regular, sz = o.size ?? 9.5; draw(t, xr - f.widthOfTextAtSize(safe(t), sz), yy, o); };

  function header(first: boolean) {
    page = doc.addPage([W, H]);
    const band = first ? 118 : 62;
    page.drawRectangle({ x: 0, y: H - band, width: W, height: band, color: navy });
    page.drawRectangle({ x: 0, y: H - band - 5, width: W, height: 5, color: orange });
    if (logoImage) { const s = logoImage.scaleToFit(first ? 190 : 120, first ? 46 : 28); page.drawImage(logoImage, { x: M, y: H - (first ? 30 : 17) - s.height, width: s.width, height: s.height }); }
    else draw("IRON MALLAS", M, H - (first ? 58 : 38), { size: first ? 24 : 15, font: bold, color: white });
    right(first ? "PRESUPUESTO" : `PRESUPUESTO ${code}`, W - M, H - (first ? 48 : 36), { size: first ? 20 : 11, font: bold, color: white });
    if (first) {
      right(`N° ${code} · Versión ${q.current_version}`, W - M, H - 68, { size: 10, font: bold, color: orange });
      right(`Emitido: ${fmtDate(q.created_at)}`, W - M, H - 84, { size: 9, color: white });
      right(`Válido hasta: ${fmtDate(q.valid_until)}`, W - M, H - 98, { size: 9, color: white });
    }
    y = H - band - 30;
  }
  const ensure = (h: number) => { if (y - h < 70) header(false); };
  function heading(t: string) { ensure(34); draw(t.toUpperCase(), M, y, { size: 10.5, font: bold, color: navy }); page.drawRectangle({ x: M, y: y - 5, width: 28, height: 2, color: orange }); y -= 20; }
  function para(t: string, o: TextOptions = {}) { const sz = o.size ?? 9.5, f = o.font ?? regular; for (const row of wrap(t, f, sz, CW)) { ensure(sz + 4); draw(row, M, y, { size: sz, font: f, color: o.color }); y -= sz + 4; } }

  header(true);
  // Emisor y cliente en dos columnas. Solo datos configurados: no se inventan RUT ni razón social.
  const colW = (CW - 20) / 2, top = y;
  const block = (x: number, title: string, lines: string[]) => {
    let yy = top; draw(title, x, yy, { size: 8, font: bold, color: muted }); yy -= 14;
    lines.filter(Boolean).forEach((line, i) => { for (const row of wrap(line, i ? regular : bold, i ? 9 : 10.5, colW)) { draw(row, x, yy, { size: i ? 9 : 10.5, font: i ? regular : bold }); yy -= i ? 12 : 14; } });
    return yy;
  };
  const contactPhone = c.whatsapp || c.phone;
  const yLeft = block(M, "DE", [co.name, co.rut ? `RUT ${co.rut}` : "", co.address ?? "", co.phone ? `Teléfono / WhatsApp: ${co.phone}` : "", co.email ?? ""]);
  const yRight = block(M + colW + 20, "PARA", [c.name, contactPhone ? `WhatsApp: ${contactPhone}` : "", c.email ?? "", [c.address, c.commune].filter(Boolean).join(", ")]);
  y = Math.min(yLeft, yRight) - 10;
  const workAddress = details.work_address || [c.address, c.unit ? `Depto./unidad ${c.unit}` : "", c.commune, c.region].filter(Boolean).join(", ");
  const serviceLine = [details.service, details.mesh_type].filter(Boolean).join(" · ");
  const boxRows = Math.max(wrap(workAddress || "Por confirmar", bold, 9.5, CW / 2 - 20).length, wrap(serviceLine, bold, 9.5, CW / 2 - 20).length);
  const boxH = 24 + boxRows * 12;
  page.drawRectangle({ x: M, y: y - boxH + 8, width: CW, height: boxH, color: soft });
  draw("DIRECCIÓN DEL TRABAJO", M + 10, y - 6, { size: 7.5, font: bold, color: muted });
  wrap(workAddress || "Por confirmar", bold, 9.5, CW / 2 - 20).forEach((row, i) => draw(row, M + 10, y - 20 - i * 12, { font: bold }));
  draw("SERVICIO SOLICITADO", M + CW / 2, y - 6, { size: 7.5, font: bold, color: muted });
  wrap(serviceLine, bold, 9.5, CW / 2 - 20).forEach((row, i) => draw(row, M + CW / 2, y - 20 - i * 12, { font: bold }));
  y -= boxH + 12;
  if (details.features?.length) { para(`Características: ${details.features.join(" · ")}`, { size: 9, color: muted }); y -= 4; }

  // Tabla de medidas.
  heading("Zonas a proteger");
  const cols = [{ t: "#", w: 22 }, { t: "Zona", w: 62 }, { t: "Descripción", w: CW - 22 - 62 - 58 - 58 - 40 - 72 }, { t: "Ancho (m)", w: 58, r: true }, { t: "Alto (m)", w: 58, r: true }, { t: "Cant.", w: 40, r: true }, { t: "Superficie m²", w: 72, r: true }];
  const tableHeader = () => {
    ensure(24); page.drawRectangle({ x: M, y: y - 6, width: CW, height: 20, color: navy });
    let x = M; for (const col of cols) { if (col.r) right(col.t, x + col.w - 6, y, { size: 8, font: bold, color: white }); else draw(col.t, x + 6, y, { size: 8, font: bold, color: white }); x += col.w; }
    y -= 22;
  };
  tableHeader();
  details.zones.forEach((z, i) => {
    const desc = wrap(z.description || "—", regular, 9, cols[2].w - 12);
    const notes = z.notes ? wrap(`Obs.: ${z.notes}`, regular, 8, CW - 96) : [];
    const h = Math.max(desc.length, 1) * 12 + notes.length * 11 + 8;
    if (y - h < 70) { header(false); tableHeader(); }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - h + 10, width: CW, height: h, color: soft });
    const values = [String(i + 1), ZONE_LABELS[z.kind] ?? z.kind, "", meters(z.width_mm), meters(z.height_mm), String(z.quantity), area(z.area_milli_m2)];
    let x = M;
    cols.forEach((col, k) => {
      if (k === 2) desc.forEach((row, j) => draw(row, x + 6, y - j * 12, { size: 9 }));
      else if (col.r) right(values[k], x + col.w - 6, y, { size: 9, font: k === 6 ? bold : regular });
      else draw(values[k], x + 6, y, { size: 9 });
      x += col.w;
    });
    let yy = y - Math.max(desc.length, 1) * 12;
    notes.forEach(row => { draw(row, M + 90, yy, { size: 8, color: muted }); yy -= 11; });
    y -= h;
  });
  ensure(26);
  page.drawRectangle({ x: M, y: y - 6, width: CW, height: 22, color: orangeSoft });
  draw("Superficie total", M + 10, y + 1, { font: bold, color: navy });
  right(`${area(details.area_milli_m2)} m²`, W - M - 6, y + 1, { size: 10.5, font: bold, color: navy });
  y -= 34;

  // Conceptos y valores netos.
  heading("Conceptos y valores (netos)");
  const mainLabel = details.pricing.mode === "rate" && details.pricing.unit_price
    ? `${details.service} · ${area(details.area_milli_m2)} m² × ${clp(details.pricing.unit_price)}/m²${details.pricing.min_applied ? " (se aplica valor mínimo)" : ""}`
    : `${details.service} · ${area(details.area_milli_m2)} m²`;
  const concepts: [string, number][] = [[mainLabel, details.main_amount]];
  if (details.surcharge_amount > 0) concepts.push([`Recargo (${(details.pricing.surcharge_bps ?? 0) / 100}%)`, details.surcharge_amount]);
  for (const extra of details.extras ?? []) concepts.push([extra.description, extra.amount]);
  concepts.forEach(([label, value], i) => {
    const rows = wrap(label, regular, 9.5, CW - 130); const h = rows.length * 13 + 8;
    ensure(h); if (i % 2 === 0) page.drawRectangle({ x: M, y: y - h + 11, width: CW, height: h, color: soft });
    rows.forEach((row, j) => draw(row, M + 8, y - j * 13)); right(clp(value), W - M - 8, y, { font: bold }); y -= h;
  });
  y -= 8;
  const totals: [string, number, boolean][] = [["Subtotal", q.subtotal, false]];
  if (q.discount_amount) totals.push([`Descuento (${q.discount_bps / 100}%)`, -q.discount_amount, false]);
  totals.push(["Neto", q.net, false], [`IVA (${q.tax_bps / 100}%)`, q.tax, false], ["TOTAL", q.total, true]);
  ensure(totals.length * 20 + 24);
  const bx = W - M - 230;
  for (const [label, value, final] of totals) {
    if (final) {
      page.drawRectangle({ x: bx, y: y - 9, width: 230, height: 28, color: navy }); page.drawRectangle({ x: bx, y: y - 9, width: 4, height: 28, color: orange });
      draw(label, bx + 14, y, { size: 12, font: bold, color: white }); right(clp(value), W - M - 10, y, { size: 13, font: bold, color: white }); y -= 36;
    } else {
      draw(label, bx + 14, y, { color: muted }); right(value < 0 ? `-${clp(-value)}` : clp(value), W - M - 10, y, { font: bold });
      page.drawLine({ start: { x: bx, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.5, color: lineColor }); y -= 20;
    }
  }
  draw("Valores en pesos chilenos (CLP).", bx, y, { size: 7.5, color: muted }); y -= 22;

  // Condiciones aprobadas en la configuración comercial.
  heading("Condiciones comerciales"); para(q.payment_terms, { size: 9 }); y -= 4;
  para(`Vigencia: este presupuesto es válido hasta el ${fmtDate(q.valid_until)}.`, { size: 9 });
  if (q.warranty) { y -= 4; heading("Garantía"); para(q.warranty, { size: 9 }); }
  if (q.notes) { y -= 4; heading("Observaciones"); para(q.notes, { size: 9 }); }
  y -= 6; ensure(56);
  page.drawRectangle({ x: M, y: y - 38, width: CW, height: 48, color: orangeSoft });
  draw("¿Aceptas el presupuesto o tienes dudas?", M + 12, y - 6, { size: 10, font: bold, color: navy });
  draw([co.phone ? `WhatsApp ${co.phone}` : "", co.email ?? "", "ironmallas.cl"].filter(Boolean).join("  ·  "), M + 12, y - 22);
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.5, color: lineColor });
    pg.drawText(safe(`${co.name} · ${code} v${q.current_version} · Presupuesto, no constituye factura`), { x: M, y: 30, size: 7.5, font: regular, color: muted });
    const label = safe(`Página ${i + 1} de ${pages.length}`);
    pg.drawText(label, { x: W - M - regular.widthOfTextAtSize(label, 7.5), y: 30, size: 7.5, font: regular, color: muted });
  });
  return doc.save();
}
