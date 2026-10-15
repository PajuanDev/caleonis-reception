import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Independent filesystem check: Mintlify's Windows path matching can report
// false missing links for MDX files nested more than one directory deep.
const docs = dirname(fileURLToPath(import.meta.url));
const root = resolve(docs, "..");
const config = JSON.parse(await readFile(join(docs, "docs.json"), "utf8"));
const packages = await readdir(join(root, "node_modules/.pnpm"));
const installed = packages.find((name) => name.startsWith("@mintlify+validation@"));
assert(installed, "Install the pinned workspace dependencies before validation.");
const schemaPath = join(root, "node_modules/.pnpm", installed, "node_modules/@mintlify/validation/dist/mint-config/schemas/v2/index.js");
const { docsConfigSchema } = await import(pathToFileURL(schemaPath));
const validated = docsConfigSchema.safeParse(config);
assert(validated.success, JSON.stringify(validated.error?.issues, null, 2));

const files = (await readdir(docs, { recursive: true }))
  .filter((file) => file.endsWith(".mdx") && !file.split(/[\\/]/).includes("node_modules"));
const pages = new Map(files.map((file) => [file.replaceAll("\\", "/").replace(/\.mdx$/, ""), file]));
const errors = [];
const navigation = [];
function walk(value) {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value.pages)) navigation.push(...value.pages.filter((page) => typeof page === "string"));
  Object.values(value).forEach(walk);
}
walk(config.navigation);
for (const slug of navigation) if (!pages.has(slug)) errors.push("Navigation has no page: " + slug);
for (const slug of pages.keys()) if (!navigation.includes(slug)) errors.push("Page is absent from navigation: " + slug);
if (new Set(navigation).size !== navigation.length) errors.push("Duplicate navigation page");

let links = 0;
for (const [slug, file] of pages) {
  const source = await readFile(join(docs, file), "utf8");
  if (!/^---\r?\ntitle: .+\r?\ndescription: .+\r?\n---\r?\n/.test(source)) errors.push("Missing metadata: " + slug);
  if (/https?:\/\/(?:app\.|docs\.)?lobbystack\.com/i.test(source)) errors.push("Obsolete product domain: " + slug);
  for (const match of source.matchAll(/(?:href=["']|\]\()(\/[^"'\s)]+)/g)) {
    const target = match[1].split("#")[0].split("?")[0].replace(/^\/+|\/+$/g, "");
    links++;
    if (!target || pages.has(target)) continue;
    const physical = resolve(docs, target);
    if (!physical.startsWith(docs + "/") && !physical.startsWith(docs + "\\")) {
      errors.push("Link escapes documentation: " + slug + " -> " + target);
      continue;
    }
    try { await stat(physical); } catch { errors.push("Missing target: " + slug + " -> " + target); }
  }
}
for (const target of [config.favicon, config.logo?.light, config.logo?.dark]) {
  if (!target) continue;
  try { await stat(join(docs, target.replace(/^\//, ""))); } catch { errors.push("Missing brand asset: " + target); }
}
const api = JSON.parse(await readFile(join(docs, "api-reference/openapi.json"), "utf8"));
if (api.servers?.[0]?.url !== "https://receptionist.caleonis.com/api/v1") errors.push("Unexpected API server");
const result = {
  status: errors.length ? "FAIL" : "PASS",
  configSchema: "installed Mintlify docsConfigSchema",
  mdxPages: pages.size,
  frenchPages: [...pages.keys()].filter((slug) => !slug.startsWith("en/")).length,
  englishPages: [...pages.keys()].filter((slug) => slug.startsWith("en/")).length,
  navigationEntries: navigation.length,
  internalContentLinks: links,
  errors,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
