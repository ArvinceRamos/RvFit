import { describe, expect, it } from "vitest";
import { getExercise } from "./exercises";
import { isBarbellExercise, plateLoad, plateText } from "./plates";

describe("plate math", () => {
  it("splits the weight over both sides, largest plates first", () => {
    expect(plateText("60", "metric")).toBe("Each side of a 20 kg bar: 20 kg.");
    expect(plateText("102.5", "metric")).toBe("Each side of a 20 kg bar: 25 + 15 + 1.25 kg.");
    expect(plateText("135", "imperial")).toBe("Each side of a 45 lb bar: 45 lb.");
    expect(plateText("185", "imperial")).toBe("Each side of a 45 lb bar: 45 + 25 lb.");
  });

  it("covers the bar alone and weights below it", () => {
    expect(plateText("20", "metric")).toBe("Just the 20 kg bar.");
    expect(plateText("15", "metric")).toBe("Less than a 20 kg bar.");
    expect(plateText("40", "imperial")).toBe("Less than a 45 lb bar.");
  });

  it("gives the closest load below and the gap when plates cannot make it", () => {
    expect(plateLoad("23", "metric")).toEqual({ kind: "plates", bar: 20, perSide: [1.25], shortPerSide: 0.25 });
    expect(plateText("23", "metric")).toBe("Each side of a 20 kg bar: 1.25 kg (0.25 kg short each side).");
    // Less than the smallest plate per side: only the bar can be loaded.
    expect(plateText("21", "metric")).toBe("Just the 20 kg bar (0.5 kg short each side).");
  });

  it("returns nothing for blank or unreadable text", () => {
    expect(plateText("", "metric")).toBeNull();
    expect(plateText("  ", "imperial")).toBeNull();
    expect(plateText("abc", "metric")).toBeNull();
    expect(plateText("0", "metric")).toBeNull();
    expect(plateText("-40", "metric")).toBeNull();
  });

  it("knows which exercises use a barbell", () => {
    expect(isBarbellExercise("barbell-back-squat")).toBe(true);
    expect(isBarbellExercise("goblet-squat")).toBe(false);
    for (const key of ["barbell-back-squat", "barbell-bench-press", "barbell-curl"]) {
      expect(getExercise(key)?.name.startsWith("Barbell")).toBe(true);
    }
  });
});
