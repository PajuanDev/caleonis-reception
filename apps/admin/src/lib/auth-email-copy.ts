/** Application-owned transactional subjects. Never changes recipients or credentials. */
const subjects = {
  fr: {
    verification: "Confirmez votre adresse email — Caléonis Receptionist",
    verification_code: "Votre code de vérification Caléonis Receptionist",
    password_reset: "Réinitialisez votre mot de passe — Caléonis Receptionist",
    email_change: "Confirmez le changement de votre adresse email — Caléonis Receptionist",
    existing_account: "Votre compte Caléonis Receptionist existe déjà",
  },
  en: {
    verification: "Verify your email address — Caléonis Receptionist",
    verification_code: "Your Caléonis Receptionist verification code",
    password_reset: "Reset your password — Caléonis Receptionist",
    email_change: "Confirm your email address change — Caléonis Receptionist",
    existing_account: "You already have a Caléonis Receptionist account",
  },
} as const;

export function authEmailSubject(purpose: keyof typeof subjects.en, locale?: string | null): string {
  return subjects[locale?.toLowerCase().split(/[-_]/)[0] === "fr" ? "fr" : "en"][purpose];
}
