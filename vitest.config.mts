import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "node",
    // The Expo app runs its own tests (mobile/vitest.config.mts).
    exclude: ["**/node_modules/**", "mobile/**"],
  },
});
