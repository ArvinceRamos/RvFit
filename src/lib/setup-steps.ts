// First-run setup steps on the Dashboard. Each step is done only when real saved data exists,
// so unsaved defaults (for example the Preferences form before Save) never count.

export type SetupFlags = {
  hasTarget: boolean;
  hasPreferences: boolean;
  hasMeal: boolean;
  hasWeighIn: boolean;
};

export type SetupStep = { key: keyof SetupFlags; title: string; detail: string; href: string; action: string; done: boolean };

export function setupSteps(flags: SetupFlags): SetupStep[] {
  return [
    {
      key: "hasTarget",
      title: "Set your calorie target",
      detail: "A starting estimate takes about a minute.",
      href: "/start",
      action: "Get my estimate",
      done: flags.hasTarget,
    },
    {
      key: "hasPreferences",
      title: "Save your training preferences",
      detail: "Your experience, equipment, and days unlock your workout plan.",
      href: "/preferences",
      action: "Set preferences",
      done: flags.hasPreferences,
    },
    {
      key: "hasMeal",
      title: "Add your first meal",
      detail: "Build one yourself, or let the planner suggest portions.",
      href: "/meals/new",
      action: "Add a meal",
      done: flags.hasMeal,
    },
    {
      key: "hasWeighIn",
      title: "Log your first weigh-in",
      detail: "Your weight trend shows whether the target is working.",
      href: "/progress",
      action: "Log a weigh-in",
      done: flags.hasWeighIn,
    },
  ];
}

/** The card shows until every step is done. */
export function setupComplete(flags: SetupFlags): boolean {
  return setupSteps(flags).every((step) => step.done);
}
