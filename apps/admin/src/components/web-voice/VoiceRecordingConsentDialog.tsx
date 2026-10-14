"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function VoiceRecordingConsentDialog({ open, onDecision, chatAvailable = false }: { open: boolean; onDecision: (accepted: boolean) => void; chatAvailable?: boolean }) {
  const { t } = useTranslation("common");
  return <AlertDialog open={open} onOpenChange={(next) => { if (!next) onDecision(false); }}>
    <AlertDialogContent className="min-w-0 max-h-[calc(100svh-2rem)] overflow-y-auto rounded-xl">
      <AlertDialogHeader className="min-w-0">
        <AlertDialogTitle>{t("testCall.recordingConsent.title")}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{t("testCall.recordingConsent.description")}</AlertDialogDescription>
      </AlertDialogHeader>
      <p className="text-xs leading-5 text-muted-foreground">{t("testCall.recordingConsent.retention")}</p>
      <AlertDialogFooter className="min-w-0 sm:flex-col-reverse sm:items-stretch">
        <Button className="h-auto min-h-9 whitespace-normal py-2" type="button" variant="outline" onClick={() => onDecision(false)}>{t(chatAvailable ? "testCall.recordingConsent.refuseChat" : "testCall.recordingConsent.refuse")}</Button>
        <Button className="h-auto min-h-9 whitespace-normal py-2" type="button" onClick={() => onDecision(true)}>{t("testCall.recordingConsent.accept")}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
