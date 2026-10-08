"use client";

import { useEffect, useRef, useState } from "react";
import { StageIcon } from "@/components/stage-icon";
import { TimelineProgress } from "@/components/timeline-progress";
import { DEMO_TARGETS } from "@/lib/demo-data";
import { HONEST_ESTIMATES_LINE } from "@/lib/landing-content";
import { ESTIMATE_STEPS, SHOWCASE_SCALE_READOUT, type EstimateStep } from "@/lib/showcase";
import { activeStage } from "@/lib/timeline-progress";
import type { ShowcaseHandle } from "./showcase-scene";

// Honest estimates as a short scroll story: three rules for how RvFit treats your numbers (the roadmap
// above covers the steps), then the plan's honest line.
// Desktop: the 3D object is pinned on the right and swaps as each step reaches the middle of the screen
// (the same rule as the timeline's glowing dot). Phones: the object sits at the top of the active step.
// The reader sets the pace; nothing runs on a timer. With reduced motion, or without WebGL, the 3D scene
// never loads and each step shows an icon instead. Without scripts the steps still read top to bottom.

const WIDE = "(min-width: 1024px)";
const ICON_STAGE: Record<string, number> = { ring: 1, scale: 4, sliders: 5 };
const pad = (n: number) => String(n).padStart(2, "0");

function Facts({ step, className = "" }: { step: EstimateStep; className?: string }) {
  return (
    <dl className={`flex flex-wrap gap-3 ${className}`}>
      {step.facts.map((fact) => (
        <div className="tile min-w-32 px-4 py-2.5" key={fact.label}>
          <dt className="text-xs text-muted">{fact.label}</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The number inside the 3D calorie ring.
function RingNumber({ show }: { show: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-[44%] flex -translate-y-1/2 flex-col items-center transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}`}>
      <span className="font-mono text-2xl font-bold tabular-nums sm:text-4xl">{DEMO_TARGETS.calories.toLocaleString("en")}</span>
      <span className="text-xs text-muted">kcal a day</span>
    </div>
  );
}

export function EstimateStory() {
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const activeRef = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pinnedRef = useRef<HTMLCanvasElement>(null);
  const slotRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // The active step is the last one whose top has passed the middle of the screen, like the timeline dot.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const steps = Array.from(list.children) as HTMLElement[];
      const index = Math.max(activeStage(steps.map((step) => step.getBoundingClientRect().top + 8), window.innerHeight / 2), 0);
      activeRef.current = index;
      setActive(index);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // Load the 3D scene only when the section comes near the screen, and draw only while it is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("WebGL2RenderingContext" in window) || !("IntersectionObserver" in window)) return;
    let handle: ShowcaseHandle | undefined;
    let loading = false;
    let cancelled = false;
    let onScreen = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        handle?.setVisible(onScreen);
        if (!onScreen || loading) return;
        loading = true;
        import("./showcase-scene")
          .then(({ startShowcase }) => {
            if (cancelled) return;
            handle = startShowcase({
              objects: ESTIMATE_STEPS.map((step) => step.object),
              scaleReadout: SHOWCASE_SCALE_READOUT,
              lite: window.innerWidth < 1024,
              getActive: () => activeRef.current,
              getTarget: () => (matchMedia(WIDE).matches ? pinnedRef.current : slotRefs.current[activeRef.current] ?? null),
              onReady: () => setLive(true),
              onLost: () => setLive(false),
            });
            handle.setVisible(onScreen);
          })
          .catch(() => {
            // The icons stay.
          });
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(section);
    return () => {
      cancelled = true;
      observer.disconnect();
      handle?.stop();
    };
  }, []);

  const current = ESTIMATE_STEPS[active];
  const count = ESTIMATE_STEPS.length;

  return (
    <section aria-labelledby="estimates-heading" className="border-t border-line" ref={sectionRef}>
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <p className="font-mono text-sm uppercase tracking-wide text-accent-text">honest estimates</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl" id="estimates-heading">How RvFit treats your numbers.</h2>

        <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:gap-14">
          <div className="relative">
            <TimelineProgress />
            <ol className="border-l border-line" ref={listRef}>
              {ESTIMATE_STEPS.map((step, index) => {
                const isActive = index === active;
                return (
                  <li className="relative pb-16 pl-6 last:pb-0 sm:pl-10 lg:flex lg:min-h-[60vh] lg:flex-col lg:justify-center lg:pb-0" key={step.label}>
                    <span aria-hidden="true" className="timeline-dot absolute -left-[5px] top-[15px] h-2.5 w-2.5 rounded-full bg-accent lg:top-1/2" />

                    {/* Phones and tablets: this step's 3D object, shown live only while the step is active. */}
                    <div aria-hidden="true" className="showcase-stage relative mb-6 h-56 overflow-hidden rounded-[22px] border border-line lg:hidden">
                      <div className="showcase-floor" />
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${live && isActive ? "opacity-0" : "opacity-100"}`}>
                        <StageIcon className="tile size-20 text-accent-text" iconClassName="size-9" stage={ICON_STAGE[step.object]} />
                      </div>
                      <canvas
                        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${live && isActive ? "opacity-100" : "opacity-0"}`}
                        ref={(element) => {
                          slotRefs.current[index] = element;
                        }}
                      />
                      {step.object === "ring" && <RingNumber show={live && isActive} />}
                    </div>

                    <p className="font-mono text-sm uppercase tracking-wide text-accent-text">
                      {pad(index + 1)} / {pad(count)} · {step.label}
                    </p>
                    <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{step.title}</h3>
                    <p className="mt-4 max-w-md text-lg leading-8 text-muted">{step.caption}</p>
                    <Facts className="mt-6" step={step} />
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Desktop: the pinned 3D stage. It follows the active step. */}
          <div className="hidden lg:block">
            <div aria-hidden="true" className="showcase-stage sticky top-24 overflow-hidden rounded-[28px] border border-line p-6">
              <div className="relative aspect-square w-full">
                <div className="showcase-floor" />
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${live ? "opacity-0" : "opacity-100"}`}>
                  <StageIcon className="tile size-28 text-accent-text" iconClassName="size-12" stage={ICON_STAGE[current.object]} />
                </div>
                <canvas className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${live ? "opacity-100" : "opacity-0"}`} ref={pinnedRef} />
                <RingNumber show={live && current.object === "ring"} />
              </div>
              <p className="roadmap-pinned-text font-mono text-sm uppercase tracking-wide text-accent-text" key={active}>
                {pad(active + 1)} / {pad(count)} · {current.label}
              </p>
            </div>
          </div>
        </div>

        {/* The plan's honest-estimates line, word for word. */}
        <p className="mt-16 max-w-3xl border-l-2 border-accent pl-5 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{HONEST_ESTIMATES_LINE}</p>
      </div>
    </section>
  );
}
