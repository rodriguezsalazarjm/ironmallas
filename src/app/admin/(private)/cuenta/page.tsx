import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {PasswordForm} from "@/features/users/forms";
import {StatusForm} from "@/components/admin/forms";
import {PageHeading,Panel} from "@/features/crm/ui";

const technical=[
  ["/admin/tarifario","Tarifario y condiciones comerciales","Tarifas por m², mínimos, IVA, validez y condiciones que usa el cotizador."],
  ["/admin/usuarios","Usuarios autorizados","Accesos y responsables del panel."],
  ["/admin/privacidad","Solicitudes de privacidad","Procedimiento interno para acceso, rectificación, exportación o eliminación de datos."],
  ["/admin/notificaciones","Notificaciones","Avisos internos por correo."],
  ["/admin/auditoria","Auditoría","Registro de acciones administrativas."],
] as const;

export default async function AccountPage(){
  const {db,profile}=await requireAdmin();
  const superadmin=profile.role==="SUPERADMIN";
  const statuses=superadmin?await db.from("lead_statuses").select("*").order("position"):null;
  if(statuses?.error)throw new Error("No se pudo cargar la configuración.");
  const integrations=[
    ["Formulario web → Supabase",process.env.SUPABASE_SECRET_KEY&&(process.env.LEAD_RATE_LIMIT_SECRET?.length??0)>=32?"configurado":"pendiente (se ofrece WhatsApp como respaldo)"],
    ["Meta Lead Ads",process.env.META_APP_SECRET&&process.env.META_PAGE_ACCESS_TOKEN&&process.env.META_VERIFY_TOKEN?"credenciales presentes; verificar con lead de prueba":"pendiente de credenciales y permisos de Meta"],
    ["WhatsApp Cloud API",process.env.WHATSAPP_APP_SECRET&&process.env.WHATSAPP_VERIFY_TOKEN?"credenciales presentes; verificar elegibilidad":"no conectado (captura manual activa)"],
    ["Enlaces seguros de PDF",(process.env.QUOTE_SHARE_SECRET?.length??0)>=32&&process.env.NEXT_PUBLIC_SITE_URL?"configurado":"pendiente"],
    ["Cal.com",process.env.CAL_WEBHOOK_SECRET?"secreto configurado":"pendiente"],
    ["Correo (Resend)",process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL?"claves configuradas":"pendiente"],
  ];
  return <><PageHeading title="Mi cuenta" description={`${profile.full_name} · ${profile.role}. La contraseña solo se guarda en Supabase Auth.`}/>
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Establecer contraseña"><PasswordForm/></Panel>
      {superadmin&&<Panel title="Controles técnicos">
        <p className="mb-4 text-sm text-ink-soft">Reservado a SUPERADMIN. No forman parte del trabajo diario.</p>
        <ul className="grid gap-2">{technical.map(([href,label,help])=><li key={href}><Link href={href} className="block rounded-xl border border-line p-4 hover:border-navy-500"><span className="font-semibold text-navy-700">{label}</span><span className="mt-1 block text-xs text-ink-soft">{help}</span></Link></li>)}</ul>
        <details className="mt-5"><summary className="cursor-pointer font-semibold text-navy-700">Estado de integraciones</summary><ul className="mt-3 grid gap-2 text-sm">{integrations.map(([k,v])=><li key={k}><strong>{k}:</strong> {v}</li>)}</ul></details>
        <details className="mt-4"><summary className="cursor-pointer font-semibold text-navy-700">Estados de oportunidades</summary><div className="mt-3 grid gap-3">{statuses?.data?.map(s=><StatusForm key={s.id} status={s}/>)}</div></details>
      </Panel>}
    </div>
  </>;
}
