import Link from "next/link";
import { StagePreview } from "@/components/app-preview";
import { STAGES } from "@/lib/landing-content";

// Plain vertical timeline. It does not depend on 3D or scripts.
// Each stage has an empty preview slot (data-preview-slot) that the App preview panels fill in P5-4 and P5-5.
export function RoadmapTimeline() {
  return (
    <section id="roadmap" aria-labelledby="roadmap-heading" className="scroll-mt-6 border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <p className="font-mono text-sm uppercase tracking-wide text-accent-text">roadmap</p>
        <h2 id="roadmap-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Five stages, in order.</h2>
        <ol className="mt-12 border-l border-line">
          {STAGES.map((stage) => (
            <li key={stage.number} className="relative pb-14 pl-6 last:pb-0 sm:pl-10">
              <span aria-hidden="true" className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-accent" />
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="font-mono text-sm uppercase tracking-wide text-accent-text">{stage.label}</p>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{stage.title}</h3>
                  <p className="mt-3 max-w-lg text-base leading-7 text-muted">{stage.sentence}</p>
                  <ul className="mt-5 space-y-2 text-sm leading-6">
                    {stage.features.map((line) => (
                      <li key={line} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <Link className="btn-secondary mt-6" href={stage.href}>{stage.linkLabel}</Link>
                </div>
                <div data-preview-slot={stage.number}>
                  <StagePreview stage={stage.number} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
