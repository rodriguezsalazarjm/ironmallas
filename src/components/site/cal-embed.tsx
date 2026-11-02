"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ExternalLink, LoaderCircle } from "lucide-react";

type CalApi = ((...args: unknown[]) => void) & {
  loaded?: boolean;
  ns: Record<string, (...args: unknown[]) => void>;
  q?: unknown[];
};

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

type CalEmbedProps = {
  link: string;
  namespace: string;
  origin: string;
};

/**
 * Cal.com inline embed — same booking link and namespace as the WordPress
 * site. The embed script (~300 KB) is injected only when the section is about
 * to enter the viewport.
 */
export function CalEmbed({ link, namespace, origin }: CalEmbedProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");
  const targetId = `cal-inline-${namespace}`;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setState("loading");
        loadCal(origin);
        const cal = window.Cal!;
        cal("init", namespace, { origin });
        cal.ns[namespace]("inline", {
          elementOrSelector: `#${targetId}`,
          calLink: link,
          config: { layout: "month_view", useSlotsViewOnSmallScreen: "true", theme: "light" },
        });
        cal.ns[namespace]("ui", {
          theme: "light",
          hideEventTypeDetails: false,
          layout: "month_view",
          cssVarsPerTheme: { light: { "cal-brand": "#06365A" }, dark: { "cal-brand": "#FC6B04" } },
        });
        cal.ns[namespace]("on", { action: "linkReady", callback: () => setState("ready") });
      },
      { rootMargin: "400px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [link, namespace, origin, targetId]);

  return (
    <div ref={wrapperRef}>
      <div className="relative min-h-[34rem]">
        {state !== "ready" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-ink-soft">
            <div>
              {state === "loading" ? (
                <LoaderCircle className="mx-auto size-8 animate-spin text-orange-600" aria-hidden="true" />
              ) : (
                <CalendarDays className="mx-auto size-8 text-navy-300" aria-hidden="true" />
              )}
              <p className="mt-3 text-sm" role="status">
                {state === "loading" ? "Cargando calendario…" : "Preparando calendario…"}
              </p>
            </div>
          </div>
        )}
        <div id={targetId} className="relative min-h-[34rem] w-full overflow-auto" />
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">
        ¿No ves el calendario?{" "}
        <a
          href={`https://cal.com/${link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-navy-700 underline-offset-4 hover:underline"
        >
          Abrir agenda en Cal.com
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}

/** Official Cal.com embed bootstrap, typed. Queues calls until embed.js loads. */
function loadCal(origin: string) {
  if (window.Cal) return;
  const push = (api: { q?: unknown[] }, args: unknown) => {
    (api.q ??= []).push(args);
  };
  const cal = function (...args: unknown[]) {
    const self = window.Cal!;
    if (!self.loaded) {
      self.ns = {};
      self.q = self.q ?? [];
      const script = document.createElement("script");
      script.src = `${origin}/embed/embed.js`;
      script.async = true;
      document.head.appendChild(script);
      self.loaded = true;
    }
    if (args[0] === "init") {
      const namespace = args[1];
      const api = function (...apiArgs: unknown[]) {
        push(api, apiArgs);
      } as ((...a: unknown[]) => void) & { q?: unknown[] };
      if (typeof namespace === "string") {
        self.ns[namespace] = self.ns[namespace] ?? api;
        push(self.ns[namespace] as { q?: unknown[] }, args);
        push(self, ["initNamespace", namespace]);
      } else {
        push(self, args);
      }
      return;
    }
    push(self, args);
  } as CalApi;
  cal.ns = {};
  window.Cal = cal;
}
