import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HONEST_ESTIMATES_LINE, STAGES } from "./landing-content";
import { FAQ_ITEMS, faqAnswer } from "./landing-faq";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8").replace(/\r\n/g, "\n");

// Page source as plain text: entities decoded and tags dropped, so sentences compare word for word.
const asText = (source: string) =>
  source
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ");

const plan = read("docs", "PLAN.md");
const privacy = asText(read("src", "app", "privacy", "page.tsx"));
const guestFlow = asText(read("src", "components", "guest-flow.tsx"));

describe("Before you start FAQ", () => {
  it("keeps the plan's honest-estimates line word for word", () => {
    expect(HONEST_ESTIMATES_LINE).toBe(
      "A starting estimate, not a promise. Review your weight trend over time, then decide whether to edit your target.",
    );
    expect(plan).toContain(`> ${HONEST_ESTIMATES_LINE}`);
  });

  it("has five questions, each with an answer", () => {
    expect(FAQ_ITEMS).toHaveLength(5);
    for (const item of FAQ_ITEMS) {
      expect(item.question.endsWith("?")).toBe(true);
      expect(item.sentences.length).toBeGreaterThan(0);
      expect(faqAnswer(item)).toContain(item.sentences.join(" "));
    }
  });

  it("reuses the roadmap's stage 5 sentence for the target question", () => {
    expect(FAQ_ITEMS[2].sentences).toContain(STAGES[4].sentence);
  });

  it("reuses the guest results and privacy sentences word for word", () => {
    for (const sentence of FAQ_ITEMS[3].sentences.concat(FAQ_ITEMS[4].sentences)) {
      expect(privacy.includes(sentence) || guestFlow.includes(sentence)).toBe(true);
    }
  });

  it("links only to public pages", () => {
    expect(FAQ_ITEMS.flatMap((item) => (item.link ? [item.link.href] : []))).toEqual(["/start", "/privacy"]);
  });
});
