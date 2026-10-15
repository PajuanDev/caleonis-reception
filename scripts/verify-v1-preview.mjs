import { readFile, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? join(root, "apps/landing/dist"));
const landingRequire = createRequire(join(root, "apps/landing/package.json"));
const { parse } = await import(pathToFileURL(landingRequire.resolve("parse5")));
const origin = process.env.PREVIEW_ORIGIN ?? "https://caleonis-receptionist-v1-review.willgosse225.chatgpt.site";
const files = (await readdir(output, { recursive: true })).filter((file) => extname(file) === ".html");
const failures = [];
let references = 0;
const checked = new Map();
async function targetExists(pathname) {
  if (checked.has(pathname)) return checked.get(pathname);
  const decoded = decodeURIComponent(pathname);
  const target = resolve(output, `.${decoded}`);
  if (!target.startsWith(output)) return false;
  const exists = await Promise.any([target, join(target, "index.html"), `${target}.html`].map(async (file) => {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    return true;
  })).catch(() => false);
  checked.set(pathname, exists);
  return exists;
}
for (const file of files) {
  const source = await readFile(join(output, file), "utf8");
  const pagePath = `/${file.replace(/\\/g, "/").replace(/index\.html$/, "")}`;
  const document = parse(source);
  const nodes = [];
  const visit = (node) => { nodes.push(node); for (const child of node.childNodes ?? []) visit(child); };
  visit(document);
  const attr = (node, name) => node.attrs?.find((entry) => entry.name === name)?.value;
  if (!nodes.some((node) => node.tagName === "html" && attr(node, "lang"))) failures.push(`${pagePath}: missing document language`);
  if (!nodes.some((node) => node.tagName === "meta" && attr(node, "name") === "viewport")) failures.push(`${pagePath}: missing viewport`);
  if (!nodes.some((node) => node.tagName === "title" && node.childNodes?.some((child) => child.value?.trim()))) failures.push(`${pagePath}: missing title`);
  for (const node of nodes) {
    if (node.tagName === "img" && attr(node, "alt") === undefined) failures.push(`${pagePath}: image without alternative text`);
    for (const name of ["href", "src"]) {
      const value = attr(node, name);
      if (!value || /^(?:#|data:|mailto:|tel:|javascript:)/i.test(value)) continue;
      const link = new URL(value, `${origin}${pagePath}`);
      if (link.origin !== origin) continue;
      references += 1;
      if (!await targetExists(link.pathname)) failures.push(`${pagePath}: missing ${name} target ${link.pathname}`);
    }
  }
}
const report = { pages: files.length, internalReferences: references, uniqueTargets: checked.size, failures: [...new Set(failures)] };
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
