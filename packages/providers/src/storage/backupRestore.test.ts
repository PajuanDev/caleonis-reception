import { generateKeyPairSync } from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { backupDigest, encryptBackup } from "./backupEncryption";
import { decodeBackupFile } from "./backupRestore";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
describe("v1 and compressed v2 offline recovery", () => {
  it("restores v1 unchanged and verifies v2 against the original bytes after gunzip", async () => {
    const source = Buffer.from("wave sample ".repeat(1000));
    for (const compression of [undefined, "gzip"] as const) {
      const encrypted = encryptBackup(compression ? gzipSync(source) : source, publicKey);
      const restored = await decodeBackupFile(encrypted, privateKey, { size: source.length, sha256: backupDigest(source), encryptedSha256: backupDigest(encrypted), ...(compression ? { compression } : {}) });
      expect(restored).toEqual(source);
    }
  });
  it("rejects altered ciphertext, invalid gzip, wrong original hash and oversized decompression", async () => {
    const source = Buffer.from("source ".repeat(100));
    const valid = encryptBackup(gzipSync(source), publicKey);
    const expected = { size: source.length, sha256: backupDigest(source), encryptedSha256: backupDigest(valid), compression: "gzip" as const };
    const altered = Buffer.from(valid); altered[altered.length - 1]! ^= 1;
    await expect(decodeBackupFile(altered, privateKey, expected)).rejects.toThrow("BACKUP_CIPHERTEXT_HASH_MISMATCH");
    const invalid = encryptBackup(Buffer.from("not gzip"), publicKey);
    await expect(decodeBackupFile(invalid, privateKey, { ...expected, encryptedSha256: backupDigest(invalid) })).rejects.toThrow("BACKUP_GZIP_INVALID_OR_TOO_LARGE");
    await expect(decodeBackupFile(valid, privateKey, { ...expected, sha256: "0".repeat(64) })).rejects.toThrow("BACKUP_PLAINTEXT_HASH_MISMATCH");
    await expect(decodeBackupFile(valid, privateKey, { ...expected, size: 10 })).rejects.toThrow("BACKUP_GZIP_INVALID_OR_TOO_LARGE");
  });
});
