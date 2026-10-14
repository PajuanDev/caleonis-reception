#!/usr/bin/env node
// Writes .env from .env.example with every internal secret generated. Provider credentials
// (Twilio, Polar, ...) are cleared rather than generated: only the operator can supply them.
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateEnv } from "./generate-env-core.mjs";
export { generateEnv } from "./generate-env-core.mjs";

function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const target = resolve(root, ".env");
  if (existsSync(target) && !process.argv.includes("--force")) {
    console.error(".env already exists. Rerun with --force to replace it and every secret in it.");
    process.exit(1);
  }
  const { output, generated } = generateEnv(readFileSync(resolve(root, ".env.example"), "utf8"));
  writeFileSync(target, output, { mode: 0o600 });
  console.log(`Wrote .env with ${generated.length} generated secrets.`);
  console.log("Add OPENAI_API_KEY and your Twilio credentials before you start calls.");
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
