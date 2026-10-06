import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HERO_HEADLINE,
  HERO_ITALIC_WORD,
  HERO_LOG_IN,
  HERO_OWN_TARGET,
  HERO_PRIMARY,
  HERO_ROADMAP,
  HONEST_ESTIMATES_LINE,
  STAGES,
} from "./landing-content";

const plan = readFileSync(join(process.cwd(), "docs", "PLAN.md"), "utf8").replace(/\r\n/g, "\n");

function planStage(n: number) {
  const match = plan.match(new RegExp(`^${n}\\. \\*\\*(.+?)\\*\\* — (.+)$`, "m"));
  if (!match) throw new Error(`Stage ${n} not found in docs/PLAN.md`);
  return { title: match[1], rest: match[2] };
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

describe("landing stages", () => {
  it("has five stages in order with stage labels", () => {
    expect(STAGES.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(STAGES.map((s) => s.label)).toEqual(
      [1, 2, 3, 4, 5].map((n) => `stage ${n} / 5`),
    );
  });

  it.each([1, 2, 3, 4, 5])("stage %i title and sentence match docs/PLAN.md word for word", (n) => {
    const stage = STAGES[n - 1];
    const fromPlan = planStage(n);
    expect(stage.title).toBe(fromPlan.title);
    // The plan sentence starts lowercase after the dash. Stage 5 also has a note for the builder, which is not shown.
    expect(fromPlan.rest.startsWith(lowerFirst(stage.sentence))).toBe(true);
    if (n < 5) expect(fromPlan.rest).toBe(lowerFirst(stage.sentence));
  });

  it("gives each stage 3 or 4 feature lines", () => {
    for (const stage of STAGES) {
      expect(stage.features.length).toBeGreaterThanOrEqual(3);
      expect(stage.features.length).toBeLessThanOrEqual(4);
      for (const line of stage.features) expect(line.trim()).not.toBe("");
    }
  });

  it("links each stage to its screen", () => {
    expect(STAGES.map((s) => s.href)).toEqual(["/start", "/meals", "/workouts", "/progress", "/profile"]);
  });
});

describe("landing actions", () => {
  it("sends both target actions to /start so the age checkbox is not skipped", () => {
    expect(HERO_PRIMARY.href).toBe("/start");
    expect(HERO_OWN_TARGET.href).toBe("/start");
    expect(STAGES[0].href).toBe("/start");
  });

  it("has the four required actions with the plan wording", () => {
    expect(HERO_PRIMARY.label).toBe("Get my starting estimate");
    expect(HERO_ROADMAP).toEqual({ label: "See the roadmap", href: "#roadmap" });
    expect(HERO_OWN_TARGET.label).toBe("Enter my own target");
    expect(HERO_LOG_IN).toEqual({ label: "Log in", href: "/login" });
    for (const stage of STAGES) expect(stage.href).not.toMatch(/^\/(calculate|manual)/);
  });
});

describe("landing text", () => {
  it("matches the honest-estimates line in docs/PLAN.md", () => {
    expect(plan).toContain(`> ${HONEST_ESTIMATES_LINE}`);
  });

  it("uses one italic word that is in the headline", () => {
    expect(HERO_HEADLINE).toContain(HERO_ITALIC_WORD);
    expect(HERO_ITALIC_WORD).not.toMatch(/\s/);
  });
});
