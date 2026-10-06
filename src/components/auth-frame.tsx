import Link from "next/link";
import { AppFooter } from "./app-footer";
import { SignedInNav } from "./signed-in-nav";
import { ThemeToggle } from "./theme-toggle";

// Pass showNav on pages that need a signed-in user. The menu items live in src/lib/nav.ts.
// Signed-in pages (showNav) are 1152px wide. Login, sign-up, and the guest flow stay narrow.
export function AuthFrame({ children, showNav = false }: { children: React.ReactNode; showNav?: boolean }) {
  const width = showNav ? "max-w-6xl" : "max-w-xl";
  return (
    <div className="flex min-h-screen flex-col text-ink">
      <header className="border-b border-line bg-card/80 px-5 py-3 backdrop-blur">
        <div className={`mx-auto flex items-center gap-6 ${width}`}>
          <Link className="shrink-0 text-lg font-bold tracking-tight" href="/">RvFit</Link>
          {showNav ? <SignedInNav /> : <div className="flex-1" />}
          <ThemeToggle />
        </div>
      </header>
      <main className={`mx-auto w-full ${width} flex-1 px-5 py-10`}>{children}</main>
      <AppFooter />
    </div>
  );
}
