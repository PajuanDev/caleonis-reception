import { stepCountIs, ToolLoopAgent, type LanguageModel, type ToolSet } from "ai";

import { buildAgentInstructions } from "./instructions";
import { createReceptionistTools, type AgentToolContext } from "./tools";

export type ReceptionistAgent = ToolLoopAgent<never, ToolSet>;

export function createReceptionistAgent(input: { model: LanguageModel; context: AgentToolContext; extraInstructions?: string; voicePlannerReasoningEffort?: "medium" }): ReceptionistAgent {
  return new ToolLoopAgent({
    model: input.model,
    instructions: [buildAgentInstructions(input.context.snapshot, input.context.channel, { intakeOnly: input.context.intakeOnly ?? false }), input.extraInstructions].filter(Boolean).join("\n\n"),
    tools: createReceptionistTools(input.context),
    // Server-only, per-call opt-in. The shared model's high/store:false defaults
    // are merged by its middleware; never accept arbitrary provider options.
    ...(input.context.channel === "voice" && !input.context.intakeOnly && input.voicePlannerReasoningEffort === "medium"
      ? { providerOptions: { openai: { reasoningEffort: "medium" } } }
      : {}),
    // One lookup, maybe a second, then the answer. Voice callers are waiting.
    stopWhen: stepCountIs(4),
  });
}
