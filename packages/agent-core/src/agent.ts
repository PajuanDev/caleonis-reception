import { stepCountIs, ToolLoopAgent, type LanguageModel, type ToolSet } from "ai";

import { buildAgentInstructions } from "./instructions";
import { createReceptionistTools, type AgentToolContext } from "./tools";
import { voiceBookingReply } from "./voiceBookingReply";

export type ReceptionistAgent = ToolLoopAgent<never, ToolSet>;

export function createReceptionistAgent(input: { model: LanguageModel; context: AgentToolContext; extraInstructions?: string }): ReceptionistAgent {
  return new ToolLoopAgent({
    model: input.model,
    instructions: [buildAgentInstructions(input.context.snapshot, input.context.channel, { intakeOnly: input.context.intakeOnly ?? false }), input.extraInstructions].filter(Boolean).join("\n\n"),
    tools: createReceptionistTools(input.context),
    // One lookup, maybe a second, then the answer. Voice callers are waiting.
    stopWhen: input.context.channel === "voice" && input.context.directVoiceReplies
      ? [stepCountIs(4), ({ steps }) => voiceBookingReply(steps, input.context.snapshot.timezone) !== undefined]
      : stepCountIs(4),
  });
}
