import { execFile } from "node:child_process";
import { chmod, open, stat } from "node:fs/promises";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
let operatorSid: Promise<string> | undefined;
async function protectNewWindowsPath(path: string, directory: boolean): Promise<void> {
  operatorSid ??= executeFile("whoami.exe", ["/user", "/fo", "csv", "/nh"], { windowsHide: true, maxBuffer: 4096, timeout: 15_000 }).then(({ stdout }) => {
    const sid = stdout.match(/"(S-\d-[\d-]+)"\s*$/)?.[1];
    if (!sid) throw new Error("PRIVATE_ARTIFACT_OWNER_UNAVAILABLE");
    return sid;
  });
  const sid = await operatorSid;
  // Only newly and exclusively created files/directories reach this function.
  // Their default ACL is inherited; removing inheritance before contents exist
  // and granting only the current SID protects the new object without a shell.
  await executeFile("icacls.exe", [path, "/inheritance:r", "/grant:r", `*${sid}:${directory ? "(OI)(CI)" : ""}(F)`], { windowsHide: true, maxBuffer: 4096, timeout: 15_000 });
}
async function windowsAcl(path: string, action: "inspect" | "inspect-directory"): Promise<boolean> {
  const script = `
    $ErrorActionPreference = 'Stop'
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $acl = [System.IO.${action === "inspect-directory" ? "Directory" : "File"}]::GetAccessControl($env:CALEONIS_PRIVATE_ARTIFACT_PATH)
    $rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
    $safe = $acl.AreAccessRulesProtected -and $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -eq $sid -and $rules.Count -gt 0
    foreach ($rule in $rules) { if ($rule.IdentityReference.Value -ne $sid -or $rule.IsInherited -or $rule.AccessControlType -ne 'Allow') { $safe = $false } }
    if ($safe) { Write-Output 'PASS' } else { Write-Output 'FAIL' }
  `;
  const result = await executeFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, env: { ...process.env, CALEONIS_PRIVATE_ARTIFACT_PATH: path }, maxBuffer: 4096, timeout: 15_000 });
  return result.stdout.trim() === "PASS";
}

/** Exclusive creation and access protection before writing artifact contents. */
export async function writePrivateFile(path: string, contents: string | Uint8Array): Promise<void> {
  const file = await open(path, "wx", 0o600);
  try {
    if (process.platform === "win32") {
      await protectNewWindowsPath(path, false);
    } else await chmod(path, 0o600);
    await file.writeFile(contents, "utf8");
  } finally { await file.close(); }
}

export async function protectPrivateDirectory(path: string): Promise<void> {
  if (process.platform === "win32") {
    await protectNewWindowsPath(path, true);
  } else await chmod(path, 0o700);
}

/** Inspects real OS access control, rather than synthetic Windows mode bits. */
export async function hasPrivateFileAccess(path: string): Promise<boolean> {
  return process.platform === "win32" ? await windowsAcl(path, "inspect") : ((await stat(path)).mode & 0o777) === 0o600;
}

export async function hasPrivateDirectoryAccess(path: string): Promise<boolean> {
  return process.platform === "win32" ? await windowsAcl(path, "inspect-directory") : ((await stat(path)).mode & 0o777) === 0o700;
}
