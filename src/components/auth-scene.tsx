import Link from "next/link";
import { AppFooter } from "./app-footer";

// Log in, sign-up and the password pages. Always dark like the landing page (.landing), with the
// ribbon from the root layout behind them in its sharp hero pose (see ribbonRoute).
export function AuthScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing relative isolate flex min-h-screen flex-col">
      <header className="landing-nav sticky top-0 z-20 border-b border-line">
        <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl items-center px-5 py-3 text-sm">
          <Link className="mr-auto text-lg font-bold tracking-tight" href="/">
            RvFit<span aria-hidden="true" className="text-accent-text">.</span>
          </Link>
          <Link className="btn-ghost btn-sm" href="/">
            <span aria-hidden="true">←</span> Back to home
          </Link>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-16">{children}</main>
      <AppFooter />
    </div>
  );
}

// A frosted glass card, like the landing page App previews (PreviewFrame): the title, plus a small
// mono pill that says what the page is for.
export function AuthCard({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <section className="card rounded-[28px] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <span className="mt-1.5 shrink-0 whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide text-muted">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}
