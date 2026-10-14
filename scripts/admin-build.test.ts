import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createBuildInvocation } from "../apps/admin/scripts/build.mjs";

describe("portable Next.js production build", () => {
  it("passes production mode and literal arguments without a shell", () => {
    const invocation = createBuildInvocation(["--webpack"], { NODE_ENV: "development", PRESERVED_SETTING: "fixture" });
    expect(invocation.executable).toBe(process.execPath);
    expect(invocation.args.slice(1)).toEqual(["build", "--webpack"]);
    expect(invocation.options.env).toMatchObject({ NODE_ENV: "production", PRESERVED_SETTING: "fixture" });
    expect(invocation.options).not.toHaveProperty("shell");
  });
  it("starts the installed Next CLI on this host with forwarded help arguments", () => {
    const build = fileURLToPath(new URL("../apps/admin/scripts/build.mjs", import.meta.url));
    const admin = fileURLToPath(new URL("../apps/admin", import.meta.url));
    const output = execFileSync(process.execPath, [build, "--help"], { cwd: admin, encoding: "utf8", env: { ...process.env, NODE_ENV: "development" }, windowsHide: true });
    expect(output).toContain("next build");
    expect(output).toContain("--webpack");
  });
});
