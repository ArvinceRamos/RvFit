import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-line px-5 py-6 text-center text-sm leading-6 text-muted">
      These are estimates for healthy adults and are not medical advice. If you are pregnant,
      breastfeeding, or have a medical condition, talk to a doctor before changing your diet.
      <nav aria-label="Legal" className="mt-2 flex justify-center gap-4">
        <Link className="underline" href="/privacy">Privacy</Link>
        <Link className="underline" href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
