/** Build-time opt-in for the isolated single-host rehearsal. No production host is eligible. */
export function singleHostStagingBuildEnabled(environment: Record<string, string | undefined>): boolean {
  if (environment.P1_SINGLE_HOST_STAGING !== "true") return false;
  const name = environment.RAILWAY_ENVIRONMENT_NAME ?? environment.P1_SINGLE_HOST_ENVIRONMENT ?? environment.NODE_ENV;
  if (!name || !["development", "test", "staging", "preview", "certification"].includes(name)) return false;
  try {
    const url = new URL(environment.APP_BASE_URL ?? "http://localhost:3000");
    const hostname = url.hostname.replace(/\.+$/, "");
    return ["http:", "https:"].includes(url.protocol) && hostname !== "receptionist.caleonis.com" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}
