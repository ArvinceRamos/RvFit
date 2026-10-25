import { LandingActions } from "@/components/landing-actions";
import { LandingFaq } from "@/components/landing-faq";

// Before you start (the plan's honest-estimates line and a short FAQ), then the final call to action.
export function LandingClosing() {
  return (
    <>
      <LandingFaq />
      <section aria-labelledby="final-cta-heading" className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
          <h2 id="final-cta-heading" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Start with a number you can use.</h2>
          <LandingActions />
        </div>
      </section>
    </>
  );
}
