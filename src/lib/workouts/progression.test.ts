import { describe, expect, it } from "vitest";
import { lastTimeText, pickLastSessions, progressionPrompt, type EarlierLog, type LastSession } from "./progression";

function session(sets: [number | null, number | null, number | null][]): LastSession {
  return {
    performedOn: "2026-10-05",
    sets: sets.map(([reps, seconds, weightKg], index) => ({ setNumber: index + 1, reps, seconds, weightKg })),
  };
}

const upperLoaded = { measure: "reps", loaded: true, pattern: "horizontal_push", topOfRange: 12 } as const;
const lowerLoaded = { ...upperLoaded, pattern: "squat" } as const;
const bodyweight = { measure: "reps", loaded: false, pattern: "horizontal_push", topOfRange: 12 } as const;
const hold = { measure: "seconds", loaded: false, pattern: "core", topOfRange: 40 } as const;

describe("pickLastSessions", () => {
  const logs: EarlierLog[] = [
    { performed_on: "2026-10-04", workout_log_sets: [{ exercise_key: "leg-press", set_number: 2, reps: 9, seconds: null, weight_kg: "100.00" }, { exercise_key: "leg-press", set_number: 1, reps: 10, seconds: null, weight_kg: "100.00" }] },
    { performed_on: "2026-10-01", workout_log_sets: [{ exercise_key: "leg-press", set_number: 1, reps: 8, seconds: null, weight_kg: "90.00" }, { exercise_key: "plank", set_number: 1, reps: null, seconds: 30, weight_kg: null }] },
  ];

  it("takes the newest log containing each exercise, sorted by set number", () => {
    const found = pickLastSessions(logs, ["leg-press", "plank", "push-up"]);
    expect(found["leg-press"]).toEqual({
      performedOn: "2026-10-04",
      sets: [
        { setNumber: 1, reps: 10, seconds: null, weightKg: 100 },
        { setNumber: 2, reps: 9, seconds: null, weightKg: 100 },
      ],
    });
    expect(found.plank.performedOn).toBe("2026-10-01");
    expect(found["push-up"]).toBeUndefined();
  });
});

describe("lastTimeText", () => {
  it("lists sets with weights in the user's units", () => {
    const last = session([[10, null, 100], [11, null, 100]]);
    expect(lastTimeText(last, "reps", "metric")).toBe("Oct 5, 2026: 10 × 100 kg, 11 × 100 kg");
    expect(lastTimeText(session([[10, null, 61.23]]), "reps", "imperial")).toBe("Oct 5, 2026: 10 × 135 lb");
  });

  it("shows bodyweight reps and hold seconds", () => {
    expect(lastTimeText(session([[12, null, null], [10, null, null]]), "reps", "metric")).toBe("Oct 5, 2026: 12, 10");
    expect(lastTimeText(session([[null, 30, null], [null, 35, null]]), "seconds", "metric")).toBe("Oct 5, 2026: 30 s, 35 s");
  });
});

describe("progressionPrompt", () => {
  const top = session([[12, null, 50], [12, null, 50], [12, null, 52.5]]);

  it("adds the upper-body step to the heaviest weight, rounded to 0.5 kg", () => {
    expect(progressionPrompt(top, upperLoaded, 3, "metric")).toBe(
      "You reached the top of the range on every set last time. Optional: try 55 kg.",
    );
  });

  it("uses the larger step for lower-body patterns", () => {
    expect(progressionPrompt(top, lowerLoaded, 3, "metric")).toContain("try 57.5 kg.");
  });

  it("rounds to 1 lb in imperial units", () => {
    // 52.5 kg + 2.5 kg = 55 kg = 121.25 lb
    expect(progressionPrompt(top, upperLoaded, 3, "imperial")).toContain("try 121 lb.");
  });

  it("does not show when a planned set missed the top, or too few sets were logged", () => {
    expect(progressionPrompt(session([[12, null, 50], [11, null, 50], [12, null, 50]]), upperLoaded, 3, "metric")).toBeNull();
    expect(progressionPrompt(session([[12, null, 50], [12, null, 50]]), upperLoaded, 3, "metric")).toBeNull();
    expect(progressionPrompt(session([]), upperLoaded, 3, "metric")).toBeNull();
  });

  it("allows extra sets and only checks the planned ones", () => {
    const extra = session([[12, null, 50], [12, null, 50], [12, null, 50], [6, null, 50]]);
    expect(progressionPrompt(extra, upperLoaded, 3, "metric")).not.toBeNull();
  });

  it("shows nothing for a loaded exercise logged without weights", () => {
    expect(progressionPrompt(session([[12, null, null], [12, null, null], [12, null, null]]), upperLoaded, 3, "metric")).toBeNull();
  });

  it("suggests a few more reps for an unloaded exercise", () => {
    expect(progressionPrompt(session([[12, null, null], [13, null, null]]), bodyweight, 2, "metric")).toContain("aim for 14 reps per set.");
  });

  it("suggests a few more seconds for a hold", () => {
    expect(progressionPrompt(session([[null, 40, null], [null, 42, null]]), hold, 2, "metric")).toContain("hold 45 seconds per set.");
    expect(progressionPrompt(session([[null, 39, null], [null, 42, null]]), hold, 2, "metric")).toBeNull();
  });
});
