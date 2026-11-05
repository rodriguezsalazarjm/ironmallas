import { requireAdmin } from "@/lib/auth";
import { CommercialForm,PricingForm } from "@/features/pricing/forms";
import { commercialSchema } from "@/features/pricing/schema";
import { clp } from "@/features/quotes/calculation";
export default async function PricingPage(){
  const {db,profile}=await requireAdmin();
  const [rules,services,settings]=await Promise.all([db.from("pricing_rules").select("*").order("name"),db.from("services").select("*").order("name"),db.from("settings").select("value").eq("key","commercial").maybeSingle()]);
  if(rules.error||services.error||settings.error)throw new Error("No fue posible cargar el tarifario.");
  const parsed=commercialSchema.safeParse(settings.data?.value);
  const canEdit=profile.role==="SUPERADMIN";
  return <><h1 className="text-3xl font-bold text-navy-700">Tarifario y condiciones</h1><p className="my-4 text-ink-soft">Valores netos CLP enteros. No se incorporan tarifas de ejemplo. Solo SUPERADMIN puede modificarlas.</p>
    {!parsed.success&&<p className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">Antes de emitir cotizaciones, configura IVA, datos de la empresa, validez y condiciones de pago.</p>}
    <section className="mb-8"><h2 className="mb-4 text-xl font-semibold">Condiciones comerciales</h2>{canEdit?<CommercialForm value={parsed.success?parsed.data:undefined}/>:<p>{parsed.success?`IVA ${parsed.data.tax_bps/100}% · validez ${parsed.data.validity_days} días` : "Pendientes de configuración por SUPERADMIN."}</p>}</section>
    {canEdit&&<section className="mb-8"><h2 className="mb-4 text-xl font-semibold">Nueva tarifa</h2><PricingForm services={services.data}/></section>}
    <h2 className="mb-4 text-xl font-semibold">Tarifas configuradas</h2>{!rules.data.length&&<p className="rounded-xl border border-line bg-white p-5">No hay precios configurados. Solicita los valores reales a Iron Mallas para habilitar el cotizador.</p>}
    <div className="grid gap-5 xl:grid-cols-2">{rules.data.map(rule=>canEdit?<details className="rounded-2xl border border-line bg-white p-4" key={rule.id}><summary className="cursor-pointer font-semibold">{rule.name} · {clp(rule.unit_price)} · {rule.active?"Activa":"Inactiva"}</summary><div className="mt-4"><PricingForm rule={rule} services={services.data}/></div></details>:<article className="rounded-xl border border-line bg-white p-5" key={rule.id}><h3 className="font-semibold">{rule.name}</h3><p>{clp(rule.unit_price)} / {rule.unit} · {rule.active?"Activa":"Inactiva"}</p></article>)}</div>
    <p className="mt-6 text-xs text-ink-soft">Redondeo: cada concepto al peso más cercano (mitades hacia arriba), luego mínimo, recargo, descuento sobre el subtotal e IVA sobre el neto descontado.</p>
  </>;
}
