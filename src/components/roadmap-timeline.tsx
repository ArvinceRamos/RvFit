import Link from "next/link";
import { StagePreview } from "@/components/app-preview";
import { StageIcon } from "@/components/stage-icon";
import { TimelineProgress } from "@/components/timeline-progress";
import { STAGES } from "@/lib/landing-content";

// Plain vertical timeline. It does not depend on 3D or scripts. TimelineProgress adds the lime fill and dot glow on top.
// Each stage has an empty preview slot (data-preview-slot) that the App preview panels fill in P5-4 and P5-5.
export function RoadmapTimeline() {
  return (
    <section id="roadmap" aria-labelledby="roadmap-heading" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <p className="font-mono text-sm uppercase tracking-wide text-accent-text">roadmap</p>
        <h2 id="roadmap-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Five stages, in order.</h2>
        <div className="relative mt-12">
          <TimelineProgress />
          <ol className="border-l border-line">
            {STAGES.map((stage) => (
              <li key={stage.number} className="relative pb-14 pl-6 last:pb-0 sm:pl-10">
                <span aria-hidden="true" className="timeline-dot absolute -left-[5px] top-[15px] h-2.5 w-2.5 rounded-full bg-accent" />
                {/* Phones: title, then the preview, then the details, so the preview is not five screens away.
                    Desktop: title and details on the left, preview on the right. */}
                <div className="grid gap-y-6 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-8 md:gap-y-0">
                  <div>
                    <div className="flex items-center gap-3">
                      <StageIcon stage={stage.number} />
                      <p className="font-mono text-sm uppercase tracking-wide text-accent-text">{stage.label}</p>
                    </div>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{stage.title}</h3>
                    <p className="mt-3 max-w-lg text-base leading-7 text-muted">{stage.sentence}</p>
                  </div>
                  <div className="md:col-start-2 md:row-span-2 md:row-start-1" data-preview-slot={stage.number}>
                    <StagePreview stage={stage.number} />
                  </div>
                  <div className="md:mt-5">
                    <ul className="space-y-2 text-sm leading-6">
                      {stage.features.map((line) => (
                        <li key={line} className="flex gap-3">
                          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Link className="btn-secondary" href={stage.href}>{stage.linkLabel}</Link>
                      {/* Only stage 1 works without an account; say so before the click. */}
                      {stage.href !== "/start" && <span className="text-xs text-muted">Needs a free account</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
