export type LlmUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export type LlmCost = {
  costUsd: number;
  costNanoUsd: number;
};

export type ModelPricing = {
  inputNanoUsdPerToken: number;
  cachedInputNanoUsdPerToken?: number;
  outputNanoUsdPerToken: number;
};

export const NANO_USD_PER_USD = 1_000_000_000;

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-5.5-pro": { inputNanoUsdPerToken: 30_000, outputNanoUsdPerToken: 180_000 },
  "gpt-5.5": {
    inputNanoUsdPerToken: 5_000,
    cachedInputNanoUsdPerToken: 500,
    outputNanoUsdPerToken: 30_000
  },
  "gpt-5.4-pro": { inputNanoUsdPerToken: 30_000, outputNanoUsdPerToken: 180_000 },
  "gpt-5.4-mini": {
    inputNanoUsdPerToken: 750,
    cachedInputNanoUsdPerToken: 75,
    outputNanoUsdPerToken: 4_500
  },
  "gpt-5.4-nano": {
    inputNanoUsdPerToken: 200,
    cachedInputNanoUsdPerToken: 20,
    outputNanoUsdPerToken: 1_250
  },
  "gpt-5.4": {
    inputNanoUsdPerToken: 2_500,
    cachedInputNanoUsdPerToken: 250,
    outputNanoUsdPerToken: 15_000
  },
  "gpt-5-pro": { inputNanoUsdPerToken: 15_000, outputNanoUsdPerToken: 120_000 },
  "gpt-5-mini": {
    inputNanoUsdPerToken: 250,
    cachedInputNanoUsdPerToken: 25,
    outputNanoUsdPerToken: 2_000
  },
  "gpt-5-nano": {
    inputNanoUsdPerToken: 50,
    cachedInputNanoUsdPerToken: 5,
    outputNanoUsdPerToken: 400
  },
  "gpt-5": {
    inputNanoUsdPerToken: 1_250,
    cachedInputNanoUsdPerToken: 125,
    outputNanoUsdPerToken: 10_000
  }
};

export function computeLlmCost(usage: LlmUsage, model: string): LlmCost | null {
  const pricing = findModelPricing(model);
  if (!pricing) return null;

  const inputTokens = safeTokenCount(usage.inputTokens);
  const cachedInputTokens = Math.min(safeTokenCount(usage.cachedInputTokens), inputTokens);
  const freshInputTokens = inputTokens - cachedInputTokens;
  const outputTokens = safeTokenCount(usage.outputTokens);
  const cachedInputPrice = pricing.cachedInputNanoUsdPerToken ?? pricing.inputNanoUsdPerToken;
  const costNanoUsd =
    freshInputTokens * pricing.inputNanoUsdPerToken +
    cachedInputTokens * cachedInputPrice +
    outputTokens * pricing.outputNanoUsdPerToken;

  return {
    costNanoUsd,
    costUsd: costNanoUsd / NANO_USD_PER_USD
  };
}

export function addLlmCosts(left: LlmCost | null, right: LlmCost | null): LlmCost | null {
  if (!left) return right;
  if (!right) return left;
  const costNanoUsd = left.costNanoUsd + right.costNanoUsd;
  return {
    costNanoUsd,
    costUsd: costNanoUsd / NANO_USD_PER_USD
  };
}

export function findModelPricing(model: string): ModelPricing | null {
  let bestKey: string | null = null;
  for (const key of Object.keys(MODEL_PRICING)) {
    if (model === key || model.startsWith(`${key}-`)) {
      if (bestKey === null || key.length > bestKey.length) bestKey = key;
    }
  }
  return bestKey ? MODEL_PRICING[bestKey] : null;
}

function safeTokenCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
