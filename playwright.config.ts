import { defineConfig } from "@playwright/test";

const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3326",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: chromiumExecutablePath,
        },
      },
    },
  ],
  webServer: [
    {
      command:
        "DATABASE_PATH=data/e2e.sqlite.db DISABLE_PR_POLLER=1 ENABLE_E2E_API=1 npx tsx src/index.ts",
      url: "http://127.0.0.1:3325/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm --prefix web run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:3326",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
