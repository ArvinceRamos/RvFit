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
    await page.locator('input[inputmode="numeric"]').first().fill("10");
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
