const PILOT_BUSINESS_ID = "8bceb812-e851-433d-90a8-7f4e467cd32c";
const OPENAI_GLOBAL_BASE_URL = "https://api.openai.com/v1";
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;

type VoicePlannerPolicyInput = {
  businessId: string;
  channel: string;
  intakeOnly?: boolean;
  model: { provider: string; modelId: string };
  environment?: Record<string, string | undefined>;
};

function normalizedBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/** Attribution only for the known Responses reasoning model and destination.
 * A compatible provider or unsupported model is unknown, never assumed high. */
export function knownVoicePlannerEffort(model: VoicePlannerPolicyInput["model"], environment: Record<string, string | undefined> = process.env): typeof REASONING_EFFORTS[number] | undefined {
  if (model.provider !== "openai.responses" || model.modelId !== "gpt-6-luna") return undefined;
  if (normalizedBaseUrl(environment.AI_CHAT_BASE_URL?.trim() || OPENAI_GLOBAL_BASE_URL) !== OPENAI_GLOBAL_BASE_URL) return undefined;
  if (environment.OPENAI_BASE_URL?.trim() && normalizedBaseUrl(environment.OPENAI_BASE_URL) !== OPENAI_GLOBAL_BASE_URL) return undefined;
  const value = environment.AI_CHAT_REASONING_EFFORT?.trim();
  return (REASONING_EFFORTS as readonly string[]).includes(value ?? "") ? value as typeof REASONING_EFFORTS[number] : "high";
}

/** Opt in only the existing personal PSTN pilot on its exact baseline model. */
export function voicePlannerMediumEnabled({ businessId, channel, intakeOnly, model, environment = process.env }: VoicePlannerPolicyInput): boolean {
  if (environment.VOICE_PLANNER_MEDIUM_BUSINESS_ID !== PILOT_BUSINESS_ID || businessId !== PILOT_BUSINESS_ID) return false;
  if (channel !== "voice" || intakeOnly) return false;
  if (model.provider !== "openai.responses" || model.modelId !== "gpt-6-luna") return false;
  if ((environment.AI_CHAT_MODEL?.trim() || "gpt-6-luna") !== "gpt-6-luna") return false;
  if ((environment.AI_CHAT_PROVIDER_NAME?.trim() || "openai") !== "openai") return false;
  if ((environment.AI_CHAT_REASONING_EFFORT?.trim() || "high") !== "high") return false;
  if (normalizedBaseUrl(environment.AI_CHAT_BASE_URL?.trim() || OPENAI_GLOBAL_BASE_URL) !== OPENAI_GLOBAL_BASE_URL) return false;
  // The SDK can inherit this separate base URL even when AI_CHAT_BASE_URL selects OpenAI.
  const ambientBaseUrl = environment.OPENAI_BASE_URL?.trim();
  return !ambientBaseUrl || normalizedBaseUrl(ambientBaseUrl) === OPENAI_GLOBAL_BASE_URL;
}
