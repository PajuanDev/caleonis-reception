import type { BusinessContextSnapshot } from "@lobbystack/shared";

/** Website voice can be enabled independently of a PSTN phone number. */
export function isWebWidgetVoiceEnabled(snapshot: Pick<BusinessContextSnapshot, "contactChannels"> | null | undefined): boolean {
  return Boolean(snapshot && (
    snapshot.contactChannels?.phoneNumber
    || process.env.WEB_WIDGET_VOICE_WITHOUT_PHONE_ENABLED === "true"
  ));
}
