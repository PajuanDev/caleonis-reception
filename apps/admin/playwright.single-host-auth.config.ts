import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// This config is only invoked after a fresh certification build. It never
// expands the trusted-origin list of the ordinary fixture or of production.
if (process.env.CI !== "1" || process.env.E2E_SINGLE_HOST_GATEWAY_REHEARSAL !== "loopback-disposable" || process.env.P1_SINGLE_HOST_STAGING !== "true" || process.env.RAILWAY_ENVIRONMENT_NAME !== "certification") throw new Error("Use scripts/e2e-local.sh for the isolated auth rehearsal.");
const baseURL = process.env.PLAYWRIGHT_BASE_URL!;
const publicURL = new URL(baseURL);
if (publicURL.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(publicURL.hostname) || !publicURL.port) throw new Error("Only literal HTTP loopback is supported.");
const internalPort = Number(process.env.E2E_SINGLE_HOST_NEXT_PORT ?? Number(publicURL.port) + 1);
const nextOrigin = `http://127.0.0.1:${internalPort}`;
const original = base.webServer;
if (!original || Array.isArray(original)) throw new Error("Expected exactly one original Next fixture.");

export default defineConfig(base, {
  testDir: "./single-host-auth-e2e",
  testMatch: "**/*.e2e.ts",
  testIgnore: [],
  retries: 0,
  workers: 1,
  outputDir: "test-results/single-host-auth",
  use: { baseURL, trace: "off" }, // No reusable session values in artifacts.
  webServer: [
    {
      ...original,
      url: `${nextOrigin}/api/health/live`,
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
      env: {
        ...original.env,
        PORT: String(internalPort), HOSTNAME: "127.0.0.1",
        APP_BASE_URL: baseURL, AUTH_TRUSTED_ORIGINS: baseURL,
        P1_SINGLE_HOST_STAGING: "true", RAILWAY_ENVIRONMENT_NAME: "certification",
        LIVE_PROTOTYPE_ENABLED: "false", PHONE_NUMBER_PURCHASE_ENABLED: "false",
        AFFILIATE_PROGRAM_ENABLED: "false",
      },
    },
    {
      name: "single-host-auth-gateway",
      command: "node ../../scripts/p1-single-host-auth-server.mjs",
      url: `${baseURL}/fr/`,
      reuseExistingServer: false,
      timeout: 120000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
  ],
});
