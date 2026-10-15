import { describe, expect, it } from "vitest";

import { describePlannerExecution } from "./plannerExecution";

function observation(overrides: Record<string, unknown> = {}) {
  return {
    performance: { responseTimeMs: 120.5, toolExecutionMs: { availability: 21.25, booking: 10.5 } },
    usage: { inputTokens: 120, outputTokens: 30, totalTokens: 150,
      inputTokenDetails: { cacheReadTokens: 40 }, outputTokenDetails: { reasoningTokens: 10 } },
    providerMetadata: { openai: { serviceTier: "default" } },
    ...overrides,
  } as never;
}

const unknownUsage = { inputTokens: null, outputTokens: null, totalTokens: null, cachedInputTokens: null, reasoningTokens: null };

describe("describePlannerExecution", () => {
  it("copies the valid SDK numbers and whitelisted tier without pricing them", () => {
    expect(describePlannerExecution([observation()], "high")).toEqual({
      modelSteps: 1, requestedEffort: "high", modelMs: 120.5, toolMs: 31.75,
      inputTokens: 120, outputTokens: 30, totalTokens: 150, cachedInputTokens: 40, reasoningTokens: 10,
      estimatedCostUsd: null,
      steps: [{ modelMs: 120.5, toolMs: 31.75, actualTier: "default",
        inputTokens: 120, outputTokens: 30, totalTokens: 150, cachedInputTokens: 40, reasoningTokens: 10 }],
    });
  });

  it("aggregates each observed field across logical model steps", () => {
    const second = observation({
      performance: { responseTimeMs: 30.25, toolExecutionMs: { first: 3.5, second: 4.25 } },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15,
        inputTokenDetails: { cacheReadTokens: 0 }, outputTokenDetails: { reasoningTokens: 0 } },
      providerMetadata: { openai: { serviceTier: "priority" } },
    });
    const result = describePlannerExecution([observation(), second], "medium");
    expect(result).toMatchObject({ modelSteps: 2, requestedEffort: "medium", modelMs: 150.75, toolMs: 39.5,
      inputTokens: 130, outputTokens: 35, totalTokens: 165, cachedInputTokens: 40, reasoningTokens: 10, estimatedCostUsd: null });
    expect(result.steps.map(step => step.actualTier)).toEqual(["default", "priority"]);
    expect(result.steps.map(step => step.modelMs)).toEqual([120.5, 30.25]);
  });

  it.each(["none", "minimal", "low", "medium", "high", "xhigh"])("accepts requested effort %j", requestedEffort => {
    expect(describePlannerExecution([observation()], requestedEffort).requestedEffort).toBe(requestedEffort);
  });

  it.each(["default", "fast", "priority", "flex", "auto"])("accepts actual SDK service tier %j", serviceTier => {
    const result = describePlannerExecution([observation({ providerMetadata: { openai: { serviceTier } } })], "high");
    expect(result.steps[0]?.actualTier).toBe(serviceTier);
    expect(result.estimatedCostUsd).toBeNull();
  });

  it.each([undefined, null, "", "unknown", "Default", "priority ", "scale", 1, true, ["default"], { serviceTier: "default" }])(
    "keeps absent or unrecognized service tier %j unknown", serviceTier => {
      const result = describePlannerExecution([observation({ providerMetadata: { openai: { serviceTier } } })], "high");
      expect(result.steps[0]?.actualTier).toBeNull();
    },
  );

  it.each([undefined, null, {}, { anotherProvider: { serviceTier: "priority" } }, { openai: {} }])(
    "does not infer a tier from missing or unrelated metadata %j", providerMetadata => {
      expect(describePlannerExecution([observation({ providerMetadata })], "high").steps[0]?.actualTier).toBeNull();
    },
  );

  it.each([undefined, null, "", "High", "high ", "invalid", 1, true, ["high"],
    { toString: () => "high", secret: "PRIVATE_REQUESTED_EFFORT" }, new String("high")])(
    "requires an exact string effort without coercing %j", requestedEffort => {
      const result = describePlannerExecution([observation()], requestedEffort);
      expect(result.requestedEffort).toBeNull();
      expect(JSON.stringify(result)).not.toContain("PRIVATE_REQUESTED_EFFORT");
    },
  );

  it("keeps all measurements unknown when no model step was observed", () => {
    expect(describePlannerExecution([], "high")).toEqual({
      modelSteps: 0, requestedEffort: "high", modelMs: null, toolMs: null,
      ...unknownUsage, estimatedCostUsd: null, steps: [],
    });
  });

  it("does not turn missing performance or usage into zero", () => {
    expect(describePlannerExecution([observation({ performance: undefined, usage: undefined, providerMetadata: undefined })], "high"))
      .toEqual({ modelSteps: 1, requestedEffort: "high", modelMs: null, toolMs: null,
        ...unknownUsage, estimatedCostUsd: null,
        steps: [{ modelMs: null, toolMs: null, actualTier: null, ...unknownUsage }] });
  });

  it("propagates an unknown step measurement rather than reporting a partial sum", () => {
    const result = describePlannerExecution([observation(), observation({ performance: {}, usage: {} })], "high");
    expect(result).toMatchObject({ modelSteps: 2, modelMs: null, toolMs: null, ...unknownUsage });
    expect(result.steps[0]).toMatchObject({ modelMs: 120.5, inputTokens: 120 });
    expect(result.steps[1]).toMatchObject({ modelMs: null, toolMs: null, ...unknownUsage });
  });

  it("keeps missing detailed token counters unknown independently of totals", () => {
    const result = describePlannerExecution([observation({ usage: { inputTokens: 120, outputTokens: 30, totalTokens: 150 } })], "high");
    expect(result).toMatchObject({ inputTokens: 120, outputTokens: 30, totalTokens: 150, cachedInputTokens: null, reasoningTokens: null });
    expect(result.steps[0]).toMatchObject({ inputTokens: 120, outputTokens: 30, totalTokens: 150, cachedInputTokens: null, reasoningTokens: null });
  });

  it("does not derive a missing total token count from input and output", () => {
    const result = describePlannerExecution([observation({ usage: { inputTokens: 120, outputTokens: 30 } })], "high");
    expect(result.totalTokens).toBeNull();
    expect(result.steps[0]?.totalTokens).toBeNull();
  });

  it("retains explicit numeric zeros, including a measured empty tool map", () => {
    const result = describePlannerExecution([observation({
      performance: { responseTimeMs: 0, toolExecutionMs: {} },
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0,
        inputTokenDetails: { cacheReadTokens: 0 }, outputTokenDetails: { reasoningTokens: 0 } },
    })], "high");
    expect(result).toMatchObject({ modelMs: 0, toolMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0, reasoningTokens: 0 });
    expect(result.steps[0]).toMatchObject({ modelMs: 0, toolMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0, reasoningTokens: 0 });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, "120", undefined, null, {}])(
    "rejects invalid duration and token measurements %j", value => {
      const result = describePlannerExecution([observation({
        performance: { responseTimeMs: value, toolExecutionMs: { first: 2, invalid: value } },
        usage: { inputTokens: value, outputTokens: value, totalTokens: value,
          inputTokenDetails: { cacheReadTokens: value }, outputTokenDetails: { reasoningTokens: value } },
      })], "high");
      expect(result).toMatchObject({ modelMs: null, toolMs: null, ...unknownUsage });
      expect(result.steps[0]).toMatchObject({ modelMs: null, toolMs: null, ...unknownUsage });
    },
  );

  it("accepts fractional durations while rejecting fractional token counters", () => {
    const result = describePlannerExecution([observation({
      performance: { responseTimeMs: 1.5, toolExecutionMs: { first: 0.25, second: 0.5 } },
      usage: { inputTokens: 1.5, outputTokens: 1.5, totalTokens: 1.5,
        inputTokenDetails: { cacheReadTokens: 1.5 }, outputTokenDetails: { reasoningTokens: 1.5 } },
    })], "high");
    expect(result).toMatchObject({ modelMs: 1.5, toolMs: 0.75, ...unknownUsage });
  });

  it("rejects unsafe aggregate sums without discarding each valid step", () => {
    const usage = (value: number) => ({ inputTokens: value, outputTokens: value, totalTokens: value,
      inputTokenDetails: { cacheReadTokens: value }, outputTokenDetails: { reasoningTokens: value } });
    const result = describePlannerExecution([
      observation({ performance: { responseTimeMs: Number.MAX_SAFE_INTEGER, toolExecutionMs: { first: Number.MAX_SAFE_INTEGER } }, usage: usage(Number.MAX_SAFE_INTEGER) }),
      observation({ performance: { responseTimeMs: 1, toolExecutionMs: { second: 1 } }, usage: usage(1) }),
    ], "high");
    expect(result).toMatchObject({ modelMs: null, toolMs: null, ...unknownUsage });
    expect(result.steps[0]).toMatchObject({ modelMs: Number.MAX_SAFE_INTEGER, toolMs: Number.MAX_SAFE_INTEGER, inputTokens: Number.MAX_SAFE_INTEGER });
    expect(result.steps[1]).toMatchObject({ modelMs: 1, toolMs: 1, inputTokens: 1 });
  });

  it("rejects an unsafe sum inside one step's tool timings", () => {
    const result = describePlannerExecution([observation({
      performance: { responseTimeMs: 1, toolExecutionMs: { first: Number.MAX_SAFE_INTEGER, second: 1 } },
    })], "high");
    expect(result.toolMs).toBeNull();
    expect(result.steps[0]?.toolMs).toBeNull();
    expect(result.modelMs).toBe(1);
  });

  it("returns only numeric fields and enum values, never source metadata or tool names", () => {
    const result = describePlannerExecution([observation({
      text: "PRIVATE_TEXT", response: { id: "PRIVATE_RESPONSE_ID" },
      toolCalls: [{ toolName: "PRIVATE_TOOL_NAME", input: { phone: "PRIVATE_INPUT" } }],
      toolResults: [{ output: "PRIVATE_TOOL_RESULT" }],
      performance: { responseTimeMs: 2, toolExecutionMs: { PRIVATE_TOOL_KEY: 3 }, PRIVATE_PERFORMANCE: "PRIVATE_TIMING_TEXT" },
      providerMetadata: { openai: { serviceTier: "priority", responseId: "PRIVATE_PROVIDER_ID", costUsd: 42, request: "PRIVATE_REQUEST" },
        PRIVATE_PROVIDER_KEY: { value: "PRIVATE_PROVIDER_VALUE" } },
      usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3, costUsd: 42,
        inputTokenDetails: { cacheReadTokens: 0 }, outputTokenDetails: { reasoningTokens: 0 }, PRIVATE_USAGE_KEY: "PRIVATE_USAGE_TEXT" },
    })], "medium");
    expect(Object.keys(result).sort()).toEqual(["modelSteps", "requestedEffort", "modelMs", "toolMs", "inputTokens", "outputTokens",
      "totalTokens", "cachedInputTokens", "reasoningTokens", "estimatedCostUsd", "steps"].sort());
    expect(Object.keys(result.steps[0] ?? {}).sort()).toEqual(["modelMs", "toolMs", "actualTier", "inputTokens", "outputTokens",
      "totalTokens", "cachedInputTokens", "reasoningTokens"].sort());
    expect(JSON.stringify(result)).not.toContain("PRIVATE_");
    expect(JSON.stringify(result)).not.toContain("providerMetadata");
    expect(result.estimatedCostUsd).toBeNull();
    expect(result).toMatchObject({ modelMs: 2, toolMs: 3, inputTokens: 2, outputTokens: 1, totalTokens: 3,
      steps: [{ modelMs: 2, toolMs: 3, actualTier: "priority" }] });
  });
});
