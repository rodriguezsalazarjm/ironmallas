"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin, Play, X } from "lucide-react";

import type { Project, ProjectCategory } from "@/content/types";
import { cn } from "@/lib/cn";

const filters: Array<{ value: "all" | ProjectCategory; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "mallas", label: "Mallas" },
  { value: "cortinas", label: "Cortinas" },
  { value: "videos", label: "Videos" },
];

/** Loads video metadata (first frame) only when the card scrolls into view. */
function VideoThumb({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={visible ? `${src}#t=0.5` : undefined}
      muted
      playsInline
      preload="metadata"
      tabIndex={-1}
      aria-hidden="true"
      className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
    />
  );
}

export function PortfolioGallery({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const visible = filter === "all" ? projects : projects.filter((p) => p.category === filter);
  const current = active === null ? null : visible[active];

  const open = (index: number) => {
    setActive(index);
    dialogRef.current?.showModal();
  };
  const step = (delta: number) =>
    setActive((i) => (i === null ? i : (i + delta + visible.length) % visible.length));

  return (
    <>
      <div role="group" aria-label="Filtrar proyectos" className="mt-10 flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "min-h-11 rounded-full border px-5 font-display text-sm font-semibold uppercase tracking-wider transition",
              filter === f.value
                ? "border-orange-500 bg-orange-500 text-navy-950"
                : "border-white/20 bg-white/5 text-white hover:bg-white/15",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile: swipeable carousel. Tablet and up: dense grid. */}
      <ul className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-flow-row-dense sm:auto-rows-[15rem] sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:auto-rows-[17rem]">
        {visible.map((project, index) => {
          const tall = (project.height ?? 0) > (project.width ?? 0);
          return (
            <li
              key={project.id}
              className={cn("h-[24rem] w-[82%] shrink-0 snap-center sm:h-auto sm:w-auto", tall && "sm:row-span-2")}
            >
              <button
                type="button"
                onClick={() => open(index)}
                className="group relative block size-full overflow-hidden rounded-2xl bg-navy-900 text-left shadow-card"
                aria-label={`Ver ${project.type === "video" ? "video" : "foto"}: ${project.title}, ${project.location}`}
              >
                {project.type === "image" ? (
                  <Image
                    src={project.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <VideoThumb src={project.src} />
                    <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-orange-500 text-navy-950 shadow-glow transition group-hover:scale-110">
                      <Play className="ml-1 size-7" fill="currentColor" aria-hidden="true" />
                    </span>
                  </>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/95 via-navy-950/60 to-transparent p-5 pt-16">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {project.location}
                  </span>
                  <span className="mt-1 block font-display text-lg font-semibold uppercase leading-tight tracking-wide text-white">
                    {project.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-navy-200 sm:hidden">
        Desliza para ver más · {visible.length} proyectos
      </p>

      <dialog
        ref={dialogRef}
        aria-label={current ? current.title : "Proyecto"}
        onClose={() => setActive(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto max-h-[92dvh] w-[min(64rem,calc(100%-1.5rem))] overflow-y-auto bg-transparent p-0 text-white"
      >
        {current && (
          <div className="animate-fade-in">
            <div className="relative overflow-hidden rounded-2xl bg-navy-950">
              {current.type === "image" ? (
                <Image
                  src={current.src}
                  alt={current.description}
                  width={current.width}
                  height={current.height}
                  sizes="(min-width: 1024px) 64rem, 100vw"
                  className="mx-auto max-h-[72dvh] w-auto object-contain"
                />
              ) : (
                <video
                  key={current.src}
                  src={current.src}
                  controls
                  autoPlay
                  playsInline
                  className="mx-auto max-h-[72dvh] w-auto"
                />
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-4 rounded-2xl bg-navy-800/95 p-4 sm:p-5">
              <div>
                <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {current.location}
                </p>
                <p className="mt-1 font-display text-xl font-semibold uppercase tracking-wide">{current.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-100">{current.description}</p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-navy-200" aria-live="polite">
                {(active ?? 0) + 1} / {visible.length}
              </p>
            </div>

            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="grid size-12 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label="Anterior"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="grid size-12 place-items-center rounded-full bg-orange-500 text-navy-950 transition hover:bg-orange-400"
                aria-label="Cerrar"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="grid size-12 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label="Siguiente"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
