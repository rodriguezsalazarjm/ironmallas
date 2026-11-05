import { ExternalLink, MessageSquareText, Star } from "lucide-react";
import type { GoogleReviewsState } from "@/features/reviews/google";
import { buttonClasses } from "@/components/ui/button";

export function GoogleReviews({ state, admin = false }: { state: GoogleReviewsState; admin?: boolean }) {
  const connected = state.status === "connected";
  return <section id={admin ? undefined : "resenas-google"} aria-labelledby={admin ? "google-admin-title" : "google-title"} className={admin ? "rounded-2xl border border-line bg-white p-5 sm:p-6" : "border-y border-line bg-surface py-16 sm:py-20"}>
    <div className={admin ? "" : "container-site"}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Reseñas de Google</p>
          <h2 id={admin ? "google-admin-title" : "google-title"} className="mt-2 text-3xl font-semibold text-navy-700">Experiencias que nos ayudan a mejorar</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">Opiniones publicadas por clientes en Google, separadas de los testimonios compartidos directamente con Iron Mallas.</p>
        </div>
        {connected && <div className="rounded-2xl border border-line bg-white p-5"><p className="flex items-center gap-2 text-2xl font-bold text-navy-700"><Star className="size-5 text-orange-700" aria-hidden="true"/>{state.average === null ? "Sin calificación" : `${state.average.toLocaleString("es-CL", { maximumFractionDigits: 1 })} de 5`}</p><p className="mt-1 text-sm text-ink-soft">{state.total} reseñas en Google</p></div>}
      </div>
      {!connected ? <div className="mt-7 flex items-start gap-4 rounded-2xl border border-dashed border-navy-200 bg-white p-5 sm:p-7"><MessageSquareText className="mt-1 size-6 shrink-0 text-navy-500" aria-hidden="true"/><div><h3 className="text-lg font-semibold text-navy-700">{state.status === "unavailable" ? "Reseñas temporalmente no disponibles" : admin ? "Google todavía no está conectado" : "Aún no mostramos reseñas de Google aquí"}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{admin ? "Pendiente: verificar la ficha y sus enlaces, obtener autorización del propietario y habilitar la API oficial. No hay sincronización ni cifras de Google disponibles." : "Cuando estén disponibles, podrás consultar las opiniones y acceder a la ficha oficial desde esta sección."}</p>{!admin && <a href="#portafolio" className="mt-3 inline-flex min-h-11 items-center font-semibold text-navy-700 underline underline-offset-4">Conoce nuestros trabajos</a>}</div></div> : <>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.reviews.map(review => <figure key={review.id} className="min-w-0 rounded-2xl border border-line bg-white p-6"><figcaption className="break-words font-semibold text-navy-700">{review.author}</figcaption><p className="mt-2 text-sm text-orange-700" aria-label={`${review.rating} de 5 estrellas`}>{"★".repeat(review.rating)}<span aria-hidden="true" className="text-ink-soft">{"☆".repeat(5 - review.rating)}</span></p><blockquote className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{review.comment || "Esta reseña solo contiene una calificación."}</blockquote><time dateTime={review.date} className="mt-4 block text-xs text-ink-soft">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(review.date))}</time><a href={state.links.view} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy-700 underline">Ver ficha en Google<ExternalLink className="size-4" aria-hidden="true"/></a></figure>)}</div>
        {!state.total && <p className="mt-6 text-sm text-ink-soft">La ficha de Google todavía no tiene reseñas.</p>}
        <div className="mt-6 flex flex-wrap gap-3"><a href={state.links.view} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>Ver reseñas en Google<ExternalLink className="size-4" aria-hidden="true"/></a><a href={state.links.write} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md")}>Dejar una reseña</a></div>
        {admin && <p className="mt-4 text-xs text-ink-soft">Última consulta: {state.fetchedAt}. Promedio y total oficiales; no calculados desde testimonios manuales.</p>}
      </>}
    </div>
  </section>;
}
