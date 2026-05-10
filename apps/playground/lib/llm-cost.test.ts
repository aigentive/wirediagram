import { describe, expect, it } from "vitest";
import { computeLlmCost, findModelPricing, isSupportedLlmModel } from "./llm-cost";

describe("computeLlmCost", () => {
  it("uses exact gpt-5.4-mini standard rates with cached input discounts", () => {
    const cost = computeLlmCost(
      {
        inputTokens: 1_000,
        cachedInputTokens: 200,
        outputTokens: 50,
        reasoningTokens: 0,
        totalTokens: 1_050
      },
      "gpt-5.4-mini"
    );

    expect(cost).toEqual({
      costNanoUsd: 840_000,
      costUsd: 0.00084
    });
  });

  it("caps cached tokens at total input tokens", () => {
    const cost = computeLlmCost(
      {
        inputTokens: 100,
        cachedInputTokens: 500,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 100
      },
      "gpt-5.4-mini"
    );

    expect(cost?.costNanoUsd).toBe(7_500);
  });

  it("matches dated snapshots against the longest configured model prefix", () => {
    expect(findModelPricing("gpt-5.4-mini-2026-03-17")).toEqual(
      findModelPricing("gpt-5.4-mini")
    );
    expect(findModelPricing("gpt-5.4-pro-2026-03-05")).toEqual(
      findModelPricing("gpt-5.4-pro")
    );
  });

  it("restricts user-selectable models to configured pricing ids", () => {
    expect(isSupportedLlmModel("gpt-5.4-mini")).toBe(true);
    expect(isSupportedLlmModel("gpt-5.4-mini-2026-03-17")).toBe(false);
    expect(isSupportedLlmModel("unknown")).toBe(false);
  });
});
