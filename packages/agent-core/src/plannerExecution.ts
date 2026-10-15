import type { StepResult, ToolSet } from "ai";

export type PlannerRequestedEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type PlannerActualTier = "default" | "fast" | "priority" | "flex" | "auto";
type Observation = Pick<StepResult<ToolSet>, "performance" | "usage" | "providerMetadata">;
type Usage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; cachedInputTokens: number | null; reasoningTokens: number | null };
export type PlannerExecution = Usage & {
  modelSteps: number;
  modelMs: number | null;
  toolMs: number | null;
  requestedEffort: PlannerRequestedEffort | null;
  estimatedCostUsd: null;
  steps: Array<Usage & { modelMs: number | null; toolMs: number | null; actualTier: PlannerActualTier | null }>;
};

const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER ? value : null;
const tokens = (value: unknown): number | null => Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
function sum(values: Array<number | null>): number | null {
  if (values.some(value => value === null)) return null;
  return finite(values.reduce<number>((total, value) => total + value!, 0));
}

/** Copies only numeric SDK observations and whitelisted enums. Missing timings
 * stay unknown. Logical steps do not count transport retries; tool times may
 * overlap. No provider IDs, text, prompts, inputs or results are retained. */
export function describePlannerExecution(observations: ReadonlyArray<Observation>, requestedEffort: unknown): PlannerExecution {
  const requested = typeof requestedEffort === "string" && ["none", "minimal", "low", "medium", "high", "xhigh"].includes(requestedEffort) ? requestedEffort as PlannerRequestedEffort : null;
  const steps = observations.map(step => {
    const rawTier = step.providerMetadata?.openai?.serviceTier;
    const actualTier = typeof rawTier === "string" && ["default", "fast", "priority", "flex", "auto"].includes(rawTier) ? rawTier as PlannerActualTier : null;
    const execution = step.performance?.toolExecutionMs;
    return {
      modelMs: finite(step.performance?.responseTimeMs),
      toolMs: execution && typeof execution === "object" ? sum(Object.values(execution).map(finite)) : null,
      actualTier,
      inputTokens: tokens(step.usage?.inputTokens),
      outputTokens: tokens(step.usage?.outputTokens),
      totalTokens: tokens(step.usage?.totalTokens),
      cachedInputTokens: tokens(step.usage?.inputTokenDetails?.cacheReadTokens),
      reasoningTokens: tokens(step.usage?.outputTokenDetails?.reasoningTokens),
    };
  });
  return {
    modelSteps: steps.length,
    requestedEffort: requested,
    modelMs: steps.length ? sum(steps.map(step => step.modelMs)) : null,
    toolMs: steps.length ? sum(steps.map(step => step.toolMs)) : null,
    inputTokens: steps.length ? sum(steps.map(step => step.inputTokens)) : null,
    outputTokens: steps.length ? sum(steps.map(step => step.outputTokens)) : null,
    totalTokens: steps.length ? sum(steps.map(step => step.totalTokens)) : null,
    cachedInputTokens: steps.length ? sum(steps.map(step => step.cachedInputTokens)) : null,
    reasoningTokens: steps.length ? sum(steps.map(step => step.reasoningTokens)) : null,
    // An observed/requested tier is not an invoice or a qualified price table.
    estimatedCostUsd: null,
    steps,
  };
}
