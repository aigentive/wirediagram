import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3871",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npx next dev --port 3871",
    cwd: "apps/playground",
    url: "http://localhost:3871",
    reuseExistingServer: true,
    timeout: 120_000
  }
});
