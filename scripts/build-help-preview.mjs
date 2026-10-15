import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Static, provider-free review export. Mintlify remains the canonical help source.
// Resolve the compiler already pinned in the workspace lockfile; install nothing.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(process.argv[2] ?? join(root, ".tmp/v1-preview/aide"));
const docs = join(root, "mintlify");
const packages = await readdir(join(root, "node_modules/.pnpm"));
const compiler = packages.find((entry) => /^@mdx-js\+mdx@3\.1\.1$/.test(entry));
if (!compiler) throw new Error("Run pnpm install --frozen-lockfile before exporting the help center.");
const { evaluate } = await import(pathToFileURL(join(root, "node_modules/.pnpm", compiler, "node_modules/@mdx-js/mdx/index.js")));
const { default: remarkGfm } = await import(pathToFileURL(join(root, "node_modules/.pnpm/remark-gfm@4.0.1/node_modules/remark-gfm/index.js")));
const adminRequire = createRequire(join(root, "apps/admin/package.json"));
const React = adminRequire("react");
const runtime = adminRequire("react/jsx-runtime");
const { renderToStaticMarkup } = adminRequire("react-dom/server");
const h = React.createElement;
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const config = JSON.parse(await readFile(join(docs, "docs.json"), "utf8"));
const files = (await readdir(docs, { recursive: true })).filter((entry) => entry.endsWith(".mdx")).sort();
const pages = await Promise.all(files.map(async (file) => {
  const source = await readFile(join(docs, file), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const title = match?.[1].match(/^title:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? file.replace(/\.mdx$/, "");
  return { file, slug: file.replace(/\\/g, "/").replace(/\.mdx$/, ""), title, source: source.slice(match?.[0].length ?? 0) };
}));
const slugs = new Set(pages.map((page) => page.slug));
const hrefFor = (slug) => `/aide/${slug}/`;
const rewriteHref = (href) => {
  if (!href || /^(?:[a-z]+:|#|\/\/)/i.test(href)) return href;
  const [path, hash] = href.split("#");
  const slug = path.replace(/^\//, "").replace(/\.(mdx?|html)$/, "").replace(/\/$/, "");
  return slugs.has(slug) ? hrefFor(slug) + (hash ? `#${hash}` : "") : href;
};
const section = (props) => h("section", null, props.title && h("h2", null, props.title), props.children);
const components = {
  a: ({ href, children, ...props }) => h("a", { ...props, href: rewriteHref(href) }, children),
  img: ({ src, alt, ...props }) => h("img", { ...props, alt: alt ?? "", src: src?.startsWith("/") ? `/aide${src}` : src, loading: "lazy" }),
  Card: ({ title, href, children }) => h("section", { className: "card" }, h("h2", null, href ? h("a", { href: rewriteHref(href) }, title) : title), children),
  CardGroup: ({ children }) => h("div", { className: "cards" }, children),
  Steps: ({ children }) => h("ol", { className: "steps" }, children),
  Step: ({ title, children }) => h("li", null, h("h2", null, title), children),
  AccordionGroup: ({ children }) => h("div", null, children),
  Accordion: ({ title, children }) => h("details", null, h("summary", null, title), children),
  Tabs: ({ children }) => h("div", null, children), Tab: section,
  Frame: ({ children }) => h("figure", null, children),
  CodeGroup: ({ children }) => h("div", null, children),
};
for (const name of ["Note", "Warning", "Tip", "Info", "Check"]) components[name] = ({ children }) => h("aside", { className: "note", role: "note" }, children);
for (const name of ["ResponseField", "ParamField", "Expandable"]) components[name] = section;

const groups = [];
function collect(entry) {
  if (!entry || typeof entry !== "object") return;
  if (entry.group && Array.isArray(entry.pages)) groups.push(entry);
  for (const value of Object.values(entry)) if (Array.isArray(value)) value.forEach(collect); else if (value && typeof value === "object") collect(value);
}
collect(config.navigation);
const nav = groups.length ? groups.map((group) => `<h2>${escape(group.group)}</h2>${group.pages.filter((page) => typeof page === "string" && slugs.has(page)).map((slug) => `<a href="${hrefFor(slug)}">${escape(pages.find((page) => page.slug === slug).title)}</a>`).join("")}`).join("") : pages.map((page) => `<a href="${hrefFor(page.slug)}">${escape(page.title)}</a>`).join("");
const css = `nav a[hidden]{display:none}*{box-sizing:border-box}body{margin:0;font:16px/1.65 system-ui,sans-serif;color:#171717;background:#fff}a{color:inherit;text-underline-offset:3px}a:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #2563eb;outline-offset:3px}.skip{position:absolute;top:-80px}.skip:focus{top:8px;background:white;padding:12px;z-index:9}header{padding:20px 32px;border-bottom:1px solid #e5e5e5;display:flex;gap:24px;align-items:center;flex-wrap:wrap}header strong{font-size:18px}header a:last-child{margin-left:auto}.layout{max-width:1400px;margin:auto;display:grid;grid-template-columns:280px 1fr;min-height:85vh}nav{padding:24px;border-right:1px solid #e5e5e5}nav h2{font-size:14px;margin:24px 0 8px}nav a{display:block;padding:6px 0;font-size:14px;text-decoration:none}nav a:hover{text-decoration:underline}input{padding:12px;width:100%;border:1px solid #bbb;border-radius:8px}main{padding:40px 56px;max-width:960px;min-width:0}h1{font-size:36px;line-height:1.2;letter-spacing:-.03em}h2{font-size:23px;line-height:1.3;margin-top:36px}h3{font-size:18px}pre{background:#f5f5f5;padding:20px;overflow:auto;border-radius:12px}code{font-size:14px;overflow-wrap:anywhere}table{display:block;overflow:auto;border-collapse:collapse}td,th{border:1px solid #ddd;padding:12px;text-align:left}img{max-width:100%;height:auto}.note,.card{border:1px solid #ddd;border-radius:12px;padding:20px;margin:20px 0;background:#fafafa}.card h2{margin-top:0;font-size:20px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}summary{cursor:pointer;font-weight:600;padding:12px 0}footer{border-top:1px solid #ddd;padding:24px 32px;font-size:13px;color:#525252}.review{font-size:13px;color:#525252} @media(max-width:760px){header{padding:16px;gap:16px}.layout{display:block}nav{border-right:0;border-bottom:1px solid #ddd;max-height:280px;overflow:auto}main{padding:28px 20px}h1{font-size:30px}}`;
const wrap = (title, body, language = "fr") => `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)} — Aide Caléonis Receptionist</title><style>${css}</style></head><body><a class="skip" href="#contenu">Aller au contenu</a><header><strong><a href="/aide/">Caléonis Receptionist · Aide</a></strong><a href="/fr/">Découvrir le produit</a><a href="https://receptionist.caleonis.com/fr/login">Ouvrir l'application</a></header><div class="layout"><nav aria-label="Guides d'aide"><label for="recherche">Rechercher un guide</label><input id="recherche" type="search" placeholder="Messages, Google, numéro…">${nav}</nav><main id="contenu" tabindex="-1"><p class="review">Prévisualisation privée · les statuts et limites du pilote priment sur les capacités présentes dans le code.</p><h1>${escape(title)}</h1>${body}</main></div><footer>Caléonis Receptionist, marque de service de William Fabrice Gosse, EI sous nom commercial MrManiac. Base logicielle MIT, copyright LobbyStack contributors. <a href="/aide/attributions/">Attributions</a> · <a href="/LICENSE.txt">Licence MIT</a></footer><script>document.querySelector('#recherche').addEventListener('input',function(){const q=this.value.toLocaleLowerCase('fr');document.querySelectorAll('nav a').forEach(a=>a.hidden=!a.textContent.toLocaleLowerCase('fr').includes(q))})</script></body></html>`;
await mkdir(destination, { recursive: true });
await cp(join(root, "LICENSE"), join(dirname(destination), "LICENSE.txt"));
for (const page of pages) {
  const { default: Content } = await evaluate(page.source, { ...runtime, remarkPlugins: [remarkGfm], baseUrl: pathToFileURL(join(docs, page.file)) });
  const html = wrap(page.title, renderToStaticMarkup(h(Content, { components })), page.slug.startsWith("en/") ? "en" : "fr");
  const target = join(destination, page.slug, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  if (page.slug === "introduction") await writeFile(join(destination, "index.html"), html);
}
const referencedImages = new Set(pages.flatMap(({ source }) => [...source.matchAll(/(?:src=["']|\]\()(\/images\/[^"'\s)]+)/g)].map((match) => match[1].slice(1))));
for (const asset of [...referencedImages, "logo.svg", "logo-dark.svg", "favicon.svg"]) {
  await mkdir(dirname(join(destination, asset)), { recursive: true });
  await cp(join(docs, asset), join(destination, asset), { recursive: true }).catch((error) => { if (error.code !== "ENOENT") throw error; });
}
await writeFile(join(destination, "export-manifest.json"), JSON.stringify({ source: "mintlify", pages: pages.map(({ slug, title }) => ({ slug, title })), destination: relative(root, destination), previewOnly: true }, null, 2));
console.log(`Help review export: ${pages.length} guides at ${destination}`);

