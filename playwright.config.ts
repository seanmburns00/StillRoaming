import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:4173/StillRoaming/", trace: "retain-on-failure" },
  webServer: {
    command: "npm run preview -- --strictPort",
    url: "http://localhost:4173/StillRoaming/",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
  ],
});
