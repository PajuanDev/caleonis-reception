import { mkdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { backupDigest, decryptBackup } from "../../packages/providers/src/storage/backupEncryption.ts";
import { decodeBackupFile } from "../../packages/providers/src/storage/backupRestore.ts";
import { protectPrivateDirectory, writePrivateFile } from "../lib/private-artifact.ts";
import { isWithinPath, validateRestoreManifest } from "./pilot-backup-manifest.ts";

// This tool only writes a newly created local output directory. It deliberately
// does not accept any database URL or restore to a running database or bucket.
const [generationDirectory, privateKeyPath, outputDirectory] = process.argv.slice(2);
if (!generationDirectory || !privateKeyPath || !outputDirectory) throw new Error("Usage: pilot-backup-decrypt <downloaded-generation-directory> <offline-private-key.pem> <new-output-directory>");
const sourceRoot = await realpath(generationDirectory);
const backupRoot = await realpath(resolve(sourceRoot, ".."));
const requestedOutput = resolve(outputDirectory);
const outputParent = await realpath(dirname(requestedOutput));
let outputRoot = resolve(outputParent, basename(requestedOutput));
if (isWithinPath(outputRoot, backupRoot)) throw new Error("Output must be a new directory outside downloaded ciphertext.");
const privateKey = await readFile(privateKeyPath, "utf8");
const manifestPath = resolve(sourceRoot, "manifest.json.enc");
if ((await stat(manifestPath)).size > 2 * 1024 * 1024) throw new Error("Backup manifest exceeds the size ceiling");
const manifest = validateRestoreManifest(JSON.parse(decryptBackup(await readFile(manifestPath), privateKey).toString("utf8")));
await mkdir(outputRoot, { mode: 0o700 });
outputRoot = await realpath(outputRoot);
if (isWithinPath(outputRoot, backupRoot)) throw new Error("Unsafe canonical output directory");
await protectPrivateDirectory(outputRoot);
const metadata: Array<{ localFile: string; sourceKey: string; size: number; sha256: string; contentType: string }> = [];
for (const [index, file] of manifest.files.entries()) {
  const prefix = `_recovery/pilot-v1/${manifest.generation}/`;
  const sharedPrefix = "_recovery/pilot-v1/blobs/";
  const shared = manifest.format === "caleonis-pilot-backup-v2" && file.backupKey.startsWith(sharedPrefix) && /^[a-f0-9]{64}\/[a-f0-9]{64}\.gz\.enc$/.test(file.backupKey.slice(sharedPrefix.length));
  if (!file.backupKey.startsWith(prefix) && !shared) throw new Error("Unsafe backup object path");
  const cipherRoot = shared ? backupRoot : sourceRoot;
  const cipherPath = shared ? resolve(backupRoot, "blobs", file.backupKey.slice(sharedPrefix.length)) : resolve(sourceRoot, file.backupKey.slice(prefix.length));
  if (!cipherPath.startsWith(`${cipherRoot}${sep}`) || await realpath(cipherPath) !== cipherPath) throw new Error("Unsafe local ciphertext path");
  const cipherInfo = await stat(cipherPath);
  if (!cipherInfo.isFile() || cipherInfo.size > 65 * 1024 * 1024) throw new Error("Backup ciphertext exceeds the size ceiling");
  const encrypted = await readFile(cipherPath);
  if (backupDigest(encrypted) !== file.encryptedSha256) throw new Error("Ciphertext SHA256 mismatch");
  const plaintext = await decodeBackupFile(encrypted, privateKey, file);
  if (file.sourceKey === "postgres.dump" && !plaintext.subarray(0, 5).equals(Buffer.from("PGDMP"))) throw new Error("Invalid PostgreSQL custom archive");
  const localFile = file.sourceKey === "postgres.dump" ? "postgres.dump" : `object-${index}.bin`;
  await writePrivateFile(resolve(outputRoot, localFile), plaintext);
  plaintext.fill(0);
  metadata.push({ localFile, sourceKey: file.sourceKey, size: file.size, sha256: file.sha256, contentType: file.contentType });
}
await writePrivateFile(resolve(outputRoot, "restore-manifest.json"), JSON.stringify({ format: manifest.format, generation: manifest.generation, files: metadata }, null, 2));
console.log(JSON.stringify({ status: "PASS", decryptedFiles: metadata.length, note: "Decryption and checksums verified. No database or bucket restoration performed." }));
