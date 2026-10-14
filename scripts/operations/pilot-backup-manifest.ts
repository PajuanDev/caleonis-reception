import { posix, win32 } from "node:path";

export type RestoreFile = { backupKey: string; sourceKey: string; size: number; sha256: string; encryptedSha256: string; contentType: string; compression?: "none" | "gzip" };
export type RestoreManifest = { format: string; generation: string; files: RestoreFile[] };

export function isWithinPath(candidate: string, parent: string, windows = process.platform === "win32"): boolean {
  const paths = windows ? win32 : posix;
  const relative = paths.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${paths.sep}`) && !paths.isAbsolute(relative));
}

export function validateRestoreManifest(input: unknown): RestoreManifest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid backup manifest");
  const manifest = input as RestoreManifest;
  if (!["caleonis-pilot-backup-v1", "caleonis-pilot-backup-v2"].includes(manifest.format) || typeof manifest.generation !== "string" || !/^\d{8}T\d{6}Z-[0-9a-f-]{36}$/.test(manifest.generation) || !Array.isArray(manifest.files) || manifest.files.length < 1 || manifest.files.length > 1001) throw new Error("Invalid backup manifest");
  let total = 0;
  const sourceKeys = new Set<string>();
  for (const file of manifest.files) {
    if (!file || typeof file !== "object" || typeof file.sourceKey !== "string" || !file.sourceKey.length || file.sourceKey.length > 4096 || typeof file.backupKey !== "string" || file.backupKey.length > 4096 || typeof file.contentType !== "string" || !file.contentType.length || file.contentType.length > 255 || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > 64 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(file.sha256) || !/^[a-f0-9]{64}$/.test(file.encryptedSha256) || (file.compression !== undefined && !["none", "gzip"].includes(file.compression)) || (manifest.format === "caleonis-pilot-backup-v1" && file.compression === "gzip")) throw new Error("Invalid backup file metadata");
    if (sourceKeys.has(file.sourceKey)) throw new Error("Duplicate backup source object");
    sourceKeys.add(file.sourceKey);
    const prefix = `_recovery/pilot-v1/${manifest.generation}/`;
    const sharedPrefix = "_recovery/pilot-v1/blobs/";
    const local = file.backupKey.startsWith(prefix) && !file.backupKey.slice(prefix.length).split(/[\\/]/).some((part) => !part || part === "." || part === "..");
    const shared = manifest.format === "caleonis-pilot-backup-v2" && file.backupKey.startsWith(sharedPrefix) && /^[a-f0-9]{64}\/[a-f0-9]{64}\.gz\.enc$/.test(file.backupKey.slice(sharedPrefix.length));
    if (!local && !shared) throw new Error("Unsafe backup object path");
    total += file.size;
  }
  if (total > 1024 * 1024 * 1024 || manifest.files.filter((file) => file.sourceKey === "postgres.dump").length !== 1) throw new Error("Backup must contain one database archive within the restore size ceiling");
  return manifest;
}
