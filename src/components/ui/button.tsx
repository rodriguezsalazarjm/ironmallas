import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "whatsapp";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-xl font-sans font-bold uppercase tracking-wide transition duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Navy-950 on brand orange keeps AA contrast (≈6:1) instead of white (≈2.9:1).
  primary: "bg-orange-500 text-navy-950 shadow-glow hover:bg-orange-400 hover:-translate-y-0.5",
  secondary: "bg-navy-700 text-white shadow-card hover:bg-navy-600 hover:-translate-y-0.5",
  ghost: "border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:-translate-y-0.5",
  whatsapp: "bg-[#1fa855] text-white shadow-card hover:bg-[#1b9449] hover:-translate-y-0.5",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-13 px-7 py-3.5 text-[0.95rem]",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

/** Anchor styled as a button. External links open in a new tab safely. */
export function ButtonLink({ href, variant, size, className, children, ...props }: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, className);
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
