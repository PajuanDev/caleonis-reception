import { createReadStream } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import http from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const loopbackNames = new Set(["127.0.0.1", "localhost", "[::1]"]);
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".avif": "image/avif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".otf": "font/otf", ".webmanifest": "application/manifest+json",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".mp4": "video/mp4",
};
const hopByHopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "proxy-connection", "te", "trailer", "transfer-encoding", "upgrade", "http2-settings"]);
const nextPrefixes = ["/api", "/_next", "/.well-known", "/oauth", "/embed", "/locales", "/brand", "/onboarding", "/calls", "/messages", "/contacts", "/appointments", "/agent", "/analytics", "/integrations", "/settings", "/affiliate", "/demos", "/setup-guide", "/dashboard"];
const authSections = new Set(["login", "signup", "forgot-password", "reset-password", "verify-email", "confirm-email-change", "accept-invite", "claim-demo", "demo", "essai"]);
const inNamespace = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);
const within = (directory, filename) => {
  const distance = relative(directory, filename);
  return distance !== ".." && !distance.startsWith(`..${sep}`) && !isAbsolute(distance);
};

export function validateLoopbackNextOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Next origin must be an HTTP loopback origin."); }
  if (url.protocol !== "http:" || !loopbackNames.has(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Next origin must be an HTTP loopback origin without path or credentials.");
  }
  return url;
}

function inspectTarget(target) {
  if (!target?.startsWith("/") || target.startsWith("//") || /[\\\u0000-\u0020\u007f#]/.test(target)) return null;
  const rawPath = target.split("?", 1)[0];
  if (rawPath.includes("//") || /%(?:2f|5c|25|00)/i.test(rawPath)) return null;
  try {
    const pathname = decodeURIComponent(rawPath);
    if (/[\\\u0000-\u001f\u007f]/.test(pathname) || pathname.split("/").some(part => part === "." || part === "..")) return null;
    return pathname;
  } catch { return null; }
}

function reservedForNext(pathname) {
  const unlocalized = pathname.replace(/^\/(?:en|fr|es|sr)(?=\/)/, "");
  return nextPrefixes.some(prefix => inNamespace(pathname, prefix)) || authSections.has(unlocalized.split("/")[1]) || pathname === "/embed.js" || pathname === "/favicon.ico";
}

async function inventoryStaticRoot(directory, mount = "") {
  const root = await realpath(resolve(directory));
  if (!(await stat(root)).isDirectory()) throw new Error("Static root must be a directory.");
  const routes = new Map();
  const visit = async current => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      // No symlinks, hidden source files, source maps or arbitrary repository file serving.
      if (entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
      const filename = resolve(current, entry.name);
      if (!within(root, filename)) throw new Error("Static file escapes its root.");
      if (entry.isDirectory()) { await visit(filename); continue; }
      const mime = mimeTypes[extname(entry.name).toLowerCase()];
      if (!entry.isFile() || !mime) continue;
      const local = relative(root, filename).split(sep).join("/");
      const publicPath = `${mount}/${local}`;
      const item = { filename, root, mime, status: entry.name === "404.html" ? 404 : 200 };
      routes.set(publicPath, item);
      if (local === "index.html") {
        routes.set(mount || "/", item);
        if (mount) routes.set(`${mount}/`, item);
      } else if (local.endsWith("/index.html")) {
        const pagePath = publicPath.slice(0, -"/index.html".length);
        routes.set(pagePath, item);
        routes.set(`${pagePath}/`, item);
      } else if (local.endsWith(".html")) routes.set(publicPath.slice(0, -5), item);
    }
  };
  await visit(root);
  return routes;
}

function filterHopByHop(headers) {
  const blocked = new Set(hopByHopHeaders);
  for (const token of String(headers.connection ?? "").split(",")) blocked.add(token.trim().toLowerCase());
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !blocked.has(name.toLowerCase())));
}

function controlledHost(header, port) {
  if (typeof header !== "string" || /[\s/@\\?#]/.test(header)) return null;
  try {
    const host = new URL(`http://${header}`);
    return loopbackNames.has(host.hostname) && Number(host.port || 80) === port ? host.host : null;
  } catch { return null; }
}

function reject(response, status, message) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
  response.end(message);
}

/** Local rehearsal only. The listener and every upstream connection are pinned to loopback. */
export async function startLocalSingleHostGateway({ nextOrigin, marketingDir, helpDir, port = 0, upstreamIdleTimeoutMs = 300_000 }) {
  const next = validateLoopbackNextOrigin(nextOrigin);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error("Invalid local port.");
  if (!Number.isFinite(upstreamIdleTimeoutMs) || upstreamIdleTimeoutMs <= 0) throw new Error("Invalid upstream idle timeout.");
  const staticRoutes = await inventoryStaticRoot(marketingDir);
  if (helpDir) for (const [path, item] of await inventoryStaticRoot(helpDir, "/aide")) staticRoutes.set(path, item);
  const outgoingRequests = new Set();
  let boundPort = 0;
  const server = http.createServer((request, response) => {
    void (async () => {
      const trustedHost = controlledHost(request.headers.host, boundPort);
      if (!trustedHost) { reject(response, 421, "Only the bound loopback host is accepted."); return; }
      const pathname = inspectTarget(request.url);
      if (pathname === null) { reject(response, 400, "Ambiguous or invalid request target."); return; }
      const item = reservedForNext(pathname) ? undefined : staticRoutes.get(pathname);
      if (item) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.setHeader("Allow", "GET, HEAD");
          reject(response, 405, "Static surfaces accept GET and HEAD only.");
          return;
        }
        // Recheck the real target before every read: a stale inventory cannot serve a replaced symlink.
        const actual = await realpath(item.filename);
        if (!within(item.root, actual) || actual !== item.filename) { reject(response, 404, "Static asset is unavailable."); return; }
        const file = await stat(actual);
        if (!file.isFile()) { reject(response, 404, "Static asset is unavailable."); return; }
        response.writeHead(item.status, { "content-type": item.mime, "content-length": file.size, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
        if (request.method === "HEAD") { response.end(); return; }
        const stream = createReadStream(actual);
        response.on("close", () => stream.destroy());
        stream.on("error", () => response.destroy());
        stream.pipe(response);
        return;
      }

      // Everything else goes unchanged to Next, including unknown /api paths and missing help assets.
      // No absolute URL resolution, body parsing, redirect following, retries or static fallback.
      const headers = filterHopByHop(request.headers);
      // Regenerate framing for streamed bodies on methods (OPTIONS/DELETE/GET) where
      // Node does not otherwise enable chunking by default. Payload octets are unchanged.
      if (request.headers["transfer-encoding"] !== undefined && headers["content-length"] === undefined) headers["transfer-encoding"] = "chunked";
      delete headers.forwarded;
      for (const name of Object.keys(headers)) if (name.startsWith("x-forwarded-")) delete headers[name];
      Object.assign(headers, { host: trustedHost, "x-forwarded-host": trustedHost, "x-forwarded-proto": "http", "x-forwarded-for": request.socket.remoteAddress });
      const upstream = http.request({
        hostname: next.hostname === "localhost" ? "127.0.0.1" : next.hostname.replace(/^\[|\]$/g, ""),
        port: Number(next.port || 80), method: request.method, path: request.url, headers, agent: false,
      }, upstreamResponse => {
        const responseHeaders = filterHopByHop(upstreamResponse.headers);
        responseHeaders["x-robots-tag"] = "noindex, nofollow";
        // Node retains Set-Cookie as an array. No concatenation or cookie-domain rewrite.
        response.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
        response.flushHeaders();
        upstreamResponse.on("error", () => response.destroy());
        upstreamResponse.pipe(response);
      });
      outgoingRequests.add(upstream);
      upstream.once("close", () => outgoingRequests.delete(upstream));
      upstream.setTimeout(upstreamIdleTimeoutMs, () => upstream.destroy(new Error("Local upstream idle timeout.")));
      upstream.on("error", () => {
        if (response.destroyed) return;
        if (!response.headersSent) reject(response, 502, "Local Next upstream is unavailable.");
        else response.destroy();
      });
      request.on("aborted", () => upstream.destroy());
      request.on("error", () => upstream.destroy());
      response.on("close", () => { if (!response.writableEnded) upstream.destroy(); });
      request.pipe(upstream);
    })().catch(() => {
      if (!response.headersSent) reject(response, 404, "Static resource is unavailable.");
      else response.destroy();
    });
  });
  // Upgrades are explicitly unsupported; never acknowledge them as HTML or claim WS parity.
  server.on("upgrade", (_request, socket) => socket.end("HTTP/1.1 501 Not Implemented\r\nConnection: close\r\nX-Robots-Tag: noindex, nofollow\r\nContent-Length: 0\r\n\r\n"));
  server.requestTimeout = 300_000;
  await new Promise((accept, rejectListen) => { server.once("error", rejectListen); server.listen(port, "127.0.0.1", accept); });
  boundPort = server.address().port;
  return {
    origin: `http://127.0.0.1:${boundPort}`,
    staticRouteCount: staticRoutes.size,
    websocketStatus: "PENDING_NOT_IMPLEMENTED",
    close: async () => {
      for (const request of outgoingRequests) request.destroy();
      await new Promise((accept, rejectClose) => {
        server.close(error => error ? rejectClose(error) : accept());
        server.closeAllConnections();
      });
    },
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const flag = process.argv[index];
    if (!["--next-origin", "--marketing-dir", "--help-dir", "--port"].includes(flag) || !process.argv[index + 1]) throw new Error("Usage: --next-origin http://127.0.0.1:3000 --marketing-dir apps/landing/dist [--help-dir folder] [--port 4380]");
    options[flag] = process.argv[index + 1];
  }
  const gateway = await startLocalSingleHostGateway({ nextOrigin: options["--next-origin"] ?? "http://127.0.0.1:3000", marketingDir: options["--marketing-dir"] ?? "apps/landing/dist", ...(options["--help-dir"] ? { helpDir: options["--help-dir"] } : {}), port: Number(options["--port"] ?? 4380) });
  console.log(JSON.stringify({ status: "LOCAL_ONLY", ...gateway, close: undefined }));
  process.once("SIGINT", () => { void gateway.close(); });
  process.once("SIGTERM", () => { void gateway.close(); });
}
