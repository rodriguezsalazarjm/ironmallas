"use client";

import { useEffect, useRef } from "react";

/** Decorative background video. Paused for users who prefer reduced motion. */
export function HeroVideo({ src, type }: { src: string; type: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (query.matches) video.pause();
      else void video.play().catch(() => {});
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <video
      ref={ref}
      className="absolute inset-0 -z-20 size-full object-cover brightness-90 contrast-105"
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={src} type={type} />
    </video>
  );
}
