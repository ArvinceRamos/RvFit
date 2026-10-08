// Words and links for the landing page. See docs/PHASE5.md.
// Stage titles, sentences and the honest-estimates line must match docs/PLAN.md word for word (tests check this).

export type LandingStage = {
  number: number;
  label: string;
  title: string;
  sentence: string;
  features: readonly string[];
  href: string;
  linkLabel: string;
};

export type LandingAction = {
  label: string;
  href: string;
};

export const HERO_HEADLINE = "Know your numbers.";
export const HERO_ITALIC_WORD = "numbers";
export const HERO_SUPPORT =
  "Set a starting target, plan your meals, train, and track your weight trend. One step at a time.";

// Both target actions go to /start so the age checkbox is never skipped.
export const HERO_PRIMARY: LandingAction = { label: "Get my starting estimate", href: "/start" };
export const HERO_ROADMAP: LandingAction = { label: "See the roadmap", href: "#roadmap" };
export const HERO_OWN_TARGET: LandingAction = { label: "Enter my own target", href: "/start" };
export const HERO_LOG_IN: LandingAction = { label: "Log in", href: "/login" };

export const ACCOUNT_DELETED_NOTICE = "Your account and data were deleted.";

export const HONEST_ESTIMATES_LINE =
  "A starting estimate, not a promise. Review your weight trend over time, then decide whether to edit your target.";

export const STAGES: readonly LandingStage[] = [
  {
    number: 1,
    label: "stage 1 / 5",
    title: "Know your numbers",
    sentence: "Choose a calorie estimate or enter your own target, then review calorie and macro targets.",
    features: [
      "Calorie estimate or your own target",
      "Protein, carb, fat and fiber targets",
      "Try it before you make an account",
    ],
    href: "/start",
    linkLabel: "Get my starting estimate",
  },
  {
    number: 2,
    label: "stage 2 / 5",
    title: "Fuel your day",
    sentence: "Pick protein, carb, and fat foods, then use simple suggestions to help fill macro targets.",
    features: [
      "Meal builder with protein, carb, fat and fiber slots",
      "Meal planner for a day or a week",
      "Food library and food preferences",
      "Eaten checklist and a prep list for the day",
    ],
    href: "/meals",
    linkLabel: "Open Meals",
  },
  {
    number: 3,
    label: "stage 3 / 5",
    title: "Train your week",
    sentence: "Choose a workout template for your schedule, equipment, and experience.",
    features: [
      "Workout plan from your preferences",
      "Swap exercises",
      "Log your sets",
      "Optional progression prompts from your last session",
    ],
    href: "/workouts",
    linkLabel: "Open Workouts",
  },
  {
    number: 4,
    label: "stage 4 / 5",
    title: "Track your trend",
    sentence: "Log weigh-ins and review your 7-day average alongside your activity.",
    features: [
      "Weigh-ins with a 7-day average",
      "Weight chart over 7, 30 or 90 days",
      "Workouts per week",
      "Dashboard and weekly plan",
    ],
    href: "/progress",
    linkLabel: "Open Progress",
  },
  {
    number: 5,
    label: "stage 5 / 5",
    title: "Review and adjust",
    sentence: "Review progress and edit targets yourself. The app never changes targets automatically.",
    features: [
      "Edit your details and recalculate",
      "Edit macros with a mismatch warning",
      "Delete your account and data",
    ],
    href: "/profile",
    linkLabel: "Open Profile and targets",
  },
];


