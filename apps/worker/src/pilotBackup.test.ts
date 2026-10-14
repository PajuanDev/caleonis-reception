import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { backupDigest, decryptBackup } from "@lobbystack/providers/storage/backupEncryption";
import { decodeBackupFile } from "@lobbystack/providers/storage/backupRestore";
import { pruneUnreferencedBackupBlobs } from "./pilotBackupBlobs";
import { BACKUP_PREFIX, BACKUP_RETRY_INTERVAL_MS, backupRetentionCandidates, readPilotBackupConfig, reservePilotBackupAttempt, runPilotBackup, type PilotBackupConfig } from "./pilotBackup";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const config: PilotBackupConfig = { databaseUrl: "postgres://redacted", publicKey, maxSnapshotBytes: 1_048_576, maxStoredBytes: 10_485_760, pruneApproved: false };
function memoryStore() {
  const objects = new Map<string, Buffer>();
  return { objects, listObjectKeys: vi.fn(async (prefix = "") => [...objects.keys()].filter((key) => key.startsWith(prefix))), headObject: vi.fn(async ({ key }: { key: string }) => objects.has(key) ? { length: objects.get(key)!.length, contentType: "application/octet-stream" } : null), getObject: vi.fn(async ({ key }: { key: string }) => objects.get(key)!), putObject: vi.fn(async ({ key, body, ifNoneMatch }: { key: string; body: Uint8Array; ifNoneMatch?: boolean }) => { if (ifNoneMatch && objects.has(key)) { const error = new Error("exists"); error.name = "PreconditionFailed"; throw error; } objects.set(key, Buffer.from(body)); }), deleteObject: vi.fn(async ({ key }: { key: string }) => { objects.delete(key); }) };
}
const recording = Buffer.from("private binary recording");
const capture = () => Promise.resolve({ dump: Buffer.from("PGDMP test fixture"), startedAt: new Date().toISOString(), pendingObjects: 2, objects: [{ key: "tenant/recording.wav", size: recording.length, checksum: backupDigest(recording), contentType: "audio/wav" }] });

describe("pilot backup with offline recovery key", () => {
  it("defaults disabled and requires a dedicated URL, S3 and RSA recovery key when enabled", () => {
    expect(readPilotBackupConfig({})).toBeUndefined();
    expect(() => readPilotBackupConfig({ BACKUP_ENABLED: "true" })).toThrow("BACKUP_CONFIGURATION_MISSING");
    expect(() => readPilotBackupConfig({ BACKUP_ENABLED: "true", BACKUP_DATABASE_URL: config.databaseUrl, STORAGE_PROVIDER: "s3", BACKUP_RECOVERY_PUBLIC_KEY: privateKey })).toThrow("BACKUP_PUBLIC_KEY_ONLY_REQUIRED");
    expect(readPilotBackupConfig({ BACKUP_ENABLED: "true", BACKUP_DATABASE_URL: config.databaseUrl, STORAGE_PROVIDER: "s3", BACKUP_RECOVERY_PUBLIC_KEY: publicKey })).toMatchObject({ pruneApproved: false });
  });
  it("encrypts the DB, recording and manifest, reads them back, then commits a receipt", async () => {
    const source = memoryStore();
    source.objects.set("tenant/recording.wav", recording);
    const target = memoryStore();
    const receipt = await runPilotBackup(config, source, target, capture);
    expect(receipt).toMatchObject({ objects: 1, pendingObjects: 2 });
    expect(receipt.bytes).toBe(target.putObject.mock.calls.reduce((sum, [input]) => sum + input.body.byteLength, 0));
    expect(receipt.storedBytes).toBe([...target.objects.values()].reduce((sum, body) => sum + body.length, 0));
    const prefix = `${BACKUP_PREFIX}${receipt.generation}/`;
    expect(decryptBackup(target.objects.get(`${prefix}postgres.dump.enc`)!, privateKey).toString()).toBe("PGDMP test fixture");
    const manifest = JSON.parse(decryptBackup(target.objects.get(`${prefix}manifest.json.enc`)!, privateKey).toString());
    const file = manifest.files.find((entry: { sourceKey: string }) => entry.sourceKey === "tenant/recording.wav");
    expect(await decodeBackupFile(target.objects.get(file.backupKey)!, privateKey, file)).toEqual(recording);
    expect([...target.objects.keys()].at(-1)).toBe(`${prefix}receipt.json`);
    expect(target.deleteObject).not.toHaveBeenCalled();
  });
  it("never commits a successful receipt when a source object is missing or upload readback differs", async () => {
    const source = memoryStore();
    const target = memoryStore();
    await expect(runPilotBackup(config, source, target, capture)).rejects.toThrow("BACKUP_SOURCE_OBJECT_MISSING_OR_CHANGED");
    expect([...target.objects.keys()].some((key) => key.endsWith("receipt.json"))).toBe(false);
    target.getObject.mockResolvedValue(Buffer.from("changed"));
    await expect(runPilotBackup(config, source, target, capture)).rejects.toThrow("BACKUP_READBACK_HASH_MISMATCH");
  });
  it("blocks writes when the approved storage cap cannot fit the capture", async () => {
    const source = memoryStore();
    const target = memoryStore();
    await expect(runPilotBackup({ ...config, maxStoredBytes: 100 }, source, target, capture)).rejects.toThrow("BACKUP_STORAGE_BUDGET_REACHED");
    expect(target.putObject).not.toHaveBeenCalled();
  });
  it("preserves seven completed generations and never purges other prefixes", () => {
    const keys = Array.from({ length: 10 }, (_, index) => `${BACKUP_PREFIX}202609${String(index + 1).padStart(2, "0")}T030000Z-00000000-0000-4000-8000-000000000001/receipt.json`);
    const foreign = "other-backups/20260901/receipt.json";
    expect(backupRetentionCandidates([...keys, foreign], new Date("2026-10-14T00:00:00Z"))).toEqual(keys.slice(0, 3));
  });
  it("persists a minimum six-hour retry floor across redeployments and UTC slot boundaries", async () => {
    const store = memoryStore();
    const start = Date.parse("2026-10-14T23:59:00Z");
    expect(await reservePilotBackupAttempt(store, start)).toMatchObject({ outcome: "started" });
    expect(await reservePilotBackupAttempt(store, start + 2 * 60_000)).toBeUndefined();
    expect(await reservePilotBackupAttempt(store, start + BACKUP_RETRY_INTERVAL_MS - 1)).toBeUndefined();
    expect(await reservePilotBackupAttempt(store, start + BACKUP_RETRY_INTERVAL_MS)).toMatchObject({ outcome: "started" });
  });
  it("allows one persistent reservation per UTC slot and never proceeds if conditional storage fails", async () => {
    const store = memoryStore();
    const now = Date.parse("2026-10-14T22:00:00Z");
    await reservePilotBackupAttempt(store, now);
    store.objects.delete(`${BACKUP_PREFIX}control/last-attempt.json`);
    expect(await reservePilotBackupAttempt(store, now)).toBeUndefined();
    store.putObject.mockRejectedValue(new Error("offline"));
    await expect(reservePilotBackupAttempt(store, now + BACKUP_RETRY_INTERVAL_MS)).rejects.toThrow("BACKUP_ATTEMPT_RESERVATION_FAILED");
  });
  it("reuses one encrypted compressed blob in two complete generations and leaves original bytes unchanged", async () => {
    const source = memoryStore();
    source.objects.set("tenant/recording.wav", recording);
    const target = memoryStore();
    const first = await runPilotBackup(config, source, target, capture);
    const second = await runPilotBackup(config, source, target, capture);
    expect(first.format).toBe("caleonis-pilot-backup-v2");
    expect(second.blobs?.[0]?.key).toBe(first.blobs?.[0]?.key);
    expect([...target.objects.keys()].filter((key) => key.endsWith(".gz.enc"))).toHaveLength(1);
    expect(target.putObject.mock.calls.filter(([input]) => input.key.endsWith(".gz.enc"))).toHaveLength(1);
    expect(source.objects.get("tenant/recording.wav")).toEqual(recording);
    expect(target.objects.get(`${BACKUP_PREFIX}${second.generation}/receipt.json`)!.toString()).not.toContain("tenant/recording.wav");
  });
  it("counts reservation metadata against the same firm storage ceiling", async () => {
    const target = memoryStore();
    target.objects.set(`${BACKUP_PREFIX}existing`, Buffer.alloc(90));
    await expect(reservePilotBackupAttempt(target, Date.now(), 100)).rejects.toThrow("BACKUP_STORAGE_BUDGET_REACHED");
    expect(target.putObject).not.toHaveBeenCalled();
  });
  it("fits compressible plaintext larger than the storage ceiling without loading all source files together", async () => {
    const source = memoryStore();
    const bytes = Buffer.alloc(1024 * 1024, 42);
    source.objects.set("large.wav", bytes);
    const target = memoryStore();
    const result = await runPilotBackup({ ...config, maxSnapshotBytes: 2 * 1024 * 1024, maxStoredBytes: 8192 }, source, target, async () => ({ dump: Buffer.from("PGDMP fixture"), startedAt: new Date().toISOString(), pendingObjects: 0, objects: [{ key: "large.wav", size: bytes.length, checksum: backupDigest(bytes), contentType: "audio/wav" }] }));
    expect(result.objects).toBe(1);
    expect([...target.objects.values()].reduce((sum, value) => sum + value.length, 0)).toBeLessThan(8192);
  });
  it("never deletes referenced blobs and waits seven days after they become unreferenced", async () => {
    const source = memoryStore(); source.objects.set("tenant/recording.wav", recording);
    const target = memoryStore();
    const receipt = await runPilotBackup(config, source, target, capture);
    const blob = receipt.blobs![0]!.key;
    const receiptKey = `${BACKUP_PREFIX}${receipt.generation}/receipt.json`;
    const write = async (key: string, body: Buffer, contentType: string) => target.putObject({ key, body });
    const t0 = new Date("2026-10-14T00:00:00Z");
    const prune = (receipts: string[], now: Date) => pruneUnreferencedBackupBlobs({ store: target, prefix: BACKUP_PREFIX, keys: [...target.objects.keys()], retainedReceiptKeys: receipts, approved: true, now, write });
    expect(await prune([receiptKey], t0)).toBe(0);
    expect(await prune([], t0)).toBe(0);
    expect(await prune([], new Date(t0.getTime() + 6 * 24 * 60 * 60_000))).toBe(0);
    // Re-referencing clears the old marker, even after the original grace elapsed.
    expect(await prune([receiptKey], new Date(t0.getTime() + 8 * 24 * 60 * 60_000))).toBe(0);
    expect(target.objects.has(blob)).toBe(true);
    const t1 = new Date(t0.getTime() + 9 * 24 * 60 * 60_000);
    await prune([], t1);
    expect(await prune([], new Date(t1.getTime() + 8 * 24 * 60 * 60_000))).toBe(1);
    expect(target.objects.has(blob)).toBe(false);
    expect(target.objects.has(`${blob}.metadata.json`)).toBe(false);
  });
  it("rejects a tampered reusable blob before committing another generation", async () => {
    const source = memoryStore(); source.objects.set("tenant/recording.wav", recording);
    const target = memoryStore();
    const receipt = await runPilotBackup(config, source, target, capture);
    const blobKey = receipt.blobs![0]!.key;
    const bytes = target.objects.get(blobKey)!; bytes[bytes.length - 1]! ^= 1;
    await expect(runPilotBackup(config, source, target, capture)).rejects.toThrow("BACKUP_BLOB_READBACK_HASH_MISMATCH");
    expect([...target.objects.keys()].filter((key) => key.endsWith("receipt.json"))).toHaveLength(1);
  });
});
