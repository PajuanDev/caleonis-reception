// The final marketing domain is pending validation. Preview origin is explicit and isolated.
const configuredOrigin = typeof process !== "undefined" ? process.env.PUBLIC_SITE_URL : undefined
export const SITE_URL = configuredOrigin || "https://caleonis-receptionist-v1-review.willgosse225.chatgpt.site"
