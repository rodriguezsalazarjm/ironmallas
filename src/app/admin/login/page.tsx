import Link from "next/link";
import { LoginForm } from "@/components/admin/forms";
import { supabaseConfig } from "@/lib/supabase/config";
export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const configured = !!supabaseConfig();
  const params = await searchParams;
  return <main className="grid min-h-dvh place-items-center px-5 py-12"><div className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-card">
    <p className="font-semibold text-orange-700">IRON MALLAS · ADMINISTRACIÓN</p><h1 className="my-5 text-3xl font-bold text-navy-700">Acceso al panel</h1>
    {!configured && <p className="mb-5 rounded-xl bg-orange-50 p-4 text-sm">Acceso pendiente de configuración de Supabase. El formulario público mantiene la alternativa de WhatsApp.</p>}
    {params.error === "access" && <p role="alert" className="mb-4 text-red-700">Tu cuenta no tiene un perfil administrativo activo.</p>}
    <LoginForm disabled={!configured} /><p className="mt-5 text-sm text-ink-soft">Acceso exclusivo para cuentas habilitadas por el administrador.</p><Link href="/" className="mt-6 inline-block underline">Volver al sitio</Link>
  </div></main>;
}
