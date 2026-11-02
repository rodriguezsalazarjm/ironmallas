import Link from "next/link";
import { LockKeyhole } from "lucide-react";

/** Placeholder: no data, no login form until real authentication exists (Phase 2). */
export default function AdminPlaceholderPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy-700 text-orange-400">
          <LockKeyhole className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold uppercase tracking-wide text-navy-700">Panel administrativo</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          El panel de gestión aún no está habilitado. Se activará con autenticación y roles en la siguiente fase del
          proyecto.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-navy-700 underline-offset-4 hover:underline">
          Volver al sitio
        </Link>
      </div>
    </main>
  );
}
