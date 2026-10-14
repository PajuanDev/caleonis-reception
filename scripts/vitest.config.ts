import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts"],
    // Windows evidence tests invoke the OS to apply and inspect actual ACLs.
    testTimeout: process.platform === "win32" ? 30_000 : 5_000,
  },
});
