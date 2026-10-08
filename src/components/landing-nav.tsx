import Link from "next/link";
import { Logo } from "./logo";
import { HERO_LOG_IN, HERO_PRIMARY, HERO_ROADMAP } from "@/lib/landing-content";

// Sticky bar at the top of the landing page. Same labels and links as the hero actions.
// On phones it shows only RvFit, Log in and the primary action, so the row fits without scrolling.
export function LandingNav() {
  return (
    <header className="landing-nav sticky top-0 z-20 border-b border-line">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl items-center gap-1 px-5 py-3 text-sm sm:gap-2">
        <Link className="mr-auto text-lg font-bold tracking-tight" href="/">
          <Logo />
        </Link>
        <Link className="btn-ghost btn-sm hidden sm:inline-flex" href={HERO_ROADMAP.href}>
          {HERO_ROADMAP.label}
        </Link>
        <Link className="btn-ghost btn-sm" href={HERO_LOG_IN.href}>
          {HERO_LOG_IN.label}
        </Link>
        <Link className="btn-primary whitespace-nowrap px-3 py-2 text-xs sm:text-sm" href={HERO_PRIMARY.href}>
          {HERO_PRIMARY.label}
        </Link>
      </nav>
    </header>
  );
}
