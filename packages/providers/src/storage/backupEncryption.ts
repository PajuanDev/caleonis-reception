import { constants, createCipheriv, createDecipheriv, createHash, privateDecrypt, publicEncrypt, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("CALEONIS-BACKUP-1\n");

/** Only the public recovery key is needed on the application host. */
export function encryptBackup(plaintext: Uint8Array, publicKey: string): Buffer {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const wrapped = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, key);
  key.fill(0);
  const header = Buffer.from(JSON.stringify({ algorithm: "RSA-OAEP-SHA256+A256GCM", wrappedKey: wrapped.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") }) + "\n");
  return Buffer.concat([MAGIC, header, encrypted]);
}

/** Offline restoration only. Never configure a private recovery key in worker. */
export function decryptBackup(envelope: Uint8Array, privateKey: string): Buffer {
  const bytes = Buffer.from(envelope);
  if (!bytes.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("INVALID_BACKUP_FORMAT");
  const end = bytes.indexOf(10, MAGIC.length);
  if (end < MAGIC.length || end > 16_384) throw new Error("INVALID_BACKUP_HEADER");
  const header = JSON.parse(bytes.subarray(MAGIC.length, end).toString("utf8")) as Record<string, string>;
  if (header.algorithm !== "RSA-OAEP-SHA256+A256GCM") throw new Error("INVALID_BACKUP_ALGORITHM");
  const key = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(header.wrappedKey!, "base64"));
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(header.iv!, "base64"));
    decipher.setAAD(MAGIC);
    decipher.setAuthTag(Buffer.from(header.tag!, "base64"));
    return Buffer.concat([decipher.update(bytes.subarray(end + 1)), decipher.final()]);
  } finally { key.fill(0); }
}

export function backupDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
