import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";

export default function NotFound() {
  return (
    <AuthFrame>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-text">Page not found</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">We could not find that page</h1>
      <p className="mt-3 text-muted">The link may be old, or the item may have been deleted.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="btn-primary" href="/dashboard">Go to Dashboard</Link>
        <Link className="btn-secondary" href="/">Home</Link>
      </div>
    </AuthFrame>
  );
}
