import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth-frame", () => ({ AuthFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

describe("legal pages", () => {
  it("renders the privacy policy with a contact email", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("Privacy policy");
    expect(html).toContain("mailto:");
  });

  it("renders the terms with the not-medical-advice note", () => {
    const html = renderToStaticMarkup(<TermsPage />);
    expect(html).toContain("Terms of service");
    expect(html).toContain("not medical advice");
  });
});
