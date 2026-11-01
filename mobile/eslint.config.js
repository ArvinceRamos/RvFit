// ESLint for the Expo app. Kept separate from the web app's config, which ignores mobile/.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*", ".expo/*"],
  },
  {
    // Tests mock modules before importing the code under test (vi.mock is hoisted anyway).
    files: ["**/*.test.ts"],
    rules: { "import/first": "off" },
  },
  {
    settings: {
      // "@/lib/..." is the web app's shared logic in ../src/lib (see metro.config.js and tsconfig.json).
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
    },
  },
]);
