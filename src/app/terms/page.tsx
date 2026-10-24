import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of service · RvFit" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>RvFit is a private test for friends and family. By using it you agree to these terms.</p>
      <section>
        <h2>Not medical advice</h2>
        <p>RvFit gives estimates for healthy adults. It is not medical advice. If you are pregnant, breastfeeding or have a medical condition, talk to a doctor before changing your diet or exercise. If you have or have had an eating disorder, talk to a professional before tracking calories. If your BMI is under 18.5, RvFit does not offer a weight-loss target.</p>
      </section>
      <section>
        <h2>Who can use it</h2>
        <p>You must be 18 or older. Keep your login details private. You are responsible for what happens under your account.</p>
      </section>
      <section>
        <h2>Use at your own risk</h2>
        <p>The numbers are starting points, not guarantees. RvFit is provided as is, without warranties, and we are not liable for loss or harm from using it, to the extent the law allows.</p>
      </section>
      <section>
        <h2>Your account</h2>
        <p>You can delete your account at any time from your profile page. We may change or stop the site at any time.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p><a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </section>
    </LegalPage>
  );
}
