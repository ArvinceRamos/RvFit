import Link from "next/link";
import { HERO_LOG_IN, HERO_OWN_TARGET, HERO_PRIMARY, HERO_ROADMAP } from "@/lib/landing-content";

// The four landing actions. Used in the hero and again in the final call to action.
export function LandingActions() {
  return (
    <>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link className="btn-primary text-center" href={HERO_PRIMARY.href}>{HERO_PRIMARY.label}</Link>
        <Link className="btn-secondary text-center" href={HERO_ROADMAP.href}>{HERO_ROADMAP.label}</Link>
      </div>
      <p className="mt-5 text-sm text-muted">
        <Link className="underline underline-offset-4 hover:text-ink" href={HERO_OWN_TARGET.href}>{HERO_OWN_TARGET.label}</Link>
        <span aria-hidden="true" className="mx-3">·</span>
        <Link className="underline underline-offset-4 hover:text-ink" href={HERO_LOG_IN.href}>{HERO_LOG_IN.label}</Link>
      </p>
    </>
  );
}
