"use client";
import { useId, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { CalEmbed } from "./cal-embed";
import { CAL_BOOKING_FIELDS } from "@/content/cal-fields";

const ZONES = { balcon: "Balcón", ventana: "Ventana", logia: "Logia", terraza: "Terraza", otra: "Otra" } as const;
type Data = { name: string; email: string; whatsapp: string; address: string; commune: string; zone: keyof typeof ZONES; details: string };
const input = "w-full min-h-12 rounded-xl border border-line bg-white px-3 py-3 text-base text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100";

/**
 * Step 1 collects the visit data and consent; step 2 opens Cal.com availability with those answers prefilled.
 * Nothing is stored by this page: the booking (and its webhook) happens in Cal.com. Installations cannot be booked here.
 */
export function BookingFlow({ link, namespace, origin }: { link: string; namespace: string; origin: string }) {
  const id = useId();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const phone = get("whatsapp").replace(/\D/g, "");
    if (get("name").length < 2 || !/^\S+@\S+\.\S+$/.test(get("email")) || phone.length < 8 || phone.length > 15 || get("address").length < 3 || get("commune").length < 2) { setError("Completa nombre, correo, WhatsApp, dirección y comuna."); return; }
    if (f.get("consent") !== "on") { setError("Debes aceptar el tratamiento de datos para agendar."); return; }
    setError("");
    setData({ name: get("name"), email: get("email"), whatsapp: get("whatsapp"), address: get("address"), commune: get("commune"), zone: (get("zone") || "balcon") as Data["zone"], details: get("details") });
  }
  if (data) {
    const f = CAL_BOOKING_FIELDS;
    const prefill = { name: data.name, email: data.email, [f.whatsapp]: data.whatsapp, [f.address]: data.address, [f.commune]: data.commune, [f.zone]: data.zone, [f.details]: data.details, [f.consent]: "true", "metadata[consent]": "1", "metadata[origin]": "web" };
    return <div>
      <button type="button" onClick={() => setData(null)} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Editar mis datos</button>
      <p className="mb-3 rounded-xl bg-navy-50 p-3 text-sm text-navy-800">Visita técnica para <strong>{data.address}, {data.commune}</strong>. Elige día y hora disponibles para confirmar la reserva.</p>
      <CalEmbed link={link} namespace={namespace} origin={origin} prefill={prefill} />
    </div>;
  }
  return <form onSubmit={submit} noValidate className="grid gap-4 p-1 sm:grid-cols-2" aria-describedby={error ? `${id}-error` : undefined}>
    <label className="grid gap-1.5 text-sm font-medium">Nombre *<input name="name" autoComplete="name" required minLength={2} maxLength={80} className={input} /></label>
    <label className="grid gap-1.5 text-sm font-medium">Correo *<input name="email" type="email" autoComplete="email" required maxLength={120} className={input} /></label>
    <label className="grid gap-1.5 text-sm font-medium">WhatsApp *<input name="whatsapp" type="tel" autoComplete="tel" required maxLength={24} placeholder="+56 9 1234 5678" className={input} /></label>
    <label className="grid gap-1.5 text-sm font-medium">Tipo de zona<select name="zone" className={input} defaultValue="balcon">{Object.entries(ZONES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Dirección del trabajo *<input name="address" autoComplete="street-address" required maxLength={240} placeholder="Calle, número, depto." className={input} /></label>
    <label className="grid gap-1.5 text-sm font-medium">Comuna *<input name="commune" autoComplete="address-level2" required maxLength={60} className={input} /></label>
    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Información relevante<textarea name="details" rows={3} maxLength={1500} placeholder="Piso, acceso, cantidad de ventanas, mascotas o niños…" className={input} /></label>
    <label className="flex gap-3 text-sm sm:col-span-2"><input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-navy-700" /><span>Acepto que Iron Mallas use estos datos para coordinar y realizar la visita técnica, según su <a href="/politica-de-privacidad" target="_blank" className="underline">política de privacidad</a>. La reserva se gestiona con Cal.com, proveedor de agenda.</span></label>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
    <button type="submit" className="min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 sm:col-span-2">Ver horarios disponibles</button>
    <p className="text-xs text-ink-soft sm:col-span-2">Las instalaciones se coordinan después de la visita y la cotización aceptada.</p>
  </form>;
}
