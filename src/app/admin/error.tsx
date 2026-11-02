"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <main className="p-8"><h1 className="text-2xl font-bold text-navy-700">No pudimos cargar el panel</h1><p className="my-4">Revisa la conexión o contacta al administrador si el problema continúa.</p><button onClick={reset} className="rounded-xl bg-navy-700 px-5 py-3 text-white">Reintentar</button></main>;
}
