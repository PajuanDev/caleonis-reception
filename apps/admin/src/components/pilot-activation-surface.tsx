"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ReplacementOnboardingShell } from "./replacement-onboarding-shell";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { resolveLocale } from "@/lib/locale";
import { localizePublicPath } from "@/lib/locale-path";
import { meetsPasswordRequirements } from "@/lib/password-policy";
import { localizeMarketingHref } from "@/lib/marketing-site-url";

export function PilotActivationSurface({ token }: { token: string }) {
  const { t, i18n } = useTranslation("auth");
  const locale = resolveLocale(i18n.resolvedLanguage, i18n.language);
  const [invitation, setInvitation] = useState<{ businessName: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/pilot/activate", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "preview", token }), signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ invitation: typeof invitation }> : { invitation: null })
      .then(result => { if (!controller.signal.aborted) setInvitation(result.invitation); })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation || !meetsPasswordRequirements(password) || password !== confirmation) return;
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/pilot/activate", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "activate", token, password }) });
      if (!response.ok) throw new Error("activation_failed");
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch { setError(true); } finally { setSubmitting(false); }
  }

  const description = loading ? t("acceptInvite.loading") : complete ? t("pilotActivation.success") : invitation ? t("acceptInvite.subtitle", invitation) : t("acceptInvite.invalidLink");
  return <div className="ph-no-capture"><ReplacementOnboardingShell title={t("pilotActivation.title")} description={description} progress={null} width="sm">
    <div className="flex flex-col gap-6">
      {invitation && !complete ? <form className="flex flex-col gap-4" onSubmit={activate}>
        <div className="flex flex-col gap-2"><Label htmlFor="pilot-password">{t("signup.password")}</Label><Input id="pilot-password" type="password" autoComplete="new-password" maxLength={256} value={password} onChange={event => setPassword(event.target.value)} required /><p className="text-sm text-muted-foreground">{t("signup.passwordHint")}</p></div>
        <div className="flex flex-col gap-2"><Label htmlFor="pilot-confirmation">{t("pilotActivation.confirmPassword")}</Label><Input id="pilot-confirmation" type="password" autoComplete="new-password" maxLength={256} value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></div>
        <p className="text-sm text-muted-foreground">{t("signup.legal.prefix")} <a className="underline" href={localizeMarketingHref(locale, "/terms")} rel="noreferrer" target="_blank">{t("signup.legal.terms")}</a> {t("signup.legal.and")} <a className="underline" href={localizeMarketingHref(locale, "/privacy")} rel="noreferrer" target="_blank">{t("signup.legal.privacy")}</a>{t("signup.legal.suffix")}</p>
        {error ? <p role="alert" className="text-sm text-destructive">{t("pilotActivation.failed")}</p> : null}
        <Button type="submit" className="h-11 w-full" loading={submitting} loadingLabel={t("pilotActivation.submitting")} disabled={submitting || !meetsPasswordRequirements(password) || password !== confirmation}>{t("pilotActivation.submit")}</Button>
      </form> : null}
      <Link className="text-center font-medium underline-offset-4 hover:underline" href={localizePublicPath("/login", locale)}>{t("acceptInvite.backToLogin")}</Link>
    </div>
  </ReplacementOnboardingShell></div>;
}
