import Link from "next/link";
import { DISCLAIMER } from "@/lib/legal";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-line px-5 py-6 text-center text-sm leading-6 text-muted">
      {DISCLAIMER}
      <nav aria-label="Legal and help" className="mt-2 flex justify-center gap-4">
        <Link className="underline" href="/privacy">Privacy</Link>
        <Link className="underline" href="/terms">Terms</Link>
        <Link className="underline" href="/glossary">Glossary</Link>
      </nav>
    </footer>
  );
}
