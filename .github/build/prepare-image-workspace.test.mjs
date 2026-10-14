import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { test } from "node:test";

function runPnpm(args, directory) {
  // pnpm's JavaScript entry point also works on Windows without a command shell.
  const entryPoint = process.env.npm_execpath;
  if (entryPoint && /(?:^|[\\/])pnpm(?:\.c?js)?$/.test(entryPoint)) {
    return execFileSync(process.execPath, [entryPoint, ...args], { cwd: directory, stdio: "pipe" });
  }
  return execFileSync("pnpm", args, { cwd: directory, stdio: "pipe" });
}

test("image projection preserves the lockfile and excludes local tooling", () => {
  const directory = mkdtempSync(join(tmpdir(), "lobbystack-image-lock-"));
  try {
    for (const file of ["pnpm-lock.yaml", "pnpm-workspace.yaml", "patches"]) {
      cpSync(file, join(directory, file), { recursive: true });
    }
    const prepare = resolve(".github/build/prepare-image-workspace.mjs");
    execFileSync(process.execPath, [prepare, "--lockfile-only"], { cwd: directory });
    assert(!existsSync(join(directory, "package.json")));
    const lock = readFileSync(join(directory, "pnpm-lock.yaml"), "utf8");
    assert(!lock.includes("\n  mintlify:\n"));
    assert(!lock.includes("\n      next-devtools-mcp:\n"));
    assert(!lock.includes("\n      railway:\n"));
    assert(lock.includes("\n  apps/admin:\n"));
    assert.equal(lock.split("\npackages:\n")[1], readFileSync("pnpm-lock.yaml", "utf8").split("\npackages:\n")[1]);
    if (process.env.VERIFY_IMAGE_FETCH === "1") {
      runPnpm(["fetch", "--offline", "--ignore-scripts"], directory);
    }
    cpSync("package.json", join(directory, "package.json"));
    execFileSync(process.execPath, [prepare], { cwd: directory });
    assert.equal(readFileSync(join(directory, "pnpm-lock.yaml"), "utf8"), lock);
    // Frozen validation catches a root importer/manifest mismatch without downloading packages.
    runPnpm(["install", "--lockfile-only", "--frozen-lockfile", "--ignore-scripts"], directory);
    if (process.env.VERIFY_IMAGE_FETCH === "1") {
      for (const parent of ["apps", "packages"]) {
        for (const name of readdirSync(parent)) {
          const manifest = join(parent, name, "package.json");
          if (!existsSync(manifest)) continue;
          mkdirSync(join(directory, parent, name), { recursive: true });
          cpSync(manifest, join(directory, manifest));
        }
      }
      runPnpm(["install", "--offline", "--frozen-lockfile", "--ignore-scripts"], directory);
      const packages = readdirSync(join(directory, "node_modules/.pnpm"));
      assert(!packages.some(name => /^(?:@mintlify\+|mintlify@|next-devtools-mcp@|railway@)/.test(name)));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
