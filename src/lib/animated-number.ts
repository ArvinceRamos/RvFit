import { useEffect, useRef, useState } from "react";

// Matches the CSS bar transition in today-summary.tsx, so the number and the bar finish together.
export const NUMBER_ANIMATION_MS = 800;

// Fast at the start, slow at the end (ease-out cubic). Progress is clamped to 0..1.
export function easeOutCubic(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - (1 - t) ** 3;
}

// The value shown partway from one number to another. Progress 0 is "from", 1 is "to".
export function animatedValue(from: number, to: number, progress: number): number {
  return from + (to - from) * easeOutCubic(progress);
}

/**
 * A number that counts to its new value when `target` changes. The first render shows the target
 * straight away, so a page that has just opened does not animate. With reduced motion it jumps.
 */
export function useAnimatedNumber(target: number, durationMs: number = NUMBER_ANIMATION_MS): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : durationMs;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = duration === 0 ? 1 : (now - start) / duration;
      const next = progress >= 1 ? target : animatedValue(from, target, progress);
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}
