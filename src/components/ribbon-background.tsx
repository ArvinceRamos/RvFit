"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RIBBON_MIN_WIDTH, shouldRun3D, stopIndex } from "@/lib/ribbon-gate";

// Decorative light ribbon behind the landing page. The page never waits for it.
// Everyone first gets the static CSS ribbon. On a wide screen with motion allowed, WebGL 2 and no data-saver,
// the three scene loads after first paint and fades in over it. If it fails, the static ribbon stays.

const WIDE = `(min-width: ${RIBBON_MIN_WIDTH}px)`;
const CALM = "(prefers-reduced-motion: reduce)";
const LIGHT_DATA = "(prefers-reduced-data: reduce)";

function subscribe(onChange: () => void) {
  const queries = [WIDE, CALM, LIGHT_DATA].map((query) => matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

function canRun3D() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return shouldRun3D({
    width: window.innerWidth,
    reducedMotion: matchMedia(CALM).matches,
    saveData: Boolean(connection?.saveData) || matchMedia(LIGHT_DATA).matches,
    webgl2: "WebGL2RenderingContext" in window,
  });
}

// Scroll positions where the hero, each stage preview, and the closing sit in the middle of the screen.
function measureStops(): number[] {
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  const stages = Array.from(document.querySelectorAll<HTMLElement>("[data-preview-slot]"), (el) => {
    const rect = el.getBoundingClientRect();
    return rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2;
  });
  // Keep them in order and inside the page, even if the layout is unusual.
  const stops: number[] = [];
  for (const y of [0, ...stages, max]) stops.push(Math.min(Math.max(y, stops.at(-1) ?? 0), max));
  return stops;
}

export function RibbonBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const allowed = useSyncExternalStore(subscribe, canRun3D, () => false);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  const run = allowed && !failed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!run || !canvas) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    let stops = measureStops();
    const observer = new ResizeObserver(() => {
      stops = measureStops();
    });
    observer.observe(document.body);

    // Wait until the browser is idle so the hero and its actions come first.
    const start = () => {
      import("./ribbon-scene")
        .then(({ startRibbon }) => {
          if (cancelled) return;
          stop = startRibbon(canvas, {
            getIndex: () => stopIndex(window.scrollY, stops),
            onReady: () => setLive(true),
            onLost: () => setFailed(true),
          });
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };
    const idle = "requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 2000 }) : undefined;
    const timer = idle === undefined ? window.setTimeout(start, 300) : undefined;

    return () => {
      cancelled = true;
      if (idle !== undefined) cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
      observer.disconnect();
      stop?.();
      setLive(false);
    };
  }, [run]);

  // The static ribbon sits behind the hero only. The canvas stays fixed behind the whole page.
  return (
    <>
      <div aria-hidden="true" className={`ribbon-static transition-opacity duration-1000 ${live ? "opacity-0" : "opacity-100"}`} />
      {run && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-1000 ${live ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
