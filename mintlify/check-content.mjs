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
let images = 0;
for (const [slug, file] of pages) {
  const source = await readFile(join(docs, file), "utf8");
  const metadata = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!metadata || !/^title:\s*\S.+$/m.test(metadata[1]) || !/^description:\s*\S.+$/m.test(metadata[1])) errors.push("Missing metadata: " + slug);
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
  for (const match of source.matchAll(/src=["'](\/images\/[^"']+)/g)) {
    images++;
    try { await stat(join(docs, match[1])); } catch { errors.push("Missing image: " + slug + " -> " + match[1]); }
  }
  const mirror = slug.startsWith("en/") ? slug.slice(3) : "en/" + slug;
  if (slug !== "en/overview" && !pages.has(mirror)) errors.push("Missing complete locale counterpart: " + slug);
}
for (const target of [config.favicon, config.logo?.light, config.logo?.dark]) {
  if (!target) continue;
  try { await stat(join(docs, target.replace(/^\//, ""))); } catch { errors.push("Missing brand asset: " + target); }
}
const api = JSON.parse(await readFile(join(docs, "api-reference/openapi.json"), "utf8"));
if (api.servers?.[0]?.url !== "https://receptionist.caleonis.com/api/v1") errors.push("Unexpected API server");
let publicRoutes = 0;
try {
  const inventory = JSON.parse(await readFile(join(root, "docs/p1/public-source-inventory.json"), "utf8"));
  for (const page of inventory.pages.filter((page) => page.url.startsWith("https://docs.lobbystack.com/"))) {
    const path = new URL(page.url).pathname.replace(/^\/+|\/+$/g, "");
    const slug = path.startsWith("fr/") ? path.slice(3) : "en/" + path;
    publicRoutes++;
    if (!pages.has(slug)) errors.push("Missing publicly advertised source route: " + page.url + " -> " + slug);
  }
} catch (error) { if (error.code !== "ENOENT") throw error; }
const apiOperations = Object.values(api.paths).flatMap((methods) => Object.values(methods));
const referenceSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const operation of apiOperations) {
  const slug = "api-reference/" + referenceSlug(operation.tags[0]) + "/" + referenceSlug(operation.summary);
  for (const prefix of ["", "en/"]) {
    if (!pages.has(prefix + slug)) { errors.push("Missing API operation reference: " + prefix + slug); continue; }
    const source = await readFile(join(docs, pages.get(prefix + slug)), "utf8");
    const blocks = [...source.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)];
    const contract = blocks.map((block) => JSON.parse(block[1])).find((value) => value.operation?.operationId === operation.operationId);
    if (!contract) { errors.push("Missing full API contract: " + prefix + slug); continue; }
    if (JSON.stringify(contract.operation) !== JSON.stringify(operation)) errors.push("API contract drift: " + prefix + slug);
    for (const match of JSON.stringify(contract).matchAll(/#\/components\/schemas\/([^"\\]+)/g)) {
      if (!contract.components?.schemas?.[match[1]]) errors.push("Unresolved API schema: " + prefix + slug + " -> " + match[1]);
    }
  }
}
const result = {
  status: errors.length ? "FAIL" : "PASS",
  configSchema: "installed Mintlify docsConfigSchema",
  mdxPages: pages.size,
  frenchPages: [...pages.keys()].filter((slug) => !slug.startsWith("en/")).length,
  englishPages: [...pages.keys()].filter((slug) => slug.startsWith("en/")).length,
  navigationEntries: navigation.length,
  internalContentLinks: links,
  imageReferences: images,
  publicSourceRoutes: publicRoutes,
  apiOperationsPerLocale: apiOperations.length,
  errors,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
