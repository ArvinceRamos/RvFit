"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DRAW_IN_RATIO, nextDrawState, type DrawState } from "@/lib/draw-state";

// Lets the lines and bars inside draw in each time they scroll into view (styles in globals.css).
// Leaving the screen re-arms them out of sight, so they draw in again on the way back.
// Without scripts or with reduced motion, everything is simply shown. Already in view on load: shown, not animated.
export function DrawIn({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        const next = nextDrawState(el.dataset.draw as DrawState, entry.isIntersecting, entry.intersectionRatio);
        if (next && next !== el.dataset.draw) el.dataset.draw = next;
      },
      { threshold: [0, DRAW_IN_RATIO] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
