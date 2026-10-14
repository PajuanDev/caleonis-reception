import { chmod, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { assertDatabaseRole, createDatabaseClient } from "@lobbystack/db";
import { provisionPilotOwner, reissuePilotActivation, revokePilotActivation } from "@lobbystack/domain";
import { writePrivateFile } from "./lib/private-artifact.ts";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const schema = z.object({
  email: z.string().email(), name: z.string().trim().min(1).max(120), businessName: z.string().trim().min(2).max(120),
  timezone: z.string().refine(value => { try { new Intl.DateTimeFormat("fr", { timeZone: value }); return true; } catch { return false; } }),
  businessType: z.string().trim().min(1).max(64), locale: z.enum(["fr", "en"]),
});

async function main() {
  if (process.argv.includes("--help")) {
    console.log('Usage: pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/pilot-onboarding.ts --email owner@example.fr --name "Owner" --business-name "Company" [--timezone Europe/Paris] [--business-type other] [--locale fr] [--apply --contact-verified]');
    console.log('Reissue: add --reissue-user-id <UUID> [--locale fr] [--apply --contact-verified]. Revoke: --revoke-user-id <UUID> [--apply --contact-verified]. Do not pass account-creation details with these commands.');
    console.log("Preview by default. --contact-verified asserts that the recipient identity and private delivery channel were checked by the operator. No email is sent. Reissue/revoke work only for unactivated managed pilots and cannot reset active accounts.");
    return;
  }
  const reissueId = flag("--reissue-user-id");
  const revokeId = flag("--revoke-user-id");
  if (reissueId && revokeId) throw new Error("Choose either reissue or revoke.");
  const managementId = reissueId || revokeId;
  if (managementId && ["--email", "--name", "--business-name"].some(value => process.argv.includes(value))) throw new Error("Do not pass account-creation details to reissue/revoke.");
  if (managementId) z.string().uuid().parse(managementId);
  const locale = z.enum(["fr", "en"]).parse(flag("--locale") ?? "fr");
  const input = managementId ? null : schema.parse({ email: flag("--email"), name: flag("--name"), businessName: flag("--business-name"), timezone: flag("--timezone") ?? "Europe/Paris", businessType: flag("--business-type") ?? "other", locale });
  const action = revokeId ? "revoke" : reissueId ? "reissue" : "create";
  const apply = process.argv.includes("--apply");
  if (!apply) { console.log(JSON.stringify({ mode: "preview", action, ...(input ?? { userId: managementId }), role: "business_owner", platformRole: "operator", activationExpiresAfterHours: 48, emailDelivery: "manual", required: "--apply --contact-verified" }, null, 2)); return; }
  if (!process.argv.includes("--contact-verified")) throw new Error("Verify the recipient identity and private delivery channel, then pass --contact-verified.");
  const base = revokeId ? null : new URL(process.env.APP_BASE_URL ?? "");
  if (base && base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) throw new Error("APP_BASE_URL must use HTTPS.");
  const directory = resolve(process.cwd(), ".prospect-demos");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const auth = createDatabaseClient("lobbystack_auth");
  const app = createDatabaseClient("lobbystack_app");
  try {
    await Promise.all([assertDatabaseRole(auth, { NODE_ENV: "production" }), assertDatabaseRole(app, { NODE_ENV: "production" })]);
    if (revokeId) {
      console.log(JSON.stringify({ ...await revokePilotActivation({ db: app.db }, auth.db, revokeId), status: "activation_links_revoked", accountDeleted: false, credentialsChanged: false }, null, 2));
      return;
    }
    const result = reissueId ? await reissuePilotActivation({ db: app.db }, auth.db, reissueId) : { ...await provisionPilotOwner({ db: app.db }, auth.db, input!), email: input!.email, revokedCount: 0 };
    const email = result.email;
    const link = new URL(`/${locale}/accept-invite`, base!);
    link.hash = new URLSearchParams({ pilot: result.token }).toString();
    const secretFile = join(directory, `pilot-${result.userId}-${randomUUID()}.json`);
    await writePrivateFile(secretFile, `${JSON.stringify({ userId: result.userId, businessId: result.businessId, email, activationUrl: link.href, expiresAt: result.expiresAt }, null, 2)}\n`);
    // Link/token stay in the ignored private file, away from console/CI logs.
    console.log(JSON.stringify({ action, userId: result.userId, businessId: result.businessId, expiresAt: result.expiresAt, activationTokenHash: createHash("sha256").update(result.token).digest("hex"), ...(reissueId ? { revokedCount: result.revokedCount } : {}), secretFile, status: "awaiting_private_delivery_and_activation" }, null, 2));
  } finally { await Promise.all([auth.pool.end(), app.pool.end()]); }
}
void main().catch(error => { console.error(error instanceof z.ZodError ? "Invalid pilot details. Use --help." : error instanceof Error && ["23505", "23503"].includes(String((error as Error & { code?: string }).code)) ? "Account already exists or provisioning conflicts; no existing account was changed." : error instanceof Error ? error.message : "Pilot provisioning failed."); process.exitCode = 1; });
