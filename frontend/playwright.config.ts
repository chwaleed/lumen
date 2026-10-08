import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // Feature folders nest freely under tests/e2e/<feature>/.
  testMatch: "**/*.spec.ts",

  // Everything a run produces lives under one gitignored folder.
  outputDir: "./tests/artifacts/test-results",

  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["list"],
    ["html", { outputFolder: "./tests/artifacts/report", open: "never" }],
  ],

  use: {
    baseURL: BASE_URL,
    // Proof screenshots are taken explicitly via the `proof` fixture; these two
    // cover the unplanned case where a test fails.
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      // `channel: "chromium"` selects Chrome's new headless mode, which ships
      // the built-in PDF viewer. Old headless has none, so it downloads every
      // application/pdf response instead of rendering it -- which would make
      // the compile preview untestable headlessly.
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],

  // Reuses a dev server you already have running; starts one otherwise.
  // The backend is NOT started here — see tests/README.md for @backend tests.
  webServer: {
    command: "bun dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
