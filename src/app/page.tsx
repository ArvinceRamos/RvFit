import { Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { AccountDeletedNotice } from "@/components/account-deleted-notice";
import { AppFooter } from "@/components/app-footer";
import { HeroPanel } from "@/components/app-preview";
import { LandingActions } from "@/components/landing-actions";
import { LandingClosing } from "@/components/landing-closing";
import { LandingNav } from "@/components/landing-nav";
import { RoadmapTimeline } from "@/components/roadmap-timeline";
import { HERO_HEADLINE, HERO_ITALIC_WORD, HERO_SUPPORT } from "@/lib/landing-content";

// Loaded only for this page. Next hosts the file with the app, so there is no third-party request at runtime.
const serif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"] });

// Static: no request data is read here, so the page is prerendered and served from the CDN.
export default function Home() {
  const [before, after] = HERO_HEADLINE.split(HERO_ITALIC_WORD);
  return (
    <div className="landing relative isolate flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-10 sm:py-16 lg:min-h-[85vh] lg:grid-cols-2 lg:gap-12">
          <div>
            <Suspense>
              <AccountDeletedNotice />
            </Suspense>
            <p className="font-mono text-sm uppercase tracking-wide text-accent-text">RvFit</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">
              {before}
              <em className={`${serif.className} font-normal`}>{HERO_ITALIC_WORD}</em>
              {after}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">{HERO_SUPPORT}</p>
            <LandingActions />
          </div>
          <HeroPanel />
        </section>
        <RoadmapTimeline />
        <LandingClosing />
      </main>
      <AppFooter />
    </div>
  );
}
