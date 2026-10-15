export const APP_LOGIN_URL = "https://receptionist.caleonis.com/fr/login"
export const APP_SIGNUP_URL = "https://receptionist.caleonis.com/fr/essai"
export function buildSignupUrl(_locale: "en" | "fr", source?: "calculator") {
  const url = new URL(APP_SIGNUP_URL)
  if (source) url.searchParams.set("source", source)
  return url.toString()
}
// Affiliate activation is not part of the pilot; legacy components route to information only.
export const APP_AFFILIATE_URL = APP_SIGNUP_URL
export const APP_AFFILIATE_LOGIN_URL = APP_SIGNUP_URL
export const APP_AFFILIATE_SIGNUP_URL = APP_SIGNUP_URL
