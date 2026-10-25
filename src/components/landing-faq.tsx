import Link from "next/link";
import { HONEST_ESTIMATES_LINE } from "@/lib/landing-content";
import { FAQ_EYEBROW, FAQ_HEADING, FAQ_ITEMS } from "@/lib/landing-faq";

// "Before you start": the plan's honest-estimates line as a large quote, then a short FAQ.
// Still on purpose, so it reads differently from the roadmap above: no 3D, no scroll story, no script.
// Native <details>, so every answer opens with a click, Enter or Space and works without JavaScript.
export function LandingFaq() {
  return (
    <section aria-labelledby="faq-heading" className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="font-mono text-sm uppercase tracking-wide text-accent-text">{FAQ_EYEBROW}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl" id="faq-heading">{FAQ_HEADING}</h2>
          {/* The plan's honest-estimates line, word for word. */}
          <p className="mt-8 border-l-2 border-accent pl-5 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{HONEST_ESTIMATES_LINE}</p>
        </div>

        <div className="faq-panel">
          {FAQ_ITEMS.map((item) => (
            <details className="faq-item group" key={item.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {item.question}
                {/* A plus that turns into a cross when open. */}
                <span aria-hidden="true" className="relative size-4 shrink-0 text-accent-text transition-transform duration-200 group-open:rotate-45">
                  <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current" />
                </span>
              </summary>
              <div className="pb-5 pr-8">
                <p className="leading-7 text-muted">
                  {item.lead && <span className="font-semibold text-ink">{item.lead} </span>}
                  {item.sentences.join(" ")}
                </p>
                {item.link && (
                  <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-accent-text" href={item.link.href}>
                    {item.link.label}
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
