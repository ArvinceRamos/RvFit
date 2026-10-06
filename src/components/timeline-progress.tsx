"use client";

import { useEffect, useRef } from "react";
import { activeStage, timelineFill } from "@/lib/timeline-progress";

// A lime line over the roadmap's grey line that fills as you scroll, plus the reached and current stage dots.
// It sits next to the roadmap <ol> inside the same relative wrapper. Styles are in globals.css (.timeline-*).
// Without scripts nothing changes: the grey line and lime dots stay as they are.
export function TimelineProgress() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    const list = fill?.parentElement?.querySelector("ol");
    if (!fill || !list) return;
    const stages = Array.from(list.children) as HTMLElement[];
    list.classList.add("timeline-live");
    let frame = 0;

    const update = () => {
      frame = 0;
      const marker = window.innerHeight / 2;
      const rect = list.getBoundingClientRect();
      fill.style.transform = `scaleY(${timelineFill(rect.top, rect.height, marker)})`;
      // The dot sits 8px below the top of each stage.
      const active = activeStage(stages.map((stage) => stage.getBoundingClientRect().top + 8), marker);
      stages.forEach((stage, i) => {
        stage.toggleAttribute("data-reached", i <= active);
        stage.toggleAttribute("data-active", i === active);
      });
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
      list.classList.remove("timeline-live");
      stages.forEach((stage) => {
        stage.removeAttribute("data-reached");
        stage.removeAttribute("data-active");
      });
    };
  }, []);

  return <div ref={fillRef} aria-hidden="true" className="timeline-fill" />;
}
