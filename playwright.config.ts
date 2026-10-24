import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Same variables as the app (.env.local). The setup refuses anything but local Supabase.
loadEnvConfig(process.cwd());

const port = 3100;

// Smoke test of a production build against local Supabase: `npm run test:e2e`.
// File names end in .e2e.ts so Vitest does not pick them up.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    timezoneId: "Asia/Manila",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
