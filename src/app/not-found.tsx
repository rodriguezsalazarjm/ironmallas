import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy-700 p-6 text-center text-white">
      <div>
        <p className="font-display text-7xl font-bold text-orange-500">404</p>
        <h1 className="mt-3 text-2xl font-semibold uppercase tracking-wide">Página no encontrada</h1>
        <p className="mt-2 text-navy-100">La página que buscas no existe o fue movida.</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-orange-500 px-6 font-bold uppercase tracking-wide text-navy-950 transition hover:bg-orange-400"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
