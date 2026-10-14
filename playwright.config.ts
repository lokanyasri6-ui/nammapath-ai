import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const localChromium = "/opt/pw-browsers/chromium";
const executablePath = process.env.PW_CHROMIUM_PATH || (fs.existsSync(localChromium) ? undefined : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3100",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start -- -p 3100", port: 3100, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
