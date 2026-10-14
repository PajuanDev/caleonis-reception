import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { backupDigest, encryptBackup } from "@lobbystack/providers/storage/backupEncryption";
import type { BackupStore } from "./pilotBackup";

const compress = promisify(gzip);
export type BackupBlobReference = { key: string; encryptedSha256: string; encryptedSize: number; compression: "gzip"; createdAt: string };
type BlobMetadata = BackupBlobReference & { format: "caleonis-pilot-blob-v2"; sourceSha256: string; sourceSize: number; keyFingerprint: string };
export type BudgetedBackupWriter = (key: string, body: Buffer, contentType: string, exclusive?: boolean) => Promise<void>;

/** A private content-addressed encrypted copy; the original WAV is untouched. */
export async function ensureBackupBlob(input: { plaintext: Buffer; publicKey: string; fingerprint: string; prefix: string; store: BackupStore; write: BudgetedBackupWriter }): Promise<BackupBlobReference> {
  const sourceSha256 = backupDigest(input.plaintext);
  const key = `${input.prefix}blobs/${input.fingerprint}/${sourceSha256}.gz.enc`;
  const metadataKey = `${key}.metadata.json`;
  const metadataHead = await input.store.headObject({ key: metadataKey });
  if (metadataHead) {
    if (metadataHead.length > 8192) throw new Error("BACKUP_INVALID_BLOB_METADATA");
    const metadata = JSON.parse(Buffer.from(await input.store.getObject({ key: metadataKey })).toString("utf8")) as BlobMetadata;
    if (metadata.format !== "caleonis-pilot-blob-v2" || metadata.key !== key || metadata.sourceSha256 !== sourceSha256 || metadata.sourceSize !== input.plaintext.length || metadata.keyFingerprint !== input.fingerprint || metadata.compression !== "gzip" || !/^[a-f0-9]{64}$/.test(metadata.encryptedSha256) || !Number.isSafeInteger(metadata.encryptedSize) || metadata.encryptedSize < 1 || metadata.encryptedSize > 65 * 1024 * 1024 || !Number.isFinite(Date.parse(metadata.createdAt))) throw new Error("BACKUP_INVALID_BLOB_METADATA");
    const encryptedHead = await input.store.headObject({ key });
    if (!encryptedHead || encryptedHead.length !== metadata.encryptedSize || backupDigest(await input.store.getObject({ key })) !== metadata.encryptedSha256) throw new Error("BACKUP_BLOB_READBACK_HASH_MISMATCH");
    return { key: metadata.key, encryptedSha256: metadata.encryptedSha256, encryptedSize: metadata.encryptedSize, compression: metadata.compression, createdAt: metadata.createdAt };
  }
  // An orphan ciphertext cannot be verified without the offline private key.
  // Preserve it for inspection instead of overwriting a possibly referenced copy.
  if (await input.store.headObject({ key })) throw new Error("BACKUP_BLOB_METADATA_MISSING");
  const compressed = await compress(input.plaintext, { level: 6 });
  const encrypted = encryptBackup(compressed, input.publicKey);
  compressed.fill(0);
  const reference: BackupBlobReference = { key, encryptedSha256: backupDigest(encrypted), encryptedSize: encrypted.length, compression: "gzip", createdAt: new Date().toISOString() };
  await input.write(key, encrypted, "application/octet-stream", true);
  const metadata: BlobMetadata = { ...reference, format: "caleonis-pilot-blob-v2", sourceSha256, sourceSize: input.plaintext.length, keyFingerprint: input.fingerprint };
  await input.write(metadataKey, Buffer.from(JSON.stringify(metadata)), "application/json", true);
  return reference;
}

function isOwnedBlobKey(prefix: string, key: string): boolean {
  return key.startsWith(`${prefix}blobs/`) && /^[a-f0-9]{64}\/[a-f0-9]{64}\.gz\.enc$/.test(key.slice(`${prefix}blobs/`.length));
}

/** Removes only proven unreferenced generated blobs after a seven-day grace. */
export async function pruneUnreferencedBackupBlobs(input: { store: BackupStore; prefix: string; retainedReceiptKeys: string[]; keys: string[]; approved: boolean; now?: Date; write: BudgetedBackupWriter }): Promise<number> {
  if (!input.approved) return 0;
  const referenced = new Set<string>();
  for (const key of input.retainedReceiptKeys) {
    const head = await input.store.headObject({ key });
    if (!head || head.length > 1024 * 1024) throw new Error("BACKUP_INVALID_RETENTION_RECEIPT");
    const receipt = JSON.parse(Buffer.from(await input.store.getObject({ key })).toString("utf8")) as { format: string; blobs?: BackupBlobReference[] };
    if (receipt.format === "caleonis-pilot-backup-v1") continue;
    if (receipt.format !== "caleonis-pilot-backup-v2" || !Array.isArray(receipt.blobs)) throw new Error("BACKUP_INVALID_RETENTION_RECEIPT");
    for (const blob of receipt.blobs) {
      if (!isOwnedBlobKey(input.prefix, blob.key)) throw new Error("BACKUP_UNSAFE_BLOB_REFERENCE");
      referenced.add(blob.key);
    }
  }
  let deleted = 0;
  const now = input.now ?? new Date();
  for (const key of input.keys.filter((candidate) => isOwnedBlobKey(input.prefix, candidate))) {
    const markerKey = `${input.prefix}control/unreferenced-${backupDigest(Buffer.from(key))}.json`;
    const markerHead = await input.store.headObject({ key: markerKey });
    if (referenced.has(key)) {
      // Re-referencing restarts the grace clock; old markers cannot delete it.
      if (markerHead) await input.store.deleteObject({ key: markerKey });
      continue;
    }
    if (!markerHead) {
      await input.write(markerKey, Buffer.from(JSON.stringify({ format: "caleonis-pilot-unreferenced-v2", key, since: now.toISOString() })), "application/json", true);
      continue;
    }
    if (markerHead.length > 8192) throw new Error("BACKUP_INVALID_BLOB_RETENTION_MARKER");
    const marker = JSON.parse(Buffer.from(await input.store.getObject({ key: markerKey })).toString("utf8")) as { format: string; key: string; since: string };
    const since = Date.parse(marker.since);
    if (marker.format !== "caleonis-pilot-unreferenced-v2" || marker.key !== key || !Number.isFinite(since) || since > now.getTime()) throw new Error("BACKUP_INVALID_BLOB_RETENTION_MARKER");
    if (now.getTime() - since <= 7 * 24 * 60 * 60_000) continue;
    await input.store.deleteObject({ key });
    await input.store.deleteObject({ key: `${key}.metadata.json` });
    await input.store.deleteObject({ key: markerKey });
    deleted += 1;
  }
  return deleted;
}
