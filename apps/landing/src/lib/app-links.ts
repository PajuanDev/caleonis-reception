export const APP_LOGIN_URL = "https://receptionist.caleonis.com/login"
export const APP_SIGNUP_URL = "https://receptionist.caleonis.com/signup"
export function buildSignupUrl(locale: "en" | "fr", source?: "calculator") {
  const url = new URL(APP_SIGNUP_URL)
  url.searchParams.set("locale", locale)
  if (source) url.searchParams.set("source", source)
  return url.toString()
}
// Programme information only; no affiliate account or commission is offered.
export const APP_AFFILIATE_URL =
  "https://receptionist.caleonis.com/aide/billing/affiliate-program/"
export const APP_AFFILIATE_LOGIN_URL = APP_AFFILIATE_URL
export const APP_AFFILIATE_SIGNUP_URL = APP_AFFILIATE_URL
