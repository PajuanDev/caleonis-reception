import { useEffect, useId, useRef } from "react"
import { Button } from "@/components/ui/button"

const copy = {
  fr: {
    title: "Avant de parler à l’assistant IA",
    description: "J’accepte que cet appel soit enregistré et transcrit pour répondre à ma demande et permettre son suivi par l’équipe de cette entreprise. OpenAI traite le son et les utilisateurs autorisés de l’espace peuvent accéder à l’enregistrement.",
    retention: "OpenAI rend les enregistrements stockés disponibles pendant 30 jours. Cet essai pilote est réservé aux informations fictives ; demandez la notice de l’entreprise avant tout usage avec des données réelles. Refuser n’active pas le micro. Raccrocher arrête l’échange ; contactez l’entreprise pour demander l’effacement ou exercer vos droits.",
    refuse: "Je refuse l’enregistrement",
    accept: "J’accepte et démarre l’appel",
    privacy: "Confidentialité et droits",
  },
  en: {
    title: "Before speaking to the AI assistant",
    description: "I agree to this call being recorded and transcribed to answer my request and let this business's team follow up. OpenAI processes the audio and authorized workspace users can access the recording.",
    retention: "OpenAI makes stored recordings available for 30 days. Use fictional information in this pilot; obtain the business's privacy notice before using real personal data. Refusing does not enable the microphone. Hanging up ends the conversation; contact the business to request deletion or exercise your rights.",
    refuse: "Refuse recording",
    accept: "I agree and start the call",
    privacy: "Privacy and your rights",
  },
} as const

export function RecordingConsentDialog({ open, onDecision, locale = "en" }: { open: boolean; onDecision: (accepted: boolean) => void; locale?: "en" | "fr" }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])
  const text = copy[locale]
  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); onDecision(false) }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-background p-6 text-left text-foreground shadow-lg backdrop:bg-black/60">
    <div className="space-y-4">
      <h2 id={titleId} className="text-lg font-semibold">{text.title}</h2>
      <p id={descriptionId} className="text-sm leading-6">{text.description}</p>
      <p className="text-xs leading-5 text-muted-foreground">{text.retention}</p>
      <a href={locale === "fr" ? "/fr/privacy/" : "/privacy/"} target="_blank" rel="noopener noreferrer" className="text-sm underline">{text.privacy}</a>
      <div className="flex flex-col gap-2">
        <Button className="h-auto min-h-9 whitespace-normal py-2" type="button" variant="outline" onClick={() => onDecision(false)}>{text.refuse}</Button>
        <Button className="h-auto min-h-9 whitespace-normal py-2" type="button" onClick={() => onDecision(true)}>{text.accept}</Button>
      </div>
    </div>
  </dialog>
}
