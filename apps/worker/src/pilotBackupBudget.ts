import { backupDigest } from "@lobbystack/providers/storage/backupEncryption";
import type { BackupStore } from "./pilotBackup";

/** Invoke under the backup session lock; every owned PUT uses this budget. */
export async function createBackupBudget(store: BackupStore, prefix: string, maxBytes: number) {
  const measure = async () => {
    const keys = await store.listObjectKeys(prefix);
    if (keys.length > 10_000) throw new Error("BACKUP_INVENTORY_LIMIT");
    let total = 0;
    for (const key of keys) total += (await store.headObject({ key }))?.length ?? 0;
    return total;
  };
  let bytes = await measure();
  let uploadedBytes = 0;
  const write = async (key: string, body: Buffer, contentType: string, exclusive = false) => {
    if (!key.startsWith(prefix)) throw new Error("BACKUP_UNSAFE_BUDGET_KEY");
    const previousBytes = (await store.headObject({ key }))?.length ?? 0;
    // Reserve control headroom without relaxing the firm overall ceiling.
    const limit = key.startsWith(`${prefix}control/`) ? maxBytes : Math.max(0, maxBytes - Math.min(64 * 1024, Math.floor(maxBytes / 100)));
    if (bytes - previousBytes + body.length > limit) throw new Error("BACKUP_STORAGE_BUDGET_REACHED");
    await store.putObject({ key, body, contentType, ...(exclusive ? { ifNoneMatch: true } : {}) });
    if (backupDigest(await store.getObject({ key })) !== backupDigest(body)) throw new Error("BACKUP_READBACK_HASH_MISMATCH");
    bytes += body.length - previousBytes;
    uploadedBytes += body.length;
  };
  return { write, bytes: () => bytes, uploadedBytes: () => uploadedBytes, refresh: async () => { bytes = await measure(); } };
}
