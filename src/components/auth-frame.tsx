import Link from "next/link";
import { AppFooter } from "./app-footer";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-5 py-4">
        <Link className="mx-auto block max-w-xl text-lg font-bold tracking-tight" href="/">RvFit</Link>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">{children}</main>
      <AppFooter />
    </div>
  );
}
