"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Inbox, Users, CalendarDays, Wrench, Wallet, FilePlus2, Star, UserCircle, ChevronDown } from "lucide-react";

type Item = { href: string; label: string; icon: typeof Inbox; match?: string[] };
export const commercialItems: Item[] = [
  { href: "/admin/leads", label: "Oportunidades", icon: Inbox },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/instalaciones", label: "Instalaciones", icon: Wrench },
  { href: "/admin/pagos", label: "Pagos", icon: Wallet },
  { href: "/admin/cotizaciones/nueva", label: "Generar cotización", icon: FilePlus2, match: ["/admin/cotizaciones"] },
];
const quick: Item[] = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Oportunidades", icon: Inbox },
  { href: "/admin/cotizaciones/nueva", label: "Cotizar", icon: FilePlus2, match: ["/admin/cotizaciones"] },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
];

function isActive(path: string, item: Item) {
  if (item.href === "/admin") return path === "/admin";
  return [item.href, ...(item.match ?? [])].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
function closeMenus(event: React.MouseEvent<HTMLAnchorElement>) {
  const menu = event.currentTarget.closest("details[data-close-on-nav]");
  if (menu instanceof HTMLDetailsElement) menu.open = false;
}
const linkClass = (active: boolean) => `flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white font-semibold text-navy-700 shadow-sm" : "text-white/85 hover:bg-white/10 hover:text-white"}`;

function NavLink({ item, path }: { item: Item; path: string }) {
  const Icon = item.icon; const active = isActive(path, item);
  return <Link href={item.href} onClick={closeMenus} aria-current={active ? "page" : undefined} className={linkClass(active)}><Icon className="size-4 shrink-0" aria-hidden="true" />{item.label}</Link>;
}

/** Menú principal: Inicio · Comercial (plegable) · Reseñas · Mi cuenta. */
export function AdminNavigation() {
  const path = usePathname();
  const commercialActive = commercialItems.some(item => isActive(path, item));
  return <div className="grid gap-1">
    <NavLink path={path} item={{ href: "/admin", label: "Inicio", icon: LayoutDashboard }} />
    <details className="group" open={commercialActive || undefined}>
      <summary className={`${linkClass(false)} cursor-pointer list-none justify-between [&::-webkit-details-marker]:hidden`}>
        <span className="flex items-center gap-3"><Briefcase className="size-4 shrink-0" aria-hidden="true" />Comercial</span>
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-1 grid gap-1 border-l border-white/20 pl-3">{commercialItems.map(item => <NavLink key={item.href} item={item} path={path} />)}</div>
    </details>
    <NavLink path={path} item={{ href: "/admin/resenas", label: "Reseñas", icon: Star }} />
    <NavLink path={path} item={{ href: "/admin/cuenta", label: "Mi cuenta", icon: UserCircle }} />
  </div>;
}

/** Barra inferior en teléfono: accesos rápidos táctiles. */
export function AdminQuickBar() {
  const path = usePathname();
  return <>{quick.map(item => {
    const Icon = item.icon; const active = isActive(path, item); const primary = item.label === "Cotizar";
    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold ${primary ? "bg-orange-500 text-navy-950" : active ? "bg-navy-50 text-navy-700" : "text-ink-soft"}`}><Icon className="size-5 shrink-0" aria-hidden="true" />{item.label}</Link>;
  })}</>;
}
