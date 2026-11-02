"use client";

import { useEffect, useRef, useState } from "react";

const format = (n: number) => n.toLocaleString("es-CL");

/** Counts up once when visible. Renders the final value without JS / reduced motion. */
export function AnimatedCounter({ value, duration = 2200 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setDisplay(Math.floor((1 - Math.pow(1 - p, 4)) * value));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      setDisplay(0);
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums" aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
