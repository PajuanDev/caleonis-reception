import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup } from "./backupEncryption";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });

describe("offline recovery encryption", () => {
  it("round-trips binary PostgreSQL and file data using the offline key", () => {
    const source = Buffer.from([0, 1, 255, 2, 13, 10]);
    const first = encryptBackup(source, publicKey);
    const second = encryptBackup(source, publicKey);
    expect(first.equals(second)).toBe(false);
    expect(decryptBackup(first, privateKey)).toEqual(source);
  });
  it("rejects changed ciphertext and a different recovery key", () => {
    const encrypted = encryptBackup(Buffer.from("private recording"), publicKey);
    encrypted[encrypted.length - 1]! ^= 1;
    expect(() => decryptBackup(encrypted, privateKey)).toThrow();
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    expect(() => decryptBackup(encryptBackup(Buffer.from("secret"), publicKey), other)).toThrow();
  });
  it("rejects the public key as a recovery key", () => {
    expect(() => decryptBackup(encryptBackup(Buffer.from("secret"), publicKey), publicKey)).toThrow();
  });
});
