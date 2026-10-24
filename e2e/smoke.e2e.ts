import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, readTestUser } from "./test-user";

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

const publicPages = ["/", "/login", "/signup", "/forgot-password", "/start", "/calculate", "/manual", "/privacy", "/terms"];
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

  test("a signed-in page sends a guest to log in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
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
