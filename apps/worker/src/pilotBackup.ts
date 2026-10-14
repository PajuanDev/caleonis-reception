import { createPublicKey, randomUUID } from "node:crypto";
import { capturePostgresBackup, withPilotBackupLock, type BackupDatabaseSnapshot } from "@lobbystack/db";
import { backupDigest, encryptBackup } from "@lobbystack/providers/storage/backupEncryption";
import { S3StorageProvider } from "@lobbystack/providers/storage/s3";
import type { BackupHealthState } from "./backupHealth";
import { ensureBackupBlob, pruneUnreferencedBackupBlobs, type BackupBlobReference } from "./pilotBackupBlobs";
import { createBackupBudget } from "./pilotBackupBudget";

export const BACKUP_PREFIX = "_recovery/pilot-v1/";
const MIB = 1024 * 1024;
export const BACKUP_RETRY_INTERVAL_MS = 6 * 60 * 60_000;
export type BackupStore = Pick<S3StorageProvider, "listObjectKeys" | "headObject" | "getObject" | "putObject" | "deleteObject">;
export type PilotBackupConfig = { databaseUrl: string; publicKey: string; maxSnapshotBytes: number; maxStoredBytes: number; pruneApproved: boolean; pgDumpPath?: string };
type Receipt = { format: "caleonis-pilot-backup-v1" | "caleonis-pilot-backup-v2"; generation: string; completedAt: string; startedAt: string; bytes: number; objects: number; pendingObjects: number; recoveryKeyFingerprint: string; blobs?: BackupBlobReference[]; storedBytes?: number; uploadedBytes?: number };
type BackupAttempt = { format: "caleonis-pilot-attempt-v1"; attemptedAt: string; slot: number; key: string; outcome: "started" | "succeeded" | "failed" };
const LAST_ATTEMPT_KEY = `${BACKUP_PREFIX}control/last-attempt.json`;

async function readBackupAttempt(store: BackupStore, now: number): Promise<BackupAttempt | undefined> {
  if (await store.headObject({ key: LAST_ATTEMPT_KEY })) {
    const last = JSON.parse(Buffer.from(await store.getObject({ key: LAST_ATTEMPT_KEY })).toString("utf8")) as BackupAttempt;
    const attemptedAt = Date.parse(last.attemptedAt);
    if (last.format !== "caleonis-pilot-attempt-v1" || !Number.isFinite(attemptedAt) || attemptedAt > now + 60_000) throw new Error("BACKUP_INVALID_ATTEMPT_METADATA");
    return last;
  }
  return undefined;
}

/** Invoke under the backup session lock before expensive work. */
export async function reservePilotBackupAttempt(store: BackupStore, now = Date.now(), maxStoredBytes = 512 * MIB): Promise<BackupAttempt | undefined> {
  const last = await readBackupAttempt(store, now);
  if (last && now - Date.parse(last.attemptedAt) < BACKUP_RETRY_INTERVAL_MS) return undefined;
  const slot = Math.floor(now / BACKUP_RETRY_INTERVAL_MS);
  const key = `${BACKUP_PREFIX}control/attempt-${slot}.json`;
  const attempt: BackupAttempt = { format: "caleonis-pilot-attempt-v1", attemptedAt: new Date(now).toISOString(), slot, key, outcome: "started" };
  const budget = await createBackupBudget(store, BACKUP_PREFIX, maxStoredBytes);
  try {
    await budget.write(key, Buffer.from(JSON.stringify(attempt)), "application/json", true);
  } catch (error) {
    if (error instanceof Error && error.name === "PreconditionFailed") return undefined;
    if (error instanceof Error && error.message === "BACKUP_STORAGE_BUDGET_REACHED") throw error;
    throw new Error("BACKUP_ATTEMPT_RESERVATION_FAILED");
  }
  await budget.write(LAST_ATTEMPT_KEY, Buffer.from(JSON.stringify(attempt)), "application/json");
  return attempt;
}

export function readPilotBackupConfig(env: NodeJS.ProcessEnv): PilotBackupConfig | undefined {
  if (env.BACKUP_ENABLED !== "true") return undefined;
  const databaseUrl = env.BACKUP_DATABASE_URL;
  const publicKey = env.BACKUP_RECOVERY_PUBLIC_KEY?.replace(/\\n/g, "\n");
  if (!databaseUrl || !publicKey || env.STORAGE_PROVIDER !== "s3") throw new Error("BACKUP_CONFIGURATION_MISSING");
  if (!/^\s*-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\s*$/.test(publicKey) || publicKey.includes("PRIVATE KEY")) throw new Error("BACKUP_PUBLIC_KEY_ONLY_REQUIRED");
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 3072) throw new Error("BACKUP_REQUIRES_RSA_3072_PUBLIC_KEY");
  const maxSnapshotBytes = Number(env.BACKUP_MAX_SNAPSHOT_BYTES ?? 256 * MIB);
  const maxStoredBytes = Number(env.BACKUP_MAX_STORED_BYTES ?? 512 * MIB);
  if (!Number.isSafeInteger(maxSnapshotBytes) || maxSnapshotBytes <= 0 || maxSnapshotBytes > 1024 * MIB || !Number.isSafeInteger(maxStoredBytes) || maxStoredBytes <= 0 || maxStoredBytes > 512 * MIB) throw new Error("BACKUP_INVALID_SIZE_BUDGET");
  return { databaseUrl, publicKey, maxSnapshotBytes, maxStoredBytes, pruneApproved: env.BACKUP_RETENTION_DELETE_APPROVED === "true", ...(env.BACKUP_PG_DUMP_PATH ? { pgDumpPath: env.BACKUP_PG_DUMP_PATH } : {}) };
}

function generationFromKey(key: string): string | undefined {
  const value = key.slice(BACKUP_PREFIX.length).split("/")[0];
  return key.startsWith(BACKUP_PREFIX) && value && /^\d{8}T\d{6}Z-[0-9a-f-]{36}$/.test(value) ? value : undefined;
}

export function backupRetentionCandidates(keys: string[], now: Date): string[] {
  const complete = keys.filter((key) => key.endsWith("/receipt.json")).map(generationFromKey).filter((value): value is string => !!value).sort().reverse();
  const protectedGenerations = new Set(complete.slice(0, 7));
  return keys.filter((key) => {
    const generation = generationFromKey(key);
    if (!generation || protectedGenerations.has(generation)) return false;
    const stamp = generation.slice(0, 16);
    const createdAt = Date.parse(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`);
    return Number.isFinite(createdAt) && createdAt < now.getTime() - 7 * 24 * 60 * 60_000;
  });
}

export async function runPilotBackup(config: PilotBackupConfig, source: BackupStore, target: BackupStore, capture: () => Promise<BackupDatabaseSnapshot> = () => capturePostgresBackup(config.databaseUrl, { ...(config.pgDumpPath ? { pgDumpPath: config.pgDumpPath } : {}), maxBytes: Math.min(config.maxSnapshotBytes, 64 * MIB) })): Promise<Receipt> {
  let keys = await target.listObjectKeys(BACKUP_PREFIX);
  if (keys.length > 10_000) throw new Error("BACKUP_INVENTORY_LIMIT");
  const candidates = backupRetentionCandidates(keys, new Date());
  // This only deletes generations created by this module, and never the seven
  // latest complete copies. Activation is separately approved by the operator.
  if (config.pruneApproved) for (const key of candidates) await target.deleteObject({ key });
  const budget = await createBackupBudget(target, BACKUP_PREFIX, config.maxStoredBytes);
  const write = budget.write;
  keys = await target.listObjectKeys(BACKUP_PREFIX);
  await pruneUnreferencedBackupBlobs({ store: target, prefix: BACKUP_PREFIX, retainedReceiptKeys: keys.filter((key) => key.endsWith("/receipt.json") && !!generationFromKey(key)), keys, approved: config.pruneApproved, write });
  await budget.refresh();
  if (budget.bytes() > config.maxStoredBytes) throw new Error("BACKUP_STORAGE_BUDGET_REACHED");
  const snapshot = await capture();
  const estimatedPlaintext = snapshot.dump.byteLength + snapshot.objects.reduce((total, object) => total + object.size, 0);
  if (snapshot.objects.length > 1000 || snapshot.dump.length > 64 * MIB || snapshot.objects.some((object) => !Number.isSafeInteger(object.size) || object.size < 0 || object.size > 64 * MIB) || estimatedPlaintext > config.maxSnapshotBytes) throw new Error("BACKUP_SNAPSHOT_SIZE_LIMIT");
  const generation = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z-${randomUUID()}`;
  const prefix = `${BACKUP_PREFIX}${generation}/`;
  const files: Array<{ sourceKey: string; backupKey: string; size: number; sha256: string; encryptedSha256: string; contentType: string; compression: "none" | "gzip" }> = [];
  const fingerprint = backupDigest(Buffer.from(createPublicKey(config.publicKey).export({ type: "spki", format: "pem" }).toString()));
  const blobs = new Map<string, BackupBlobReference>();
  const upload = async (sourceKey: string, backupName: string, plaintext: Buffer, contentType: string) => {
    const backupKey = `${prefix}${backupName}.enc`;
    const encrypted = encryptBackup(plaintext, config.publicKey);
    const encryptedSha256 = backupDigest(encrypted);
    await write(backupKey, encrypted, "application/octet-stream", true);
    files.push({ sourceKey, backupKey, size: plaintext.length, sha256: backupDigest(plaintext), encryptedSha256, contentType, compression: "none" });
  };
  await upload("postgres.dump", "postgres.dump", snapshot.dump, "application/octet-stream");
  for (const object of snapshot.objects) {
    const before = await source.headObject({ key: object.key });
    if (!before || before.length !== object.size) throw new Error("BACKUP_SOURCE_OBJECT_MISSING_OR_CHANGED");
    const plaintext = Buffer.from(await source.getObject({ key: object.key }));
    if (plaintext.length !== object.size) throw new Error("BACKUP_SOURCE_OBJECT_SIZE_MISMATCH");
    const digest = backupDigest(plaintext);
    if (object.checksum && object.checksum !== digest && object.checksum !== Buffer.from(digest, "hex").toString("base64")) throw new Error("BACKUP_SOURCE_OBJECT_CHECKSUM_MISMATCH");
    const blob = await ensureBackupBlob({ plaintext, publicKey: config.publicKey, fingerprint, prefix: BACKUP_PREFIX, store: target, write });
    blobs.set(blob.key, blob);
    files.push({ sourceKey: object.key, backupKey: blob.key, size: plaintext.length, sha256: digest, encryptedSha256: blob.encryptedSha256, contentType: object.contentType, compression: "gzip" });
    plaintext.fill(0);
  }
  const manifest = encryptBackup(Buffer.from(JSON.stringify({ format: "caleonis-pilot-backup-v2", generation, startedAt: snapshot.startedAt, files, pendingObjects: snapshot.pendingObjects, databaseRoles: "bootstrap from repository; no role passwords in dump", serviceVersion: process.env.SERVICE_VERSION ?? "unknown" })), config.publicKey);
  await write(`${prefix}manifest.json.enc`, manifest, "application/octet-stream", true);
  const receipt: Receipt = { format: "caleonis-pilot-backup-v2", generation, startedAt: snapshot.startedAt, completedAt: new Date().toISOString(), bytes: budget.uploadedBytes(), uploadedBytes: budget.uploadedBytes(), objects: snapshot.objects.length, pendingObjects: snapshot.pendingObjects, recoveryKeyFingerprint: fingerprint, blobs: [...blobs.values()], storedBytes: budget.bytes() };
  let receiptBytes = Buffer.from(JSON.stringify(receipt));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    receipt.bytes = receipt.uploadedBytes = budget.uploadedBytes() + receiptBytes.length;
    receipt.storedBytes = budget.bytes() + receiptBytes.length;
    const updated = Buffer.from(JSON.stringify(receipt));
    if (updated.length === receiptBytes.length) { receiptBytes = updated; break; }
    receiptBytes = updated;
  }
  await write(`${prefix}receipt.json`, receiptBytes, "application/json", true);
  return receipt;
}

/** Runs on the existing worker; opt-in only. Keep exactly one backup replica. */
export function startPilotBackupScheduler(env: NodeJS.ProcessEnv = process.env, health?: BackupHealthState): () => void {
  const config = readPilotBackupConfig(env);
  if (!config) return () => undefined;
  const store = new S3StorageProvider({ bucket: env.S3_BUCKET!, region: env.S3_REGION ?? "auto", ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}), ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } : {}), forcePathStyle: env.S3_FORCE_PATH_STYLE === "true" });
  let running = false;
  let retryAfter = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    if (health) { health.running = true; health.lastCheckedAt = Date.now(); }
    let attempt: BackupAttempt | undefined;
    try {
      const existingKeys = (await store.listObjectKeys(BACKUP_PREFIX)).filter((key) => key.endsWith("/receipt.json") && generationFromKey(key)).sort();
      const existingLatest = existingKeys.at(-1);
      if (existingLatest) {
        const existingReceipt = JSON.parse(Buffer.from(await store.getObject({ key: existingLatest })).toString("utf8")) as Receipt;
        const completedAt = Date.parse(existingReceipt.completedAt);
        if (!["caleonis-pilot-backup-v1", "caleonis-pilot-backup-v2"].includes(existingReceipt.format) || !Number.isFinite(completedAt) || completedAt > Date.now() + 60_000) throw new Error("BACKUP_INVALID_LATEST_RECEIPT");
        if (health) health.lastSuccessAt = completedAt;
        if (Date.now() - completedAt < 24 * 60 * 60_000) return;
      }
      if (Date.now() < retryAfter) return;
      const lastAttempt = await readBackupAttempt(store, Date.now());
      if (lastAttempt && Date.now() - Date.parse(lastAttempt.attemptedAt) < BACKUP_RETRY_INTERVAL_MS) {
        if (health && lastAttempt.outcome === "failed") health.lastFailureCode = "BACKUP_PREVIOUS_ATTEMPT_FAILED";
        return;
      }
      retryAfter = Date.now() + BACKUP_RETRY_INTERVAL_MS;
      const receipt = await withPilotBackupLock(config.databaseUrl, async () => {
        const keys = (await store.listObjectKeys(BACKUP_PREFIX)).filter((key) => key.endsWith("/receipt.json") && generationFromKey(key)).sort();
        const latest = keys.at(-1);
        if (latest) {
          const latestReceipt = JSON.parse(Buffer.from(await store.getObject({ key: latest })).toString("utf8")) as Receipt;
          if (!["caleonis-pilot-backup-v1", "caleonis-pilot-backup-v2"].includes(latestReceipt.format) || !Number.isFinite(Date.parse(latestReceipt.completedAt))) throw new Error("BACKUP_INVALID_LATEST_RECEIPT");
          if (health) health.lastSuccessAt = Date.parse(latestReceipt.completedAt);
          if (Date.now() - Date.parse(latestReceipt.completedAt) < 24 * 60 * 60_000) return undefined;
        }
        attempt = await reservePilotBackupAttempt(store, Date.now(), config.maxStoredBytes);
        if (!attempt) return undefined;
        try {
          const captured = await runPilotBackup(config, store, store);
          const controlBudget = await createBackupBudget(store, BACKUP_PREFIX, config.maxStoredBytes);
          await controlBudget.write(LAST_ATTEMPT_KEY, Buffer.from(JSON.stringify({ ...attempt, outcome: "succeeded" })), "application/json");
          return captured;
        } catch (error) {
          const controlBudget = await createBackupBudget(store, BACKUP_PREFIX, config.maxStoredBytes);
          await controlBudget.write(LAST_ATTEMPT_KEY, Buffer.from(JSON.stringify({ ...attempt, outcome: "failed" })), "application/json").catch(() => undefined);
          throw error;
        }
      });
      if (receipt) {
        if (health) { health.lastSuccessAt = Date.parse(receipt.completedAt); health.lastFailureCode = null; }
        console.info("pilot encrypted backup completed", receipt);
      }
    } catch (error) {
      // Deliberately emit no source keys, URLs, stderr or provider error text.
      const code = error instanceof Error && /^BACKUP_[A-Z_]+$/.test(error.message) ? error.message : "BACKUP_FAILURE";
      if (health) health.lastFailureCode = code;
      retryAfter = Math.max(retryAfter, Date.now() + BACKUP_RETRY_INTERVAL_MS);
      console.error("pilot encrypted backup failed", code);
    } finally { running = false; if (health) health.running = false; }
  };
  const timer = setInterval(() => void tick(), 15 * 60_000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
