const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'gpt-4o': { inputPer1M: 5.0, outputPer1M: 15.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
}

const DEFAULT_PRICING = { inputPer1M: 5.0, outputPer1M: 15.0 }

export const calculateCostUsd = (model: string, tokensInput: number, tokensOutput: number): number => {
  const pricing = PRICING[model] ?? DEFAULT_PRICING
  const inputCost = (tokensInput / 1_000_000) * pricing.inputPer1M
  const outputCost = (tokensOutput / 1_000_000) * pricing.outputPer1M
  return inputCost + outputCost
}

export const usdToBrl = (usd: number, rate = 5.0): number => {
  return Math.round(usd * rate * 100) / 100
}
