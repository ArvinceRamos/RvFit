import { LandingActions } from "@/components/landing-actions";
import { HONEST_ESTIMATES_LINE } from "@/lib/landing-content";

// Honest-estimates line, then a lime break, then the final call to action. The sample result card is in stage 1 of the roadmap.
export function LandingClosing() {
  return (
    <>
      <section aria-label="About the estimates" className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
          <div className="card max-w-3xl">
            <p className="font-mono text-sm uppercase tracking-wide text-accent-text">honest estimates</p>
            <p className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{HONEST_ESTIMATES_LINE}</p>
          </div>
        </div>
      </section>
      {/* Chapter break. Black text on Fit Green, never Fit Green text on a light colour. */}
      <div aria-hidden="true" className="bg-accent py-20 text-center text-6xl font-bold tracking-tight text-black sm:py-28 sm:text-8xl">RvFit</div>
      <section aria-labelledby="final-cta-heading">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
          <h2 id="final-cta-heading" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Start with a number you can use.</h2>
          <LandingActions />
        </div>
      </section>
    </>
  );
}
