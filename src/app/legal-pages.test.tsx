import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/frame-shell", () => ({ PlainFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
import GlossaryPage from "./glossary/page";
import { calculationConfig } from "@/lib/calc/config";
import { AppFooter } from "@/components/app-footer";

describe("legal pages", () => {
  it("renders the privacy policy with a contact email", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("Privacy policy");
    expect(html).toContain("mailto:");
  });

  it("marks both pages as drafts", () => {
    expect(renderToStaticMarkup(<PrivacyPage />)).toContain("Draft, not yet reviewed");
    expect(renderToStaticMarkup(<TermsPage />)).toContain("Draft, not yet reviewed");
  });

  it("covers on-device storage, Vercel, backups and retention", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("local storage");
    expect(html).toContain("While you log a workout");
    expect(html).toContain("Vercel hosts the website");
    expect(html).toContain("backups");
    expect(html).toContain("How long we keep it");
  });

  it("renders the terms with the not-medical-advice note", () => {
    const html = renderToStaticMarkup(<TermsPage />);
    expect(html).toContain("Terms of service");
    expect(html).toContain("not medical advice");
    expect(html).toContain("eating disorder");
  });
});

describe("footer disclaimer", () => {
  it("keeps the plan wording and adds the eating-disorder line", () => {
    const html = renderToStaticMarkup(<AppFooter />);
    expect(html).toContain("These are estimates for healthy adults and are not medical advice. If you are pregnant, breastfeeding, or have a medical condition, talk to a doctor before changing your diet.");
    expect(html).toContain("If you have or have had an eating disorder, talk to a professional before tracking calories.");
  });
});

describe("glossary", () => {
  it("is linked from the footer", () => {
    expect(renderToStaticMarkup(<AppFooter />)).toContain('href="/glossary"');
  });

  it("explains food, training and progress words with the app's own numbers", () => {
    const html = renderToStaticMarkup(<GlossaryPage />);
    for (const word of ["Maintenance", "Macros", "Rep range", "Progression", "Plates each side", "Weight trend", "Check-in"]) {
      expect(html).toContain(word);
    }
    expect(html).toContain(`${calculationConfig.macros.kcal_per_gram.fat} kcal per gram`);
    expect(html).toContain(`last ${calculationConfig.progress.trend_window_days} days`);
    expect(html).not.toContain("Draft, not yet reviewed");
  });
});
