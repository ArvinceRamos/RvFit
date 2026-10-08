import Link from "next/link";
import { Logo } from "./logo";
import { AppFooter } from "./app-footer";
import { SignedInNav } from "./signed-in-nav";
import { ThemeToggle } from "./theme-toggle";

// Pass showNav on pages that need a signed-in user. The menu items live in src/lib/nav.ts.
// Signed-in pages (showNav) are 1152px wide. Login, sign-up, password, error, and guest pages are
// narrow and sit on one floating card, so they feel like the landing page's panels.
export function AuthFrame({ children, showNav = false }: { children: React.ReactNode; showNav?: boolean }) {
  const width = showNav ? "max-w-6xl" : "max-w-xl";
  return (
    <div className="flex min-h-screen flex-col text-ink">
      {/* Sticky glass header: content scrolls under it, so the blur has something to do. */}
      <header className="surface-float sticky top-0 z-20 !rounded-none !border-x-0 !border-t-0 px-4 py-2.5 !shadow-none sm:px-5">
        <div className={`mx-auto flex items-center gap-3 sm:gap-6 ${width}`}>
          <Link className="shrink-0 text-lg font-bold tracking-tight" href="/"><Logo /></Link>
          {showNav ? <SignedInNav /> : <div className="flex-1" />}
          <ThemeToggle />
        </div>
      </header>
      {showNav ? (
        <main className={`mx-auto w-full ${width} flex-1 px-4 py-8 sm:px-5 sm:py-10`}>{children}</main>
      ) : (
        <main className={`mx-auto w-full ${width} flex-1 px-4 py-8 sm:px-5 sm:py-14`}>
          <div className="surface-float rounded-[28px] p-6 sm:p-8">{children}</div>
        </main>
      )}
      <AppFooter />
    </div>
  );
}
