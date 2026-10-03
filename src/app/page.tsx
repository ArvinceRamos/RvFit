import Link from "next/link";
import { AppFooter } from "@/components/app-footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-700">RvFit</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Start with a number you can use.</h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-700">Choose a calorie estimate or enter your own target. We’ll help you set simple starting macros.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link className="rounded-lg bg-lime-400 px-5 py-3 text-center font-bold text-zinc-950 hover:bg-lime-300" href="/start">Calculate my estimate</Link>
          <Link className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-center font-bold hover:bg-zinc-100" href="/start">Enter my own target</Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
