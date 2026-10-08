import { EstimateStory } from "@/components/estimate-story";
import { LandingActions } from "@/components/landing-actions";

// Honest estimates (how RvFit treats your numbers, ending with the plan line), then the final call to action.
export function LandingClosing() {
  return (
    <>
      <EstimateStory />
      <section aria-labelledby="final-cta-heading" className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
          <h2 id="final-cta-heading" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Start with a number you can use.</h2>
          <LandingActions />
        </div>
      </section>
    </>
  );
}
