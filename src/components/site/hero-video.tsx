"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Decorative background video. Paused for users who prefer reduced motion. */
export function HeroVideo({ src, type }: { src: string; type: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const manualPause = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (query.matches || manualPause.current) video.pause();
      else void video.play().catch(() => {});
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <><video
      ref={ref}
      className="absolute inset-0 -z-20 size-full object-cover brightness-90 contrast-105"
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
    >
      <source src={src} type={type} />
    </video><button type="button" onClick={() => {
      const video = ref.current;
      if (!video) return;
      if (video.paused) { manualPause.current = false; void video.play().catch(() => {}); }
      else { manualPause.current = true; video.pause(); }
    }} className="absolute bottom-4 right-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-navy-950/80 px-4 text-xs font-medium text-white hover:bg-navy-700" aria-label={playing ? "Pausar video de fondo" : "Reproducir video de fondo"}>
      {playing ? <Pause className="size-4" aria-hidden="true"/> : <Play className="size-4" aria-hidden="true"/>}{playing ? "Pausar video" : "Ver video"}
    </button></>
  );
}
