// The honest-estimates scroll story (src/components/estimate-story.tsx): three rules for how RvFit treats
// your numbers, each with a 3D object (src/components/showcase-scene.ts) and two facts. The roadmap above
// already walks through the stages, so these steps explain the why instead. Sample numbers come from the
// same demo data as the App previews, and every line describes something the app really does.
import { calculationConfig } from "@/lib/calc/config";
import { DEMO_WEIGHTS_KG, demoWeightWindow } from "@/lib/demo-data";

export type ShowcaseObject = "ring" | "plate" | "weights" | "scale" | "sliders";

export type EstimateStep = {
  object: ShowcaseObject;
  label: string;
  title: string;
  caption: string;
  facts: readonly { label: string; value: string }[];
};

const latestAverage = (() => {
  const { averages } = demoWeightWindow(30);
  return averages[averages.length - 1];
})();

// How far the sample weigh-ins moved in the last 7 days, highest minus lowest.
const weekSwing = (() => {
  const week = DEMO_WEIGHTS_KG.slice(-7);
  return Math.max(...week) - Math.min(...week);
})();

export const SHOWCASE_SCALE_READOUT = `${latestAverage.toFixed(1)} kg`;

const { change_kcal } = calculationConfig.check_in;

export const ESTIMATE_STEPS: readonly EstimateStep[] = [
  {
    object: "ring",
    label: "Starting point",
    title: "An estimate is a first guess",
    caption: "It comes from a standard formula and your details. Your body may need a little more or less.",
    facts: [
      { label: "Formula", value: "Mifflin-St Jeor" },
      { label: "Or skip it", value: "Your own target" },
    ],
  },
  {
    object: "scale",
    label: "Trend over today",
    title: "One weigh-in means little",
    caption: "Water and food move the scale day to day. RvFit reads the 7-day average, not today's number.",
    facts: [
      { label: "Swing this week", value: `${weekSwing.toFixed(1)} kg` },
      { label: "7-day average", value: SHOWCASE_SCALE_READOUT },
    ],
  },
  {
    object: "sliders",
    label: "You decide",
    title: "Nothing changes on its own",
    caption: "A check-in may suggest a small change, never below the minimum. Nothing saves until you press Save.",
    facts: [
      { label: "Suggestion", value: `${change_kcal.min}–${change_kcal.max} kcal` },
      { label: "Applied by", value: "You" },
    ],
  },
];
