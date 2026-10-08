"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AuthFrame } from "@/components/auth-frame";

// Shown when a page throws. Server error details are never shown; the digest helps match server logs.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthFrame>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-text">Something went wrong</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">This page could not load</h1>
      <p className="mt-3 text-muted">
        This is usually a brief connection problem. Your saved data is safe. Try again, or go back to your dashboard.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => retry()} type="button">Try again</button>
        <Link className="btn-secondary" href="/dashboard">Go to Dashboard</Link>
      </div>
      {error.digest && <p className="mt-6 font-mono text-xs text-muted">Error code: {error.digest}</p>}
    </AuthFrame>
  );
}
