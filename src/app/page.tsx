import Link from "next/link";
import { AppFooter } from "@/components/app-footer";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { account } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col text-ink">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
        {account === "deleted" && (
          <p aria-live="polite" className="mb-8 rounded-lg border border-line bg-card p-4 text-sm font-semibold text-ink">Your account and data were deleted.</p>
        )}
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-text">RvFit</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Start with a number you can use.</h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-muted">Choose a calorie estimate or enter your own target. We’ll help you set simple starting macros.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link className="rounded-lg bg-accent px-5 py-3 text-center font-bold text-on-accent hover:bg-accent-soft" href="/start">Calculate my estimate</Link>
          <Link className="rounded-lg border border-edge bg-field px-5 py-3 text-center font-bold hover:bg-line" href="/start">Enter my own target</Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
