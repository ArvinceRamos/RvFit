import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminClient, newTestUser, readTestUser } from "./test-user";

// WCAG 2.1 A and AA rules. Any violation fails the test and is listed in the error.
async function expectNoAxeViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `axe violations on ${page.url()}`).toEqual([]);
}

async function open(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.status(), `status of ${path}`).toBeLessThan(400);
  await expect(page.locator("h1").first()).toBeVisible();
}

// The workout form starts again from the browser's draft once it hydrates, which drops text typed before
// that. Filling until the form's own draft holds the value proves the field is live.
async function fillDuration(page: Page, value: string): Promise<void> {
  const field = page.getByLabel("Duration (minutes)");
  await expect(async () => {
    await field.fill(value);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("rvfit-workout-drafts")), { timeout: 1000 })
      .toContain(`"duration":"${value}"`);
  }).toPass();
}

const publicPages = ["/", "/login", "/signup", "/forgot-password", "/start", "/calculate", "/manual", "/privacy", "/terms", "/glossary"];
const signedInPages = ["/dashboard", "/week", "/meals", "/meals/new", "/foods", "/workouts", "/progress", "/profile", "/preferences", "/account"];

test.describe("guest", () => {
  for (const path of publicPages) {
    test(`${path} loads with no accessibility violations`, async ({ page }) => {
      await open(page, path);
      await expectNoAxeViolations(page);
    });
  }

  test("the web app manifest and its icons are served", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = (await response.json()) as { name: string; display: string; icons: { src: string; sizes: string }[] };
    expect(manifest.name).toBe("RvFit");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons) {
      const image = await request.get(icon.src);
      expect(image.status(), icon.src).toBe(200);
      expect(image.headers()["content-type"]).toBe("image/png");
    }
  });

  test("the health check reaches the database and answers GET and HEAD for an uptime monitor", async ({ request }) => {
    const get = await request.get("/api/health");
    expect(get.status()).toBe(200);
    expect(await get.json()).toEqual({ status: "ok" });
    const head = await request.head("/api/health");
    expect(head.status()).toBe(200);
    expect(await head.text()).toBe("");
  });

  test("the landing FAQ shows the plan line and opens an answer from the keyboard", async ({ page }) => {
    await open(page, "/");
    const faq = page.getByRole("region", { name: "Before you start" });
    await expect(faq.getByText("A starting estimate, not a promise. Review your weight trend over time, then decide whether to edit your target.", { exact: true })).toBeVisible();
    const question = faq.locator("summary", { hasText: "Do I need an account?" });
    const answer = faq.getByText("A free account saves your targets", { exact: false });
    await expect(answer).toBeHidden();
    await question.focus();
    await page.keyboard.press("Enter");
    await expect(answer).toBeVisible();
    await expect(faq.getByRole("link", { name: "Get my starting estimate" })).toBeVisible();
  });

  test("a signed-in page sends a guest to log in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

// Local Supabase catches every auth email in Mailpit instead of sending it.
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function confirmationLink(email: string): Promise<string> {
  let link = "";
  await expect
    .poll(async () => {
      const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
      const { messages } = (await search.json()) as { messages: { ID: string }[] };
      if (!messages.length) return "";
      const message = (await (await fetch(`${mailpitUrl}/api/v1/message/${messages[0].ID}`)).json()) as { Text: string };
      link = message.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\?[^\s)\]]+/)?.[0] ?? "";
      return link;
    }, { message: `confirmation email for ${email}`, timeout: 15_000 })
    .not.toBe("");
  return link;
}

test.describe("sign up", () => {
  test("a new account is confirmed through the emailed link and lands on Today", async ({ page }) => {
    const { email, password } = newTestUser();
    const admin = adminClient();
    try {
      await open(page, "/signup");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByLabel("Confirm password").fill(password);
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByText(`We sent a confirmation link to ${email}.`)).toBeVisible();

      // The link goes to Supabase, which sends the browser back to /auth/callback with a code.
      await page.goto(await confirmationLink(email));
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    } finally {
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const user = data.users.find((candidate) => candidate.email === email);
      if (user) await admin.auth.admin.deleteUser(user.id);
    }
  });
});

test.describe("account deletion", () => {
  test("Delete everything removes the account with its steps, sleep and other activity", async ({ page }) => {
    const { email, password } = newTestUser();
    const admin = adminClient();
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const userId = created.user.id;
    const rowCount = async (table: "daily_activity" | "activity_logs") =>
      (await admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId)).count;
    try {
      const today = new Date().toLocaleDateString("en-CA");
      await admin.from("daily_activity").insert({ user_id: userId, on_date: today, steps: 5000, sleep_minutes: 420 });
      await admin.from("activity_logs").insert({ user_id: userId, performed_on: today, activity_key: "cycling", minutes: 20 });
      expect(await rowCount("daily_activity")).toBe(1);
      expect(await rowCount("activity_logs")).toBe(1);

      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      await open(page, "/profile");
      await page.getByRole("button", { name: "Delete my account and data" }).click();
      await expect(page.getByText("steps, sleep, and other activity", { exact: false })).toBeVisible();
      await page.getByRole("button", { name: "Delete everything" }).click();
      await expect(page).toHaveURL(/\?account=deleted/);

      expect((await admin.auth.admin.getUserById(userId)).data.user).toBeNull();
      expect(await rowCount("daily_activity")).toBe(0);
      expect(await rowCount("activity_logs")).toBe(0);
    } finally {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    const user = readTestUser();
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  for (const path of signedInPages) {
    test(`${path} loads with no accessibility violations`, async ({ page }) => {
      await open(page, path);
      await expectNoAxeViolations(page);
    });
  }

  // App pages have no ribbon at all, even after the auth page started the scene.
  test("an app page renders no ribbon", async ({ page }) => {
    await open(page, "/meals");
    // Longer than the idle wait (up to 2 s) before the scene would start.
    await page.waitForTimeout(2500);
    await expect(page.locator("canvas.ribbon-canvas")).toHaveCount(0);
    await expect(page.locator(".ribbon-static")).toHaveCount(0);
  });

  test("a workout whose reply was lost is saved once when Save is pressed again", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    const countWorkouts = async () =>
      (await admin.from("workout_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id)).count ?? 0;
    const before = await countWorkouts();

    await open(page, "/workouts");
    await page.locator('a[href^="/workouts/log/new?day="]').first().click();
    await expect(page.getByRole("button", { name: "Save workout" })).toBeVisible();
    // The Duration field is numeric too, so skip it.
    await page.locator('input[inputmode="numeric"]:not([name="duration"])').first().fill("10");
    const weight = page.locator('input[inputmode="decimal"]').first();
    if (await weight.count()) await weight.fill("20");

    // The first save reaches the server, but its reply is dropped, as on a weak gym signal.
    let dropped = false;
    await page.route("**/workouts/log/new**", async (route) => {
      if (route.request().method() !== "POST" || dropped) return route.continue();
      dropped = true;
      await route.fetch();
      await route.abort("internetdisconnected");
    });
    await page.getByRole("button", { name: "Save workout" }).click();
    await expect(page.getByText("Your workout could not be sent.")).toBeVisible();
    expect(await countWorkouts()).toBe(before + 1);

    await page.getByRole("button", { name: "Save workout" }).click();
    await expect(page).toHaveURL(/\/workouts\?saved=new/);
    expect(await countWorkouts()).toBe(before + 1);
  });

  test("Copy yesterday copies once and marks the copy as not from the planner", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    // The browser runs in Asia/Manila, so the app's today is Manila's.
    const manilaDate = (offsetDays: number) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(Date.now() + offsetDays * 86_400_000));
    const [yesterday, today] = [manilaDate(-1), manilaDate(0)];
    // Each project (phone, desktop) starts from one meal yesterday and none today.
    await admin.from("meals").delete().eq("user_id", user.id).in("meal_date", [yesterday, today]);
    const { data: food } = await admin.from("foods").select("id").limit(1).single();
    const { data: meal } = await admin.from("meals").insert({ user_id: user.id, meal_date: yesterday, label: "Meal 2" }).select("id").single();
    await admin.from("meal_items").insert({ meal_id: meal!.id, food_id: food!.id, grams: 120 });
    const todayMeals = async () => (await admin.from("meals").select("label, from_plan, eaten").eq("user_id", user.id).eq("meal_date", today)).data;

    await open(page, "/meals");
    await page.getByRole("button", { name: "Copy yesterday" }).click();
    await expect(page.getByText("Copied 1 meal from yesterday.")).toBeVisible();
    expect(await todayMeals()).toEqual([{ label: "Meal 2", from_plan: false, eaten: false }]);

    // After a reload nothing is left to copy, so the button is gone.
    await page.reload();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy yesterday" })).toHaveCount(0);
    expect(await todayMeals()).toHaveLength(1);
  });

  test("Enter my own target starts from a target saved elsewhere once the page re-renders", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    await open(page, "/profile");
    await page.getByRole("button", { name: "Enter my own target" }).click();
    const box = page.getByLabel("Calorie target (kcal)");
    const before = Number(await box.inputValue());

    // A new target saved outside this form, as "Use X kcal" on the check-in card does.
    const kcal = before + 50;
    const { error } = await admin.from("calorie_targets").insert({
      user_id: user.id, guest_draft_id: randomUUID(), source: "manual", target_kcal: kcal, goal: null, pace: null, protein_g: 120, carbs_g: 240, fat_g: 67,
      fiber_g: 29, formula_branch: null, floor_applied: false, config_version: "e2e", calculation_inputs: { weight_kg: 75 },
    });
    expect(error).toBeNull();

    // Saving a name re-renders the page with the new target, without a reload.
    await page.getByLabel("Name (optional)").fill("E2E");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText(`${kcal.toLocaleString("en-US")} kcal`).first()).toBeVisible();
    await expect(box).toHaveValue(String(kcal));
  });

  test("steps and sleep save on today's date, keep each other, and stay after a reload", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    // The browser runs in Asia/Manila, so the app's today is Manila's.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    // Each project (phone, desktop) starts with nothing saved today.
    await admin.from("daily_activity").delete().eq("user_id", user.id).eq("on_date", today);
    const savedDay = async () =>
      (await admin.from("daily_activity").select("steps, sleep_minutes").eq("user_id", user.id).eq("on_date", today)).data;

    await open(page, "/dashboard");
    const stepsForm = page.getByRole("form", { name: "Steps today" });
    const sleepForm = page.getByRole("form", { name: "Sleep last night" });
    await stepsForm.getByLabel("Steps today").fill("8500");
    await stepsForm.getByRole("button", { name: "Save" }).click();
    await expect(stepsForm.getByText("Saved.")).toBeVisible();
    expect(await savedDay()).toEqual([{ steps: 8500, sleep_minutes: null }]);

    await sleepForm.getByLabel("Hours").fill("7");
    await sleepForm.getByLabel("Minutes").fill("30");
    await sleepForm.getByRole("button", { name: "Save" }).click();
    await expect(sleepForm.getByText("Saved.")).toBeVisible();
    // Saving sleep kept the steps.
    expect(await savedDay()).toEqual([{ steps: 8500, sleep_minutes: 450 }]);

    // Saving steps again replaces them and keeps the sleep, still in one row.
    await stepsForm.getByLabel("Steps today").fill("9000");
    await stepsForm.getByRole("button", { name: "Save" }).click();
    await expect.poll(savedDay).toEqual([{ steps: 9000, sleep_minutes: 450 }]);

    await page.reload();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(stepsForm.getByLabel("Steps today")).toHaveValue("9000");
    await expect(sleepForm.getByLabel("Hours")).toHaveValue("7");
    await expect(sleepForm.getByLabel("Minutes")).toHaveValue("30");
  });

  test("Burned today shows the estimate, and asks for profile details when they are missing", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const steps = 6000;
    await admin.from("daily_activity").upsert({ user_id: user.id, on_date: today, steps }, { onConflict: "user_id,on_date" });
    // The latest weigh-in, as the app reads it, so the steps part can be checked against the formula.
    const { data: latest } = await admin
      .from("body_logs").select("weight_kg").eq("user_id", user.id).not("weight_kg", "is", null)
      .order("logged_at", { ascending: false }).limit(1).single();
    // steps × kg × 0.0004 (calculationConfig.activity.kcal_per_step_per_kg, a placeholder).
    const stepsKcal = Math.round(steps * Number(latest!.weight_kg) * 0.0004).toLocaleString("en-US");

    const card = page.locator("section", { has: page.getByRole("heading", { name: "Burned today (estimate)" }) });
    const part = (name: string) => card.locator("div.tile", { has: page.getByText(name, { exact: true }) }).locator("dd");

    // The e2e user has a manual target and no height, age or sex.
    await open(page, "/dashboard");
    await expect(part("Resting").getByRole("link", { name: "Add your details in Profile" })).toHaveAttribute("href", "/profile");
    await expect(part("Steps")).toHaveText(`${stepsKcal} kcal`);
    await expect(card.getByText(/by end of day/)).toHaveCount(0);
    await expect(card.getByText("Burned calories are rough estimates. They do not change your calorie target.")).toBeVisible();

    try {
      await admin.from("profiles").update({ age_years: 30, height_cm: 180, sex_formula_branch: "male" }).eq("user_id", user.id);
      await page.reload();
      await expect(part("Resting")).toHaveText(/^[\d,]+ kcal$/);
      await expect(part("Steps")).toHaveText(`${stepsKcal} kcal`);
      await expect(card.locator(".metric")).toHaveText(/^[\d,]+$/);
      await expect(card.getByText(/^About [\d,]+ kcal by end of day$/)).toBeVisible();
    } finally {
      await admin.from("profiles").update({ age_years: null, height_cm: null, sex_formula_branch: null }).eq("user_id", user.id);
    }
  });

  test("a workout keeps its duration, and the edit form shows it, changes it and clears it", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    const savedDurations = async () =>
      ((await admin.from("workout_logs").select("id, duration_min, created_at").eq("user_id", user.id).order("created_at", { ascending: false })).data ?? []);
    const before = new Set((await savedDurations()).map((row) => row.id));
    const created = async () => (await savedDurations()).filter((row) => !before.has(row.id));

    try {
      await open(page, "/workouts");
      await page.locator('a[href^="/workouts/log/new?day="]').first().click();
      await expect(page.getByRole("button", { name: "Save workout" })).toBeVisible();
      await fillDuration(page, "40");
      await page.locator('input[inputmode="numeric"]:not([name="duration"])').first().fill("10");
      const weight = page.locator('input[inputmode="decimal"]').first();
      if (await weight.count()) await weight.fill("20");
      await page.getByRole("button", { name: "Save workout" }).click();
      await expect(page).toHaveURL(/\/workouts\?saved=new/);
      const [workout] = await created();
      expect(workout.duration_min).toBe(40);

      // Reopen: the saved duration is filled in.
      await open(page, `/workouts/log/${workout.id}`);
      const duration = page.getByLabel("Duration (minutes)");
      await expect(duration).toHaveValue("40");

      // Saving as it is keeps it; a new number replaces it.
      await page.getByRole("button", { name: "Save workout" }).click();
      await expect(page).toHaveURL(/\/workouts\?saved=updated/);
      expect((await created())[0].duration_min).toBe(40);
      await open(page, `/workouts/log/${workout.id}`);
      await fillDuration(page, "55");
      await page.getByRole("button", { name: "Save workout" }).click();
      await expect(page).toHaveURL(/\/workouts\?saved=updated/);
      expect((await created())[0].duration_min).toBe(55);

      // A blank field clears it, and a bad number is refused.
      await open(page, `/workouts/log/${workout.id}`);
      await expect(duration).toHaveValue("55");
      await fillDuration(page, "0");
      await page.getByRole("button", { name: "Save workout" }).click();
      await expect(page.getByText("Duration must be between 1 and 600 minutes.")).toBeVisible();
      expect((await created())[0].duration_min).toBe(55);
      await fillDuration(page, "");
      await page.getByRole("button", { name: "Save workout" }).click();
      await expect(page).toHaveURL(/\/workouts\?saved=updated/);
      expect((await created())[0].duration_min).toBeNull();
      await open(page, `/workouts/log/${workout.id}`);
      await expect(duration).toHaveValue("");
    } finally {
      for (const row of await created()) await admin.from("workout_logs").delete().eq("id", row.id);
    }
  });

  test("Other activity is added on Today, counts in Burned today, and is deleted after a Yes", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    await admin.from("activity_logs").delete().eq("user_id", user.id).eq("performed_on", today);
    const savedToday = async () =>
      (await admin.from("activity_logs").select("activity_key, minutes").eq("user_id", user.id).eq("performed_on", today)).data;
    const { data: latest } = await admin
      .from("body_logs").select("weight_kg").eq("user_id", user.id).not("weight_kg", "is", null)
      .order("logged_at", { ascending: false }).limit(1).single();
    // Running: (8.0 − 1) × kg × 0.5 hours (calculationConfig.activity.other_activities, placeholders).
    const runningKcal = Math.round(7 * Number(latest!.weight_kg) * 0.5).toLocaleString("en-US");

    const burned = page.locator("section", { has: page.getByRole("heading", { name: "Burned today (estimate)" }) });
    const tile = burned.locator("div.tile", { has: page.getByText("Other activity", { exact: true }) }).locator("dd");
    const card = page.locator("section", { has: page.getByRole("heading", { name: "Other activity", exact: true }) }).last();
    const form = page.getByRole("form", { name: "Add activity" });
    const list = card.getByRole("list");

    try {
      await open(page, "/dashboard");
      await expect(tile).toHaveText("0 kcal");
      await expect(card.getByText("No activity added today.")).toBeVisible();
      // Walking is not an option: steps count it.
      await expect(form.getByRole("option", { name: "Walking" })).toHaveCount(0);

      // A bad number is refused and nothing is saved.
      await form.getByLabel("Activity", { exact: true }).selectOption({ label: "Running" });
      await form.getByLabel("Minutes", { exact: true }).fill("0");
      await form.getByRole("button", { name: "Add activity" }).click();
      await expect(form.getByText("Minutes must be between 1 and 600 minutes.")).toBeVisible();
      expect(await savedToday()).toEqual([]);

      await form.getByLabel("Minutes", { exact: true }).fill("30");
      await form.getByRole("button", { name: "Add activity" }).click();
      await expect(form.getByText("Saved.")).toBeVisible();
      await expect(list.getByText("Running", { exact: true })).toBeVisible();
      await expect(list.getByText("· 30 min")).toBeVisible();
      await expect(tile).toHaveText(`${runningKcal} kcal`);
      // The page does not scroll sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await savedToday()).toEqual([{ activity_key: "running", minutes: 30 }]);

      // No keeps it; Yes deletes it and the tile goes back to zero.
      await card.getByRole("button", { name: "Delete Running" }).click();
      await expect(card.getByText("Delete this activity?")).toBeVisible();
      await card.getByRole("button", { name: "No" }).click();
      await expect(list.getByText("Running", { exact: true })).toBeVisible();
      await card.getByRole("button", { name: "Delete Running" }).click();
      await card.getByRole("button", { name: "Yes" }).click();
      await expect(card.getByText("No activity added today.")).toBeVisible();
      await expect(tile).toHaveText("0 kcal");
      expect(await savedToday()).toEqual([]);
    } finally {
      await admin.from("activity_logs").delete().eq("user_id", user.id).eq("performed_on", today);
    }
  });

  test("Progress shows Steps and Sleep averages only from 3 days with a number, and lists the last 7 days", async ({ page }) => {
    const user = readTestUser();
    const admin = adminClient();
    // The browser runs in Asia/Manila, so the app's today is Manila's. Earlier dates are counted back from it.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const daysAgo = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
    const clean = () => admin.from("daily_activity").delete().eq("user_id", user.id).gte("on_date", daysAgo(10));
    const put = (days: number, steps: number | null, sleep_minutes: number | null) =>
      admin.from("daily_activity").upsert({ user_id: user.id, on_date: daysAgo(days), steps, sleep_minutes }, { onConflict: "user_id,on_date" });
    const card = (name: string) => page.locator("section").filter({ has: page.getByRole("heading", { name, exact: true }) });
    const stepsCard = card("Steps");
    const sleepCard = card("Sleep");
    const dayLine = (block: typeof stepsCard, days: number) =>
      block.locator("li").filter({ has: page.locator(`time[datetime="${daysAgo(days)}"]`) });

    await clean();
    try {
      // Nothing saved: no average, and a dash on every one of the 7 days.
      await open(page, "/progress");
      await expect(stepsCard.getByText("Not enough data yet.")).toBeVisible();
      await expect(sleepCard.getByText("Not enough data yet.")).toBeVisible();
      await expect(stepsCard.locator("li")).toHaveCount(7);
      await expect(dayLine(stepsCard, 0)).toContainText("—");
      await expect(dayLine(stepsCard, 6)).toContainText("—");

      // Today's numbers come from the Today form.
      await open(page, "/dashboard");
      const stepsForm = page.getByRole("form", { name: "Steps today" });
      const sleepForm = page.getByRole("form", { name: "Sleep last night" });
      await stepsForm.getByLabel("Steps today").fill("9000");
      await stepsForm.getByRole("button", { name: "Save" }).click();
      await expect(stepsForm.getByText("Saved.")).toBeVisible();
      await sleepForm.getByLabel("Hours").fill("7");
      await sleepForm.getByLabel("Minutes").fill("30");
      await sleepForm.getByRole("button", { name: "Save" }).click();
      await expect(sleepForm.getByText("Saved.")).toBeVisible();

      // One day each is still not enough.
      await open(page, "/progress");
      await expect(stepsCard.getByText("Not enough data yet.")).toBeVisible();
      await expect(dayLine(stepsCard, 0)).toContainText("9,000");
      await expect(dayLine(sleepCard, 0)).toContainText("7 h 30 min");

      // Two earlier days: steps reach 3 days, sleep has 2. A day outside the window is ignored.
      await put(1, 6000, 420);
      await put(2, 3000, null);
      await put(8, 99999, 600);
      await open(page, "/progress");
      await expect(stepsCard.locator("p.metric")).toHaveText("6,000");
      await expect(dayLine(stepsCard, 1)).toContainText("6,000");
      await expect(dayLine(stepsCard, 2)).toContainText("3,000");
      await expect(dayLine(stepsCard, 3)).toContainText("—");
      await expect(stepsCard.locator("li")).toHaveCount(7);
      await expect(sleepCard.getByText("Not enough data yet.")).toBeVisible();
      await expect(dayLine(sleepCard, 1)).toContainText("7 h 0 min");

      // A third sleep day gives the sleep average: (450 + 420 + 480) / 3 = 450 minutes.
      await put(3, null, 480);
      await open(page, "/progress");
      await expect(sleepCard.locator("p.metric")).toHaveText("7 h 30 min");
      await expect(stepsCard.locator("p.metric")).toHaveText("6,000");
      await expectNoAxeViolations(page);
    } finally {
      await clean();
    }
  });

  test("a weigh-in saves and log out ends the session", async ({ page }) => {
    await open(page, "/progress");
    await page.getByLabel(/^Weight \(kg\)/).fill("74.5");
    await page.getByRole("button", { name: "Save weigh-in" }).click();
    await expect(page.getByText("Weigh-in saved.")).toBeVisible();
    await expect(page.getByText("74.5", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
