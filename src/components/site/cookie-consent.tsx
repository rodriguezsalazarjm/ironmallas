"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, optionalTrackers, readConsentCookie, serializeConsent, type ConsentChoice } from "@/features/consent/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const available = optionalTrackers({ ga: GA_ID, pixel: PIXEL_ID });
const OPEN_CONSENT_EVENT = "im:open-consent";

type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][]; callMethod?: (...args: unknown[]) => void; loaded: boolean; version: string };

function save(choice: ConsentChoice) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(choice)}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

function inject(id: string, src: string) {
  const script = document.createElement("script");
  script.id = id; script.async = true; script.src = src;
  document.head.appendChild(script);
}

function loadAnalytics() {
  if (!available.analytics || document.getElementById("im-ga")) return;
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = (...args: unknown[]) => { w.dataLayer.push(args); };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, { anonymize_ip: true });
  inject("im-ga", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
}

function loadPixel() {
  if (!available.marketing || document.getElementById("im-pixel")) return;
  const fbq = ((...args: unknown[]) => { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args); }) as Fbq;
  fbq.queue = []; fbq.loaded = true; fbq.version = "2.0";
  (window as unknown as { fbq: Fbq; _fbq: Fbq }).fbq = fbq;
  (window as unknown as { _fbq: Fbq })._fbq = fbq;
  fbq("init", PIXEL_ID);
  fbq("track", "PageView");
  inject("im-pixel", "https://connect.facebook.net/en_US/fbevents.js");
}

/**
 * Banner granular. Solo aparece automáticamente cuando hay al menos una categoría opcional configurada
 * (NEXT_PUBLIC_GA_ID o NEXT_PUBLIC_META_PIXEL_ID). Los rastreadores se cargan únicamente después de aceptarlos.
 * Si se revoca un permiso ya otorgado, la página se recarga para descargar los scripts.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [configure, setConfigure] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>({ analytics: false, marketing: false });
  const hasOptional = available.analytics || available.marketing;

  useEffect(() => {
    const stored = readConsentCookie(document.cookie);
    const reopen = () => { setConfigure(true); setOpen(true); };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    queueMicrotask(() => {
      if (stored) {
        setChoice({ analytics: stored.analytics, marketing: stored.marketing });
        if (stored.analytics) loadAnalytics();
        if (stored.marketing) loadPixel();
      } else if (hasOptional) setOpen(true);
    });
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, [hasOptional]);

  function decide(next: ConsentChoice) {
    const previous = readConsentCookie(document.cookie);
    save(next); setChoice(next); setOpen(false); setConfigure(false);
    if ((previous?.analytics && !next.analytics) || (previous?.marketing && !next.marketing)) { location.reload(); return; }
    if (next.analytics) loadAnalytics();
    if (next.marketing) loadPixel();
  }

  if (!open) return null;
  const button = "min-h-11 rounded-xl px-4 text-sm font-semibold";
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookie-title" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl rounded-2xl border border-line bg-white p-5 text-ink shadow-card sm:inset-x-6">
      <h2 id="cookie-title" className="text-lg font-semibold text-navy-700">Preferencias de cookies</h2>
      {hasOptional ? (
        <p className="mt-2 text-sm">Usamos cookies necesarias para que el sitio funcione. Con tu permiso, también usaríamos cookies opcionales para medir visitas o campañas. Puedes aceptarlas, rechazarlas o elegir por categoría. <Link className="underline" href="/politica-de-cookies">Política de cookies</Link>.</p>
      ) : (
        <p className="mt-2 text-sm">Actualmente este sitio solo usa cookies necesarias y no carga herramientas de analítica ni de publicidad. <Link className="underline" href="/politica-de-cookies">Política de cookies</Link>.</p>
      )}
      {configure && hasOptional && (
        <fieldset className="mt-4 grid gap-3 text-sm">
          <legend className="sr-only">Categorías de cookies</legend>
          <label className="flex items-start gap-3"><input type="checkbox" checked disabled className="mt-1" /><span><strong>Necesarias</strong> · siempre activas (sesión del panel y esta preferencia).</span></label>
          {available.analytics && <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={choice.analytics} onChange={e => setChoice(c => ({ ...c, analytics: e.target.checked }))} /><span><strong>Analítica</strong> · Google Analytics: estadísticas de visitas.</span></label>}
          {available.marketing && <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={choice.marketing} onChange={e => setChoice(c => ({ ...c, marketing: e.target.checked }))} /><span><strong>Marketing</strong> · Meta Pixel: medición de campañas en Facebook e Instagram.</span></label>}
        </fieldset>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {hasOptional ? <>
          <button type="button" onClick={() => decide({ analytics: available.analytics, marketing: available.marketing })} className={`${button} bg-navy-700 text-white`}>Aceptar todas</button>
          <button type="button" onClick={() => decide({ analytics: false, marketing: false })} className={`${button} border border-navy-700 text-navy-700`}>Rechazar opcionales</button>
          {configure
            ? <button type="button" onClick={() => decide(choice)} className={`${button} border border-line`}>Guardar selección</button>
            : <button type="button" onClick={() => setConfigure(true)} className={`${button} border border-line`}>Configurar</button>}
        </> : <button type="button" onClick={() => setOpen(false)} className={`${button} bg-navy-700 text-white`}>Entendido</button>}
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>Preferencias de cookies</button>;
}
