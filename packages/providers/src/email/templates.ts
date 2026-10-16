/** Transactional copy only. Delivery, authentication and retry policy live elsewhere. */
export type TemplateName = "existing_account" | "verify_email" | "password_reset" | "invitation" | "operator_alert" | "feedback_submission" | "onboarding_followup";
const brand = "Caléonis Receptionist";
const copy = {
  fr: {
    verifyTitle: "Vérifiez votre adresse email",
    verifyIntro: `Saisissez ce code pour terminer la création de votre compte ${brand}.`,
    expiry: "Ce code expire dans 10 minutes.",
    ignore: "Si vous n’avez pas demandé ce code, vous pouvez ignorer cet email.",
    operator: `Notification ${brand}`,
    feedback: `Retour utilisateur ${brand}`,
  },
  en: {
    verifyTitle: "Verify your email address",
    verifyIntro: `Enter this verification code to finish setting up your ${brand} account.`,
    expiry: "This code expires in 10 minutes.",
    ignore: "If you did not request this code, you can safely ignore this email.",
    operator: `${brand} operator notification`,
    feedback: `${brand} dashboard feedback`,
  },
} as const;

function emailLocale(locale?: string): "fr" | "en" {
  return locale?.toLowerCase().split(/[-_]/)[0] === "fr" ? "fr" : "en";
}

export function renderTemplate(template: TemplateName, subject: string, variables: Record<string, string>): { text: string; html?: string } {
  const locale = emailLocale(variables.locale);
  const text = templateBody(template, variables, locale);
  // Keep previously issued verification/reset links as plain text. Never
  // rewrite a signed link, code, sender name or user-supplied business message.
  if (template !== "verify_email" || !variables.code) return { text };
  const c = copy[locale];
  const code = escapeHtml(variables.code);
  return {
    text,
    html: renderEmailLayout({ locale, previewText: subject, content: [
      `<h1 style="margin:0 0 24px;font-size:28px;font-weight:600;line-height:1.25;color:#0B0B0D;text-align:center;">${escapeHtml(c.verifyTitle)}</h1>`,
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#3D3D3D;text-align:center;">${escapeHtml(c.verifyIntro)}</p>`,
      `<p style="margin:0 0 24px;padding:16px 24px;background-color:#F3F4F6;border-radius:16px;font-size:32px;font-weight:600;line-height:1.25;letter-spacing:8px;color:#0B0B0D;text-align:center;">${code}</p>`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#6B7280;text-align:center;">${escapeHtml(c.expiry)}</p>`,
      `<p style="margin:0;font-size:14px;line-height:1.5;color:#6B7280;text-align:center;">${escapeHtml(c.ignore)}</p>`,
    ].join("") }),
  };
}

function templateBody(template: TemplateName, v: Record<string, string>, locale: "fr" | "en"): string {
  const fr = locale === "fr";
  switch (template) {
    case "existing_account":
      return fr
        ? `Vous avez déjà un compte ${brand}. Connectez-vous pour continuer : ${v.signInUrl}. Mot de passe oublié ? ${v.resetUrl}. Si vous n’avez pas demandé la création d’un compte, ignorez cet email.`
        : `You already have a ${brand} account. Sign in to continue: ${v.signInUrl}. Forgot your password? ${v.resetUrl}. If you did not request an account, ignore this email.`;
    case "verify_email":
      return v.code
        ? fr ? `Votre code de vérification ${brand} est : ${v.code}. Il expire dans 10 minutes.` : `Your ${brand} email verification code is: ${v.code}. It expires in 10 minutes.`
        : fr ? `Confirmez votre adresse email ${brand} avec ce lien : ${v.url ?? ""}` : `Verify your ${brand} email address using this link: ${v.url ?? ""}`;
    case "password_reset":
      return v.code
        ? fr ? `Votre code de réinitialisation ${brand} est : ${v.code}. Il expire dans 10 minutes.` : `Your ${brand} password reset code is: ${v.code}. It expires in 10 minutes.`
        : fr ? `Réinitialisez votre mot de passe ${brand} avec ce lien : ${v.url ?? ""}` : `Reset your ${brand} password using this link: ${v.url ?? ""}`;
    case "invitation":
      return fr ? `Vous avez été invité à rejoindre ${brand}. Acceptez l’invitation ici : ${v.url ?? ""}` : `You have been invited to join ${brand}. Accept the invitation here: ${v.url ?? ""}`;
    case "operator_alert": return v.message ?? copy[locale].operator;
    case "feedback_submission": return v.body ?? copy[locale].feedback;
    case "onboarding_followup": return onboardingFollowupBody(v, locale);
  }
}

function onboardingFollowupBody(v: Record<string, string>, locale: "fr" | "en"): string {
  const sender = v.senderName ?? "";
  const business = v.businessName ?? "";
  if (locale === "fr") return [
    v.firstName ? `Bonjour ${v.firstName},` : "Bonjour,", "",
    `Je suis ${sender}, le fondateur de ${brand}. Vous avez configuré une réceptionniste pour ${business} hier. Merci de l'avoir essayée.`, "",
    "J'aimerais savoir ce que vous en avez pensé :", "",
    "1. Avez-vous aimé l'expérience ? Qu'est-ce qui a bien fonctionné, et qu'est-ce qui clochait ?",
    "2. Que devrions-nous améliorer ?",
    "3. Comptez-vous l'utiliser pour vrai, avec votre propre numéro de téléphone ? Sinon, qu'est-ce qui vous en empêche ?", "",
    "Vous pouvez répondre à ce courriel, et deux lignes suffiraient !", "", "Merci encore,", sender, `Fondateur, ${brand}`,
  ].join("\n");
  return [
    v.firstName ? `Hi ${v.firstName},` : "Hi,", "",
    `I'm ${sender}, the founder of ${brand}. You set up a receptionist for ${business} yesterday. Thanks for giving it a try.`, "",
    "I'd love to hear what you thought:", "",
    "1. Did you like it? What worked, and what felt off?",
    "2. What should we improve?",
    "3. Do you plan to use it for real, with your own phone number? If not, what's stopping you?", "",
    "You can reply to this email, and two lines would be plenty!", "", "Thanks again,", sender, `Founder, ${brand}`,
  ].join("\n");
}

function renderEmailLayout({ locale, previewText, content }: { locale: "fr" | "en"; previewText: string; content: string }): string {
  // Text wordmark: no upstream trademark, remote image, tracking pixel or SVG
  // dependency. Keep the original restrained card layout and responsive size.
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(previewText)}</title>
    <style>
      :root { color-scheme: light; }
      @media only screen and (max-width: 620px) {
        .email-container { width: 100% !important; padding: 24px 16px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
      <tr><td align="center" style="padding:48px 16px;">
        <table role="presentation" class="email-container" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;padding:48px;">
          <tr><td align="center" style="padding-bottom:32px;">
            <p style="margin:0;font-size:20px;font-weight:600;line-height:1.5;color:#0B0B0D;">${brand}</p>
          </td></tr>
          <tr><td>${content}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
