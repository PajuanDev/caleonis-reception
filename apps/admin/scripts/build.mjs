import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export function createBuildInvocation(args = [], environment = process.env) {
  return {
    executable: process.execPath,
    args: [require.resolve("next/dist/bin/next"), "build", ...args],
    options: { stdio: "inherit", env: { ...environment, NODE_ENV: "production" }, windowsHide: true },
  };
}

export function runAdminBuild(args = process.argv.slice(2)) {
  const invocation = createBuildInvocation(args);
  const child = spawn(invocation.executable, invocation.args, invocation.options);
  child.once("error", () => { console.error("Next.js build could not be started."); process.exitCode = 1; });
  child.once("exit", (code) => { process.exitCode = code ?? 1; });
  return child;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runAdminBuild();
