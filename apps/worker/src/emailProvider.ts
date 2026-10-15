import { ResendEmailProvider, SmtpEmailProvider } from "@lobbystack/providers";

export function createEmailProvider(source: Record<string, string | undefined> = process.env): Pick<SmtpEmailProvider, "sendTemplate"> | undefined {
  const provider = source.EMAIL_PROVIDER ?? "smtp";
  if (provider === "resend") {
    if (!source.RESEND_API_KEY || !source.EMAIL_FROM) throw new Error("Resend email delivery requires RESEND_API_KEY and EMAIL_FROM.");
    return new ResendEmailProvider({ apiKey: source.RESEND_API_KEY, from: source.EMAIL_FROM, ...(source.EMAIL_REPLY_TO ? { replyTo: source.EMAIL_REPLY_TO } : {}) });
  }
  if (provider !== "smtp") throw new Error("EMAIL_PROVIDER must be smtp or resend.");
  if (!source.SMTP_HOST) {
    console.warn("SMTP_HOST is missing. Authentication email jobs will fail until email delivery is configured.");
    return undefined;
  }
  return new SmtpEmailProvider({
    host: source.SMTP_HOST,
    port: Number(source.SMTP_PORT ?? 587),
    secure: source.SMTP_SECURE === "true",
    username: source.SMTP_USERNAME ?? "",
    password: source.SMTP_PASSWORD ?? "",
    from: source.EMAIL_FROM ?? "LobbyStack <no-reply@localhost>",
    ...(source.EMAIL_REPLY_TO ? { replyTo: source.EMAIL_REPLY_TO } : {}),
  });
}
