import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export function validateAuthRehearsal(env) {
  if (env.CI !== "1" || env.LOBBYSTACK_SKIP_ENV_FILES !== "true" || env.E2E_SINGLE_HOST_GATEWAY_REHEARSAL !== "loopback-disposable") {
    throw new Error("Use the disposable e2e-local.sh stack, never a deployed environment.");
  }
  if (env.P1_SINGLE_HOST_STAGING !== "true" || env.RAILWAY_ENVIRONMENT_NAME !== "certification") {
    throw new Error("The second build must explicitly enable certification-only routing.");
  }
  function origin(value) {
    const url = new URL(value);
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname) || !url.port || Number(url.port) < 1024 || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("Only an explicit unprivileged HTTP loopback origin is allowed.");
    }
    return url;
  }
  const publicOrigin = origin(env.PLAYWRIGHT_BASE_URL);
  const internalPort = Number(env.E2E_SINGLE_HOST_NEXT_PORT ?? Number(publicOrigin.port) + 1);
  if (!Number.isInteger(internalPort) || internalPort < 1024 || internalPort > 65535 || internalPort === Number(publicOrigin.port)) throw new Error("Invalid isolated Next port.");
  const database = new URL(env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) throw new Error("The test database must be loopback-only.");
  for (const [name, value] of Object.entries(env)) {
    if (/^(?:OPENAI_|TWILIO_|POLAR_|RESEND_|GOOGLE_|FIRECRAWL_|POSTHOG_|NEXT_PUBLIC_POSTHOG_|AI_CHAT_API_KEY$|AI_EMBEDDING_API_KEY$)/.test(name) && value) {
      // Never include the value in an error or an artifact.
      throw new Error(`Remove live provider setting ${name} from this isolated rehearsal.`);
    }
    if (/DATABASE_URL$/.test(name) && value && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname)) throw new Error("A non-loopback database setting is present.");
  }
  return { publicOrigin: publicOrigin.origin, nextOrigin: `http://127.0.0.1:${internalPort}`, port: Number(publicOrigin.port) };
}

async function main() {
  const config = validateAuthRehearsal(process.env);
  if (process.argv.includes("--check")) { console.log("Isolated single-host auth preflight PASS"); return; }
  const temporary = await mkdtemp(join(tmpdir(), "p1-auth-gateway-"));
  let gateway;
  let stopping = false;
  async function close() {
    if (stopping) return;
    stopping = true;
    await gateway?.close();
    if (dirname(temporary) !== resolve(tmpdir())) throw new Error("Unsafe temporary cleanup target.");
    await rm(temporary, { recursive: true, force: true });
  }
  try {
    const marketing = join(temporary, "marketing");
    await cp(join(root, "apps/landing/dist"), marketing, { recursive: true });
    let rebased = 0;
    for (const file of await readdir(marketing, { recursive: true })) {
      if (!/\.(?:html|m?js|json)$/.test(file)) continue;
      const path = join(marketing, file);
      const content = await readFile(path, "utf8");
      if (!content.includes("https://receptionist.caleonis.com")) continue;
      await writeFile(path, content.replaceAll("https://receptionist.caleonis.com", config.publicOrigin));
      rebased++;
    }
    if (rebased === 0) throw new Error("Expected the actual marketing/help build, not empty mock pages.");
    const { startLocalSingleHostGateway } = await import("./p1-single-host-gateway.mjs");
    gateway = await startLocalSingleHostGateway({ nextOrigin: config.nextOrigin, marketingDir: marketing, port: config.port });
    console.log(JSON.stringify({ event: "AUTH_GATEWAY_LOOPBACK_READY", publicOrigin: config.publicOrigin, rebased, productionChanged: false }));
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void close().then(() => process.exit(0), () => process.exit(1)); });
  } catch (error) {
    await close();
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
