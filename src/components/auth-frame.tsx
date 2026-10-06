import Link from "next/link";
import { AppFooter } from "./app-footer";
import { SignedInNav } from "./signed-in-nav";

// Pass showNav on pages that need a signed-in user. The menu items live in src/lib/nav.ts.
// Pass wide for the two-column meal pages. Other pages keep the narrow width.
export function AuthFrame({ children, showNav = false, wide = false }: { children: React.ReactNode; showNav?: boolean; wide?: boolean }) {
  const width = wide ? "max-w-6xl" : "max-w-xl";
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-5 py-4">
        <div className={`mx-auto ${width}`}>
          <Link className="block text-lg font-bold tracking-tight" href="/">RvFit</Link>
          {showNav && <SignedInNav />}
        </div>
      </header>
      <main className={`mx-auto w-full ${width} flex-1 px-5 py-10`}>{children}</main>
      <AppFooter />
    </div>
  );
}
