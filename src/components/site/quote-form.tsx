"use client";

import { useActionState, useEffect, useId, useRef, startTransition, type ReactNode } from "react";
import { AlertTriangle, CircleCheck, LoaderCircle, Send } from "lucide-react";

import type { QuoteFormContent } from "@/content/types";
import { submitLead } from "@/features/leads/actions";
import type { LeadFieldErrors, LeadFormState } from "@/features/leads/schema";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const TRACKING_KEY = "im_first_touch";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type Tracking = Partial<Record<(typeof UTM_KEYS)[number] | "landing_page" | "referrer", string>>;

/** First-touch attribution for this browser session (UTMs, landing page, referrer). */
function readTracking(): Tracking {
  try {
    const stored = sessionStorage.getItem(TRACKING_KEY);
    if (stored) return JSON.parse(stored) as Tracking;
  } catch {}
  const params = new URLSearchParams(window.location.search);
  const tracking: Tracking = {
    landing_page: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
  };
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) tracking[key] = value;
  }
  try {
    sessionStorage.setItem(TRACKING_KEY, JSON.stringify(tracking));
  } catch {}
  return tracking;
}

const inputClasses =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[0.95rem] text-ink outline-none transition placeholder:text-ink-soft/70 focus:border-navy-500 focus:bg-white focus:ring-4 focus:ring-navy-100 aria-invalid:border-red-500 aria-invalid:ring-red-100";

function Field({
  id,
  label,
  required,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-700">
        {label} {required ? <span className="text-orange-700">*</span> : <span className="font-normal text-ink-soft">(opcional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function QuoteForm({ content }: { content: QuoteFormContent }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(submitLead, { status: "idle" });
  const startedAt = useRef<number>(0);
  const statusRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  useEffect(() => {
    startedAt.current = Date.now();
    readTracking();
  }, []);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const errors: LeadFieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const a11y = (name: keyof LeadFieldErrors) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${id(name)}-error` } : {};

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="py-10 text-center outline-none">
        <CircleCheck className="mx-auto size-16 text-green-600" aria-hidden="true" />
        <h3 className="mt-4 text-2xl font-semibold uppercase tracking-wide text-navy-700">¡Solicitud recibida!</h3>
        <p className="mt-2 text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(e) => {
        // With JS: submit manually so field values survive validation errors.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("startedAt", String(startedAt.current));
        for (const [key, value] of Object.entries(readTracking())) {
          if (value) data.set(key, value);
        }
        startTransition(() => formAction(data));
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <Field id={id("name")} label="Nombre" required error={errors.name}>
        <input id={id("name")} name="name" type="text" autoComplete="name" placeholder="Tu nombre completo" required maxLength={80} className={inputClasses} {...a11y("name")} />
      </Field>
      <Field id={id("phone")} label="Teléfono" required error={errors.phone}>
        <input id={id("phone")} name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+569 XXXX XXXX" required maxLength={20} className={inputClasses} {...a11y("phone")} />
      </Field>
      <Field id={id("email")} label="Correo electrónico" required error={errors.email} className="sm:col-span-2">
        <input id={id("email")} name="email" type="email" autoComplete="email" placeholder="tu@correo.cl" required maxLength={120} className={inputClasses} {...a11y("email")} />
      </Field>
      <Field id={id("service")} label="Servicio de interés" required error={errors.service}>
        <select id={id("service")} name="service" required defaultValue="" className={cn(inputClasses, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2306365A%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:1.1rem] bg-[right_1rem_center] bg-no-repeat pr-10")} {...a11y("service")}>
          <option value="" disabled>
            Selecciona un servicio
          </option>
          {content.serviceOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      <Field id={id("commune")} label="Comuna" error={errors.commune}>
        <input id={id("commune")} name="commune" type="text" autoComplete="address-level2" placeholder="Ej: Ñuñoa" maxLength={60} className={inputClasses} {...a11y("commune")} />
      </Field>
      <Field id={id("message")} label="Mensaje" error={errors.message} className="sm:col-span-2">
        <textarea id={id("message")} name="message" rows={4} maxLength={1500} placeholder="Cuéntanos sobre tu proyecto: tipo de espacio, medidas aproximadas, urgencia..." className={cn(inputClasses, "resize-y")} {...a11y("message")} />
      </Field>

      {/* Honeypot — visually hidden and skipped by assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Sitio web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
          <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-navy-700" {...a11y("consent")} />
          <span>Acepto que Iron Mallas use estos datos para responder mi solicitud de cotización.</span>
        </label>
        {errors.consent && (
          <p id={`${id("consent")}-error`} className="mt-1.5 text-sm text-red-700">
            {errors.consent}
          </p>
        )}
      </div>

      <div ref={statusRef} tabIndex={-1} aria-live="polite" className="outline-none sm:col-span-2 empty:hidden">
        {(state.status === "invalid" || state.status === "error") && (
          <p className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        )}
        {state.status === "unavailable" && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <p className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {state.message}
            </p>
            <a href={state.whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "mt-3")}>
              <WhatsAppIcon size={18} />
              Enviar por WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="border-t border-line pt-5 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
          {pending ? "Enviando…" : "Enviar solicitud"}
        </button>
        <p className="mt-3 text-center text-xs text-ink-soft">{content.privacyNote}</p>
        <noscript>
          <p className="mt-3 text-center text-sm text-orange-800">
            Para enviar el formulario necesitas JavaScript activado. También puedes escribirnos por WhatsApp.
          </p>
        </noscript>
      </div>
    </form>
  );
}
