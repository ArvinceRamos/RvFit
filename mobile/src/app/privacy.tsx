import { Bullets, ContactLink, LegalPage, LegalSection, Paragraph } from "~/components/legal-page";
import { Txt } from "~/components/ui";

// The web privacy page (src/app/privacy/page.tsx), with "Stored on your device" written for the app:
// the app keeps its session in the phone's secure storage and has no cookie. Draft text pending review.
export default function Privacy() {
  return (
    <LegalPage>
      <Paragraph>RvFit is a small fitness app and website, run as a private test for friends and family, that gives simple calorie and macro estimates. This page explains what it stores and why.</Paragraph>
      <LegalSection title="What we collect">
        <Bullets
          items={[
            "Your email address and, if you use Google sign-in, your name and profile picture from Google.",
            "The details you enter: age, sex, height, weight, activity level, goal, food preferences, meals, workouts, steps, sleep, other activity and weigh-ins.",
            "Your confirmation that you are 18 or older.",
          ]}
        />
      </LegalSection>
      <LegalSection title="Stored on your device">
        <Paragraph>
          Before you have an account, the calculator keeps your answers and estimate in the app on your phone so you can save them after signing up. It stays on your phone and is cleared once it is saved to your account or when you log out. While you log a workout, the sets you have typed are kept there too, so leaving the screen does not lose them; they are cleared when you save the workout, choose Discard draft, or log out. The app also keeps two small settings there: your theme, and whether you hid the setup steps on Today. Your sign-in session is kept in the phone&apos;s secure storage (the iOS Keychain or Android&apos;s encrypted storage) and is removed when you log out. The app uses your phone&apos;s time zone to show the right &ldquo;today&rdquo;; it is not sent anywhere.
        </Paragraph>
      </LegalSection>
      <LegalSection title="How we use it">
        <Paragraph>Only to run RvFit for you: to log you in, work out your targets and show your plans and progress. We do not sell your data and we do not show ads.</Paragraph>
      </LegalSection>
      <LegalSection title="Who handles it">
        <Bullets
          items={[
            "Supabase provides sign-in and the database. Rules in the database let each person read only their own data.",
            "Vercel hosts the website, which also handles account deletion for the app. Like any web host, it may keep short-lived technical logs, such as IP addresses and the pages requested.",
            "If you choose Google sign-in, Google handles that step under its own privacy policy.",
          ]}
        />
      </LegalSection>
      <LegalSection title="How long we keep it">
        <Paragraph>We keep your data while your account exists. Past calorie targets are kept as a history and are not changed after they are saved. Our providers may keep backups for a limited time, so deleted data can stay in a backup until that backup expires.</Paragraph>
      </LegalSection>
      <LegalSection title="Deleting your data">
        <Paragraph>Use <Txt weight="bold">Delete my account and data</Txt> on the Me tab. This removes your account and the data linked to it from the live database straight away. You can also email us and we will do it for you.</Paragraph>
      </LegalSection>
      <LegalSection title="Contact">
        <Paragraph>Questions or requests: <ContactLink />.</Paragraph>
      </LegalSection>
    </LegalPage>
  );
}
