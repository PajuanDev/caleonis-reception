import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { test } from "node:test";
import { startLocalSingleHostGateway, validateLoopbackNextOrigin } from "./p1-single-host-gateway.mjs";

const signature = body => createHmac("sha256", "fixture-local-only").update(body).digest("hex");
function send(origin, path, options = {}) {
  return new Promise((accept, reject) => {
    const request = http.request(origin, { method: options.method ?? "GET", path, headers: options.headers, agent: false }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => accept({ status: response.statusCode, headers: response.headers, rawHeaders: response.rawHeaders, body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.end(options.body);
  });
}

async function fixture(t) {
  const temporary = await mkdtemp(resolve(tmpdir(), "caleonis-p1-gateway-"));
  const marketingDir = resolve(temporary, "marketing");
  const helpDir = resolve(temporary, "help");
  for (const folder of ["fr/pricing", "api/status", "_astro", "login"]) await mkdir(resolve(marketingDir, folder), { recursive: true });
  for (const folder of ["en/quickstart", "images"]) await mkdir(resolve(helpDir, folder), { recursive: true });
  await Promise.all([
    writeFile(resolve(marketingDir, "index.html"), "<title>Caléonis marketing</title>"),
    writeFile(resolve(marketingDir, "fr/pricing/index.html"), "<title>Prix à valider</title>"),
    writeFile(resolve(marketingDir, "api/status/index.html"), "THIS MUST NEVER SHADOW NEXT API"),
    writeFile(resolve(marketingDir, "login/index.html"), "THIS MUST NEVER SHADOW NEXT AUTH"),
    writeFile(resolve(marketingDir, "_astro/app.css"), "body{color:blue}"),
    writeFile(resolve(helpDir, "index.html"), "<title>Aide FR</title>"),
    writeFile(resolve(helpDir, "en/quickstart/index.html"), "<title>Help EN</title>"),
    writeFile(resolve(helpDir, "images/screen.svg"), "<svg></svg>"),
  ]);
  const received = [];
  let releaseStream;
  const release = new Promise(accept => { releaseStream = accept; });
  let upstreamStreamEnded = false;
  const next = http.createServer((request, response) => {
    void (async () => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      received.push({ target: request.url, method: request.method, headers: request.headers, body });
      if (request.url.startsWith("/api/webhooks/twilio/status")) {
        const valid = request.headers["x-fixture-signature"] === signature(body);
        response.writeHead(valid ? 202 : 403, { "content-type": "application/json", "cache-control": "private, no-store" });
        response.end(JSON.stringify({ valid, hex: body.toString("hex"), target: request.url }));
      } else if (request.url.startsWith("/api/stream")) {
        response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "private, no-cache, no-store, no-transform", "x-accel-buffering": "no" });
        response.write("data: first\n\n");
        await release;
        upstreamStreamEnded = true;
        response.end("data: last\n\n");
      } else if (request.url.startsWith("/api/calendar/google/callback") || request.url.startsWith("/login")) {
        response.writeHead(307, { location: "/fr/login?returnTo=%2Fdashboard", "set-cookie": ["session=fixture; Path=/; HttpOnly; SameSite=Lax", "oauth_state=fixture; Path=/; HttpOnly; SameSite=Lax"], "cache-control": "private, no-store" });
        response.end("next-redirect");
      } else if (request.url === "/api/protected") {
        response.writeHead(401, { "content-type": "application/json", "cache-control": "private, no-store", "content-security-policy": "default-src 'none'" });
        response.end('{"error":"unauthorized"}');
      } else if (["/signup", "/dashboard", "/calls/example", "/settings/phone-number", "/fr/login", "/oauth/consent", "/.well-known/oauth-authorization-server", "/api/status", "/api/headers"].includes(request.url.split("?")[0])) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ next: true, target: request.url, method: request.method, headers: request.headers }));
      } else {
        response.writeHead(404, { "content-type": "application/json", "cache-control": "private, no-store" });
        response.end('{"error":"next-real-404"}');
      }
    })().catch(() => response.destroy());
  });
  await new Promise(accept => next.listen(0, "127.0.0.1", accept));
  const gateway = await startLocalSingleHostGateway({ nextOrigin: `http://127.0.0.1:${next.address().port}`, marketingDir, helpDir });
  t.after(async () => {
    releaseStream();
    await gateway.close();
    await new Promise(accept => { next.close(accept); next.closeAllConnections(); });
    // This exact directory was created above. Refuse cleanup if it ever resolves outside the temp root.
    const distance = relative(resolve(tmpdir()), resolve(temporary));
    assert.ok(distance.startsWith("caleonis-p1-gateway-") && !distance.startsWith(`..${sep}`) && !isAbsolute(distance));
    await rm(temporary, { recursive: true, force: true });
  });
  return { gateway, received, releaseStream, streamEnded: () => upstreamStreamEnded };
}

test("gateway accepts only literal loopback HTTP origins and no credentials/path", () => {
  for (const target of ["https://receptionist.caleonis.com", "http://example.com", "http://0.0.0.0:3000", "http://127.0.0.2:3000", "http://127.0.0.1:3000/api", "http://user:secret@localhost:3000", "https://localhost:3000", "http://localhost:3000?host=prod"]) assert.throws(() => validateLoopbackNextOrigin(target));
  for (const target of ["http://127.0.0.1:3000", "http://localhost:3000", "http://[::1]:3000"]) assert.ok(validateLoopbackNextOrigin(target));
});

test("serves built marketing, help, assets and HEAD while preserving unknown-route Next 404", { timeout: 10_000 }, async t => {
  const { gateway } = await fixture(t);
  for (const [path, expected] of [["/", "Caléonis marketing"], ["/fr/pricing?locale=fr", "Prix à valider"], ["/aide", "Aide FR"], ["/aide/en/quickstart/", "Help EN"], ["/_astro/app.css", "color:blue"], ["/aide/images/screen.svg", "<svg>"]]) {
    const result = await send(gateway.origin, path);
    assert.equal(result.status, 200); assert.ok(result.body.includes(expected));
    assert.equal(result.headers["x-robots-tag"], "noindex, nofollow");
  }
  const head = await send(gateway.origin, "/aide", { method: "HEAD" });
  assert.equal(head.status, 200); assert.equal(head.body, ""); assert.ok(Number(head.headers["content-length"]) > 0);
  for (const path of ["/missing", "/aide/missing", "/aide/images/missing.svg", "/api/unknown-provider-route"]) {
    const result = await send(gateway.origin, path);
    assert.equal(result.status, 404); assert.equal(result.body, '{"error":"next-real-404"}');
  }
  assert.equal((await send(gateway.origin, "/fr/pricing", { method: "POST", body: "ignored" })).status, 405);
});

test("preserves auth redirects, raw callback queries, multiple Set-Cookie headers and app routes", { timeout: 10_000 }, async t => {
  const { gateway, received } = await fixture(t);
  for (const target of ["/login?returnTo=%2Fsettings%3Ftab%3Dphone", "/api/calendar/google/callback?state=a%2Fb%2Bc&code=raw%3Dvalue"]) {
    const result = await send(gateway.origin, target);
    assert.equal(result.status, 307); assert.equal(result.headers.location, "/fr/login?returnTo=%2Fdashboard");
    assert.deepEqual(result.headers["set-cookie"], ["session=fixture; Path=/; HttpOnly; SameSite=Lax", "oauth_state=fixture; Path=/; HttpOnly; SameSite=Lax"]);
    assert.equal(result.rawHeaders.filter(header => header.toLowerCase() === "set-cookie").length, 2);
    assert.equal(received.at(-1).target, target);
  }
  for (const target of ["/signup", "/dashboard", "/calls/example", "/settings/phone-number", "/fr/login", "/oauth/consent", "/.well-known/oauth-authorization-server", "/api/status"]) {
    const result = await send(gateway.origin, target);
    assert.equal(result.status, 200); assert.equal(JSON.parse(result.body).next, true);
  }
  const unauthorized = await send(gateway.origin, "/api/protected");
  assert.equal(unauthorized.status, 401); assert.equal(unauthorized.headers["content-security-policy"], "default-src 'none'");
  assert.equal(unauthorized.body, '{"error":"unauthorized"}');
});

test("forwards signed POST octets and queries without body parsing, rewriting or acknowledgement", { timeout: 10_000 }, async t => {
  const { gateway, received } = await fixture(t);
  const body = Buffer.concat([Buffer.from(' { "message": "été", "spaces" : [1, 2] }\r\n'), Buffer.from([0, 255, 128])]);
  const target = "/api/webhooks/twilio/status?CallSid=fixture%2Braw&x=2&x=1";
  const result = await send(gateway.origin, target, { method: "POST", headers: { "content-type": "application/octet-stream", "content-length": body.length, "x-fixture-signature": signature(body) }, body });
  assert.equal(result.status, 202); assert.equal(JSON.parse(result.body).valid, true);
  assert.equal(JSON.parse(result.body).hex, body.toString("hex"));
  assert.equal(received.at(-1).target, target); assert.deepEqual(received.at(-1).body, body);
  const rejected = await send(gateway.origin, target, { method: "POST", headers: { "x-fixture-signature": "wrong" }, body });
  assert.equal(rejected.status, 403);
});

test("pins forwarded host/proto/client address and does not manufacture a trusted Origin", { timeout: 10_000 }, async t => {
  const { gateway, received } = await fixture(t);
  const result = await send(gateway.origin, "/api/headers", { headers: { "x-forwarded-host": "receptionist.caleonis.com", "x-forwarded-proto": "https", "x-forwarded-for": "198.51.100.1", forwarded: "host=prod", origin: "https://foreign.example" } });
  const actual = JSON.parse(result.body).headers;
  assert.equal(actual.host, new URL(gateway.origin).host); assert.equal(actual["x-forwarded-host"], new URL(gateway.origin).host);
  assert.equal(actual["x-forwarded-proto"], "http"); assert.equal(actual["x-forwarded-for"], "127.0.0.1");
  assert.equal(actual.forwarded, undefined); assert.equal(actual.origin, "https://foreign.example");
  const count = received.length;
  assert.equal((await send(gateway.origin, "/api/headers", { headers: { host: "receptionist.caleonis.com" } })).status, 421);
  assert.equal(received.length, count);
});

test("preserves non-GET API methods and does not add permissive CORS headers", { timeout: 10_000 }, async t => {
  const { gateway, received } = await fixture(t);
  for (const method of ["OPTIONS", "PUT", "PATCH", "DELETE"]) {
    const body = Buffer.from('{"fixture":true}');
    const result = await send(gateway.origin, "/api/headers?raw=%2Fkeep", { method, headers: { "content-length": body.length }, body });
    assert.equal(result.status, 200); assert.equal(JSON.parse(result.body).method, method);
    assert.equal(received.at(-1).target, "/api/headers?raw=%2Fkeep");
    assert.deepEqual(received.at(-1).body, body);
    assert.equal(result.headers["access-control-allow-origin"], undefined);
  }
  const streamedBody = Buffer.from("OPTIONS body streamed with chunk framing");
  const streamed = await send(gateway.origin, "/api/headers", { method: "OPTIONS", headers: { "transfer-encoding": "chunked" }, body: streamedBody });
  assert.equal(streamed.status, 200); assert.deepEqual(received.at(-1).body, streamedBody);
});

test("rejects raw and encoded traversal before reaching static files or Next", { timeout: 10_000 }, async t => {
  const { gateway, received } = await fixture(t);
  for (const target of ["/aide/../api/headers", "/aide/%2e%2e/api/headers", "/aide/%2fapi/headers", "/aide/%252e%252e/api", "/aide\\api", "/aide//images/screen.svg", "/aide/%00", "/aide/%invalid"]) assert.equal((await send(gateway.origin, target)).status, 400);
  assert.equal(received.length, 0);
});

test("streams the first SSE chunk before upstream completion, without buffering", { timeout: 10_000 }, async t => {
  const { gateway, releaseStream, streamEnded } = await fixture(t);
  const chunks = [];
  await new Promise((accept, reject) => {
    const request = http.get(`${gateway.origin}/api/stream`, response => {
      assert.equal(response.statusCode, 200); assert.equal(response.headers["content-type"], "text/event-stream");
      assert.equal(response.headers["cache-control"], "private, no-cache, no-store, no-transform");
      response.on("data", chunk => {
        chunks.push(chunk.toString("utf8"));
        if (chunks.length === 1) {
          try { assert.equal(streamEnded(), false); assert.ok(chunks[0].includes("data: first")); releaseStream(); }
          catch (error) { releaseStream(); reject(error); }
        }
      });
      response.on("end", accept); response.on("error", reject);
    });
    request.on("error", reject);
  });
  assert.equal(chunks.join(""), "data: first\n\ndata: last\n\n");
});

test("explicitly rejects WebSocket upgrades instead of claiming unsupported parity", { timeout: 10_000 }, async t => {
  const { gateway } = await fixture(t);
  const result = await send(gateway.origin, "/_next/webpack-hmr", { headers: { connection: "Upgrade", upgrade: "websocket" } });
  assert.equal(result.status, 501); assert.equal(gateway.websocketStatus, "PENDING_NOT_IMPLEMENTED");
});
