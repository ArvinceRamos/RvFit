import type { Metadata } from "next";
import { PlainFrame } from "@/components/frame-shell";
import { GLOSSARY } from "@/lib/glossary";

export const metadata: Metadata = { title: "Glossary · RvFit" };

export default function GlossaryPage() {
  return (
    <PlainFrame>
      <h1 className="page-title">Glossary</h1>
      <p className="mt-2 text-muted">What the words in RvFit mean.</p>
      <div className="mt-6 space-y-8">
        {GLOSSARY.map(({ group, terms }) => (
          <section aria-labelledby={`glossary-${group.toLowerCase()}`} key={group}>
            <h2 className="section-title" id={`glossary-${group.toLowerCase()}`}>{group}</h2>
            <dl className="mt-3 space-y-4 leading-7">
              {terms.map(({ term, meaning }) => (
                <div key={term}>
                  <dt className="font-semibold">{term}</dt>
                  <dd className="text-muted">{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </PlainFrame>
  );
}
