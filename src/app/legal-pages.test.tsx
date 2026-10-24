import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth-frame", () => ({ AuthFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
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
