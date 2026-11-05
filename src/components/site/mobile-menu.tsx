"use client";

import Link from "next/link";
import { useRef } from "react";
import { Menu, X } from "lucide-react";

import type { NavItem } from "@/content/types";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/button";

type MobileMenuProps = {
  nav: NavItem[];
  whatsappHref: string;
  instagramUrl: string;
};

export function MobileMenu({ nav, whatsappHref, instagramUrl }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="grid size-12 place-items-center rounded-xl bg-orange-500 text-navy-950 shadow-glow transition active:scale-95 xl:hidden"
        aria-label="Abrir menú"
        aria-haspopup="dialog"
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menú"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(22rem,calc(100%-2rem))] overflow-y-auto rounded-3xl border border-white/15 bg-navy-800/95 p-0 text-white shadow-2xl backdrop-blur-xl open:animate-fade-up"
      >
        <div className="relative p-4 pt-14">
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
            aria-label="Cerrar menú"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          <nav aria-label="Móvil">
            <ul className="flex flex-col gap-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href.startsWith("#") ? `/${item.href}` : item.href}
                    onClick={close}
                    className="block rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-center font-display text-lg font-semibold uppercase tracking-wide transition hover:bg-white/15"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className={buttonClasses("primary", "lg", "mt-4 w-full")}
          >
            <WhatsAppIcon size={20} />
            Contactar por WhatsApp
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("ghost", "md", "mt-2 w-full normal-case")}
          >
            <InstagramIcon size={18} />
            Instagram
          </a>
        </div>
      </dialog>
    </>
  );
}
