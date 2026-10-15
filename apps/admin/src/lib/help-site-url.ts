/** A published help site is optional while the pilot uses assisted onboarding. */
export function helpSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_HELP_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Invalid or missing configuration falls back to the existing pilot page.
    }
  }
  return "/fr/essai";
}
