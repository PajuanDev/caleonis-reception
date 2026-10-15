/** Isolated route classifier; this file is not imported by any deployed proxy or app. */
export type RouteInventory = {
  marketing: ReadonlySet<string>;
  help: ReadonlySet<string>;
  marketingAssets: ReadonlySet<string>;
  helpAssets: ReadonlySet<string>;
};
export type RouteDecision = {
  target: "next" | "marketing" | "help" | "reject";
  upstreamPath: string;
  status: "UPSTREAM_STATUS" | 400 | 404 | 405;
  cache: "UPSTREAM_POLICY" | "NO_STORE" | "PUBLIC_STATIC";
  reason: string;
};

const nextPrefixes = ["/api", "/_next", "/.well-known", "/oauth", "/embed", "/locales", "/brand", "/onboarding", "/calls", "/messages", "/contacts", "/appointments", "/agent", "/analytics", "/integrations", "/settings", "/affiliate", "/demos", "/setup-guide"];
const authSections = new Set(["login", "signup", "forgot-password", "reset-password", "verify-email", "confirm-email-change", "accept-invite", "claim-demo", "demo", "essai"]);
const pathInNamespace = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function classifySingleHostRequest(rawTarget: string, method: string, inventory: RouteInventory): RouteDecision {
  const fail = (status: 400 | 404 | 405, reason: string): RouteDecision => ({ target: "reject", upstreamPath: rawTarget, status, cache: "NO_STORE", reason });
  // Preserve raw request paths and queries. Reject ambiguous escaping before any upstream normalizes it.
  if (!rawTarget.startsWith("/") || rawTarget.startsWith("//") || /[\\\u0000-\u0020\u007f#]/.test(rawTarget) || /%(?:2f|5c|25|00)/i.test(rawTarget.split("?")[0]!)) return fail(400, "ambiguous request target");
  const pathname = rawTarget.split("?")[0]!;
  if (pathname.split("/").some(segment => segment === "." || segment === "..")) return fail(400, "dot path segment");
  const unlocalized = pathname.replace(/^\/(?:en|fr|es|sr)(?=\/)/, "");
  const authSection = unlocalized.split("/")[1] ?? "";
  if (nextPrefixes.some(prefix => pathInNamespace(pathname, prefix)) || authSections.has(authSection) || pathname === "/embed.js" || pathname === "/favicon.ico") {
    return { target: "next", upstreamPath: rawTarget, status: "UPSTREAM_STATUS", cache: "UPSTREAM_POLICY", reason: "application, auth, provider or API namespace" };
  }
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return { target: "next", upstreamPath: rawTarget, status: "UPSTREAM_STATUS", cache: "NO_STORE", reason: "gated physical dashboard alias" };
  }
  if (method !== "GET" && method !== "HEAD") return fail(405, "static surfaces accept only GET and HEAD");
  const canonical = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (inventory.help.has(canonical) || inventory.helpAssets.has(pathname)) return { target: "help", upstreamPath: rawTarget, status: "UPSTREAM_STATUS", cache: "PUBLIC_STATIC", reason: "exact help route or asset in build inventory" };
  if (pathInNamespace(pathname, "/aide")) return fail(404, "help route or asset missing from build inventory");
  if (inventory.marketing.has(canonical) || inventory.marketingAssets.has(pathname)) return { target: "marketing", upstreamPath: rawTarget, status: "UPSTREAM_STATUS", cache: "PUBLIC_STATIC", reason: "exact marketing route or asset in build inventory" };
  return fail(404, "unknown route; no SPA or generic-200 fallback");
}
