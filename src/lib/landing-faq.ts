// "Before you start": the short FAQ near the end of the landing page (src/components/landing-faq.tsx).
// It replaced the honest-estimates scroll story in AU-77. No new health wording (docs/PHASE5.md): every answer
// reuses sentences the app already shows. The first three come from that scroll story (AU-42), the stage 5
// sentence comes from the roadmap, and the rest from the guest results card (guest-flow.tsx) and /privacy.
// Tests check the reused sentences against their sources.
import { STAGES } from "@/lib/landing-content";

export type FaqItem = {
  question: string;
  // A short "Yes." or "No."-style opener, then sentences reused word for word from elsewhere in the app.
  lead?: string;
  sentences: readonly string[];
  link?: { label: string; href: string };
};

export const FAQ_EYEBROW = "questions";
export const FAQ_HEADING = "Before you start";

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "Is my calorie number exact?",
    lead: "No.",
    sentences: ["It comes from a standard formula and your details. Your body may need a little more or less."],
  },
  {
    question: "Why does my weight jump from day to day?",
    sentences: ["Water and food move the scale day to day. RvFit reads the 7-day average, not today's number."],
  },
  {
    question: "Will RvFit change my target by itself?",
    lead: "No.",
    sentences: [
      "A check-in may suggest a small change, never below the minimum. It saves only when you accept it.",
      STAGES[4].sentence,
    ],
  },
  {
    question: "Do I need an account?",
    lead: "Not for your starting estimate.",
    sentences: [
      "Before you have an account, the calculator keeps your answers and estimate in your browser's local storage so you can save them after signing up.",
      "A free account saves your targets and unlocks meal plans, beginner workouts, and progress tracking.",
    ],
    link: { label: "Get my starting estimate", href: "/start" },
  },
  {
    question: "Can I delete my data?",
    lead: "Yes.",
    sentences: [
      "Use Delete my account and data on your profile page. This removes your account and the data linked to it from the live database straight away.",
      "Our providers may keep backups for a limited time, so deleted data can stay in a backup until that backup expires.",
    ],
    link: { label: "Read the privacy policy", href: "/privacy" },
  },
];

export function faqAnswer(item: FaqItem): string {
  return [item.lead, ...item.sentences].filter(Boolean).join(" ");
}
