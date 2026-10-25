"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RibbonHandle } from "./ribbon-scene";
import { RIBBON_MIN_WIDTH, ribbonQuality, ribbonRoute, ribbonRuns3D, shouldRun3D, stopIndex, type RibbonQuality } from "@/lib/ribbon-gate";

// Decorative light ribbon behind the landing page and the auth pages only (root layout, so it is not restarted
// when moving between them). Every other page has no ribbon at all, the user's choice for a cleaner look (AU-77).
// Those two first get the static CSS ribbon. With motion allowed, WebGL 2 and no data-saver, the three scene
// loads after first paint and fades in over it; the landing page scrolls through its stops and the auth pages
// hold the hero pose.
// Phones and tablets get the lite scene. If it fails, the static ribbon stays. No page ever waits for it.

const WIDE = `(min-width: ${RIBBON_MIN_WIDTH}px)`;
const CALM = "(prefers-reduced-motion: reduce)";
const LIGHT_DATA = "(prefers-reduced-data: reduce)";

function subscribe(onChange: () => void) {
  const queries = [WIDE, CALM, LIGHT_DATA].map((query) => matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

// "full", "lite", or "off". One string, so React re-renders only when it really changes.
function ribbonMode(): RibbonQuality | "off" {
  return canRun3D() ? ribbonQuality(window.innerWidth) : "off";
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
  const route = ribbonRoute(usePathname());
  const routeRef = useRef(route);
  const stopsRef = useRef<number[]>([0]);
  const mode = useSyncExternalStore(subscribe, ribbonMode, () => "off" as const);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  const shown = ribbonRuns3D(route);
  const quality = mode === "off" || failed || !shown ? null : mode;
  const run = quality !== null;

  // Starts the scene when a 3D page opens and stops it when leaving for an app page.
  // Moving between the landing and auth pages keeps the same scene.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!quality || !canvas) return;
    let cancelled = false;
    let handle: RibbonHandle | undefined;
    stopsRef.current = measureStops();
    const observer = new ResizeObserver(() => {
      stopsRef.current = measureStops();
    });
    observer.observe(document.body);

    // Wait until the browser is idle so the hero and its actions come first.
    const start = () => {
      import("./ribbon-scene")
        .then(({ startRibbon }) => {
          if (cancelled) return;
          handle = startRibbon(canvas, {
            getIndex: () => (routeRef.current === "journey" ? stopIndex(window.scrollY, stopsRef.current) : 0),
            onReady: () => setLive(true),
            onLost: () => setFailed(true),
            quality,
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
      handle?.stop();
      setLive(false);
    };
  }, [quality]);

  // A new page: switch the camera mode and measure its stops once it has painted.
  useEffect(() => {
    routeRef.current = route;
    const frame = requestAnimationFrame(() => {
      stopsRef.current = measureStops();
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);

  if (!shown) return null;

  // The static ribbon sits behind the top of the page. The canvas stays fixed behind the whole page.
  return (
    <>
      <div aria-hidden="true" className={`ribbon-static transition-opacity duration-1000 ${live && run ? "opacity-0" : "opacity-100"}`} />
      {run && (
        // A new canvas per quality: the old one lost its WebGL context when its scene stopped.
        <canvas
          key={quality}
          ref={canvasRef}
          aria-hidden="true"
          className={`ribbon-canvas pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-1000 ${live ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
