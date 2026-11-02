import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  id?: string;
  kicker: string;
  lead: string;
  highlight?: string;
  tail?: string;
  intro?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
  className?: string;
};

export function SectionHeading({
  id,
  kicker,
  lead,
  highlight,
  tail,
  intro,
  align = "center",
  tone = "light",
  className,
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.2em]",
          dark ? "border-orange-500/40 bg-orange-500/10 text-orange-300" : "border-orange-500/30 bg-orange-50 text-orange-700",
        )}
      >
        <span className="size-1.5 rounded-full bg-orange-500" aria-hidden="true" />
        {kicker}
      </span>
      <h2
        id={id}
        className={cn(
          "mt-4 text-3xl font-bold uppercase leading-[1.1] tracking-wide sm:text-4xl lg:text-[2.75rem]",
          dark ? "text-white" : "text-navy-700",
        )}
      >
        {lead} {highlight && <span className={dark ? "text-orange-400" : "text-orange-600"}>{highlight}</span>}
        {tail && <> {tail}</>}
      </h2>
      {intro && (
        <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", dark ? "text-navy-100" : "text-ink-soft")}>{intro}</p>
      )}
    </div>
  );
}
