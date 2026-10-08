import type { ReactNode } from "react";

// The card around every landing page preview. Always labelled App preview.
export function PreviewFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="card preview-card tabular-nums">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{title}</span>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide text-muted">App preview</span>
      </figcaption>
      <div className="mt-4">{children}</div>
    </figure>
  );
}
