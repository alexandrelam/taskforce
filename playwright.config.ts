import { defineConfig } from "@playwright/test";

const reuseExistingServer = !process.env.CI;
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
      command: "npm run dev",
      url: "http://127.0.0.1:3325/health",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "npm --prefix web run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:3326",
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
