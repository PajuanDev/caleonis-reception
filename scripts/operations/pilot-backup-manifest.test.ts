import { describe, expect, it } from "vitest";
import { isWithinPath, validateRestoreManifest } from "./pilot-backup-manifest.ts";

const generation = "20261014T220000Z-00000000-0000-4000-8000-000000000001";
const file = { sourceKey: "postgres.dump", backupKey: `_recovery/pilot-v1/${generation}/postgres.dump.enc`, size: 10, sha256: "a".repeat(64), encryptedSha256: "b".repeat(64), contentType: "application/octet-stream" };
describe("offline backup manifest and output path guards", () => {
  it("rejects empty/missing database manifests, duplicate source objects and oversize metadata", () => {
    expect(() => validateRestoreManifest({ format: "caleonis-pilot-backup-v1", generation, files: [] })).toThrow();
    expect(() => validateRestoreManifest({ format: "caleonis-pilot-backup-v2", generation, files: [{ ...file, sourceKey: "recording" }] })).toThrow();
    expect(() => validateRestoreManifest({ format: "caleonis-pilot-backup-v2", generation, files: [file, file] })).toThrow();
    expect(() => validateRestoreManifest({ format: "caleonis-pilot-backup-v2", generation, files: Array.from({ length: 18 }, (_, index) => ({ ...file, sourceKey: index === 0 ? "postgres.dump" : `object-${index}`, size: 64 * 1024 * 1024 })) })).toThrow();
  });
  it("accepts the previous v1 layout and v2 content-addressed blob references", () => {
    expect(validateRestoreManifest({ format: "caleonis-pilot-backup-v1", generation, files: [file] }).files).toHaveLength(1);
    const blob = { ...file, sourceKey: "recording", backupKey: `_recovery/pilot-v1/blobs/${"c".repeat(64)}/${"d".repeat(64)}.gz.enc`, compression: "gzip" };
    expect(validateRestoreManifest({ format: "caleonis-pilot-backup-v2", generation, files: [file, blob] }).files).toHaveLength(2);
  });
  it("recognizes Windows containment regardless of letter case and rejects sibling confusion", () => {
    expect(isWithinPath("c:\\backups\\generation\\plaintext", "C:\\Backups\\generation", true)).toBe(true);
    expect(isWithinPath("C:\\Backups\\generation-copy", "C:\\Backups\\generation", true)).toBe(false);
    expect(isWithinPath("C:\\Backups\\..plaintext", "C:\\Backups", true)).toBe(true);
    expect(isWithinPath("/private/ciphertext/..plaintext", "/private/ciphertext", false)).toBe(true);
    expect(isWithinPath("/private/decoded", "/private/ciphertext", false)).toBe(false);
  });
});
