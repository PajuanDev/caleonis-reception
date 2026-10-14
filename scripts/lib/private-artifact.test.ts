import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { hasPrivateDirectoryAccess, hasPrivateFileAccess, protectPrivateDirectory, writePrivateFile } from "./private-artifact.ts";

describe("private artifacts on the actual host OS", () => {
  it("protects actual ACLs or POSIX mode and refuses overwrite", async () => {
    const root = await mkdtemp(join(tmpdir(), "private-artifact-test-"));
    const target = join(root, "evidence.json");
    try {
      await protectPrivateDirectory(root);
      expect(await hasPrivateDirectoryAccess(root)).toBe(true);
      await writePrivateFile(target, "private fixture");
      expect(await readFile(target, "utf8")).toBe("private fixture");
      expect(await hasPrivateFileAccess(target)).toBe(true);
      await expect(writePrivateFile(target, "replacement")).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(target, "utf8")).toBe("private fixture");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("does not confuse an ordinary inherited artifact with a private artifact on Windows", async () => {
    if (process.platform !== "win32") return;
    const root = await mkdtemp(join(tmpdir(), "private-artifact-test-"));
    try {
      const target = join(root, "inherited.json");
      await writeFile(target, "fixture");
      expect(await hasPrivateFileAccess(target)).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
