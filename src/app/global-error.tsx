"use client";

import Link from "next/link";
import "./globals.css";

// Shown only when the root layout itself fails, so it brings its own <html> and <body> and does not
// use the app frame. The server error is logged by src/instrumentation.ts; the digest links the two.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center px-4 font-sans">
        <main className="card w-full max-w-md rounded-[28px] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-text">Something went wrong</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">RvFit could not load</h1>
          <p className="mt-3 text-muted">This is usually a brief problem. Your saved data is safe. Try again in a moment.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => retry()} type="button">Try again</button>
            <Link className="btn-secondary" href="/">Go to the home page</Link>
          </div>
          {error.digest && <p className="mt-6 font-mono text-xs text-muted">Error code: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
