import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { backupDigest, decryptBackup } from "./backupEncryption";

const decompress = promisify(gunzip);
export async function decodeBackupFile(encrypted: Uint8Array, privateKey: string, expected: { size: number; sha256: string; encryptedSha256: string; compression?: "none" | "gzip" }): Promise<Buffer> {
  if (!Number.isSafeInteger(expected.size) || expected.size < 0 || expected.size > 64 * 1024 * 1024) throw new Error("BACKUP_INVALID_RESTORE_SIZE");
  if (backupDigest(encrypted) !== expected.encryptedSha256) throw new Error("BACKUP_CIPHERTEXT_HASH_MISMATCH");
  const decrypted = decryptBackup(encrypted, privateKey);
  let plaintext: Buffer;
  if (expected.compression === "gzip") {
    try { plaintext = await decompress(decrypted, { maxOutputLength: Math.max(1, expected.size) }); }
    catch { throw new Error("BACKUP_GZIP_INVALID_OR_TOO_LARGE"); }
    finally { decrypted.fill(0); }
  } else if (expected.compression === undefined || expected.compression === "none") plaintext = decrypted;
  else { decrypted.fill(0); throw new Error("BACKUP_UNSUPPORTED_COMPRESSION"); }
  if (plaintext.length !== expected.size || backupDigest(plaintext) !== expected.sha256) { plaintext.fill(0); throw new Error("BACKUP_PLAINTEXT_HASH_MISMATCH"); }
  return plaintext;
}
