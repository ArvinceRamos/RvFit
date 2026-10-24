import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy · RvFit" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>RvFit is a small fitness website, run as a private test for friends and family, that gives simple calorie and macro estimates. This page explains what it stores and why.</p>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your email address and, if you use Google sign-in, your name and profile picture from Google.</li>
          <li>The details you enter: age, sex, height, weight, activity level, goal, food preferences, meals, workouts and weigh-ins.</li>
          <li>Your confirmation that you are 18 or older.</li>
        </ul>
      </section>
      <section>
        <h2>Stored on your device</h2>
        <p>Before you have an account, the calculator keeps your answers and estimate in your browser&apos;s local storage so you can save them after signing up. It stays on your device and is cleared once it is saved to your account or when you log out. The site also keeps two small settings there: your Day or Night theme, and whether you hid the Dashboard setup steps.</p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>Only to run the site for you: to log you in, work out your targets and show your plans and progress. We do not sell your data and we do not show ads.</p>
      </section>
      <section>
        <h2>Who handles it</h2>
        <ul>
          <li>Supabase provides sign-in and the database. Rules in the database let each person read only their own data.</li>
          <li>Vercel hosts the website. Like any web host, it may keep short-lived technical logs, such as IP addresses and the pages requested.</li>
          <li>If you choose Google sign-in, Google handles that step under its own privacy policy.</li>
        </ul>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>We keep your data while your account exists. Past calorie targets are kept as a history and are not changed after they are saved. Our providers may keep backups for a limited time, so deleted data can stay in a backup until that backup expires.</p>
      </section>
      <section>
        <h2>Deleting your data</h2>
        <p>Use <strong>Delete my account and data</strong> on your profile page. This removes your account and the data linked to it from the live database straight away. You can also email us and we will do it for you.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions or requests: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
