import { getSafeReturnTo } from "./auth-return-to";

export function appHomePath(): "/" | "/dashboard" {
  return process.env.NEXT_PUBLIC_P1_SINGLE_HOST_STAGING === "true" ? "/dashboard" : "/";
}

/** Keep legacy dashboard root return links inside the app during the rehearsal. */
export function appAuthenticationReturnTo(value: string | null | undefined): string {
  const target = getSafeReturnTo(value);
  if (!target) return appHomePath();
  const url = new URL(target, "https://app-return.invalid");
  if (url.pathname === "/" && appHomePath() === "/dashboard") return `/dashboard${url.search}${url.hash}`;
  return target;
}
