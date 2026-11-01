import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the app's own logic (services, storage, routes). Native modules are mocked in each
// test; the shared web logic in ../src/lib keeps its own tests in the web app.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/lib\/(.*)$/, replacement: path.resolve(import.meta.dirname, "../src/lib/$1") },
      { find: /^~\/(.*)$/, replacement: path.resolve(import.meta.dirname, "./src/$1") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
