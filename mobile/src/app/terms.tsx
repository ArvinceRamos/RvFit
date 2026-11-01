import { ContactLink, LegalPage, LegalSection, Paragraph } from "~/components/legal-page";

// The web terms page (src/app/terms/page.tsx). Draft text pending review.
export default function Terms() {
  return (
    <LegalPage>
      <Paragraph>RvFit is a private test for friends and family. By using it you agree to these terms.</Paragraph>
      <LegalSection title="Not medical advice">
        <Paragraph>RvFit gives estimates for healthy adults. It is not medical advice. If you are pregnant, breastfeeding or have a medical condition, talk to a doctor before changing your diet or exercise. If you have or have had an eating disorder, talk to a professional before tracking calories. If your BMI is under 18.5, RvFit does not offer a weight-loss target.</Paragraph>
      </LegalSection>
      <LegalSection title="Who can use it">
        <Paragraph>You must be 18 or older. Keep your login details private. You are responsible for what happens under your account.</Paragraph>
      </LegalSection>
      <LegalSection title="Use at your own risk">
        <Paragraph>The numbers are starting points, not guarantees. RvFit is provided as is, without warranties, and we are not liable for loss or harm from using it, to the extent the law allows.</Paragraph>
      </LegalSection>
      <LegalSection title="Your account">
        <Paragraph>You can delete your account at any time from the Me tab. We may change or stop RvFit at any time.</Paragraph>
      </LegalSection>
      <LegalSection title="Contact">
        <Paragraph><ContactLink /></Paragraph>
      </LegalSection>
    </LegalPage>
  );
}
