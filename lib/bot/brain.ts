export type BotInputs = {
  priceTrendScore: number;
  flowScore: number;
  ivScore: number;
  greeksScore: number;
  riskScore: number;
};

export type BotOutput = {
  tradeScore: number;
  quality: "high" | "medium" | "low" | "bad";
  recommendedStrategy: string;
  inputs: BotInputs;
};

function clamp(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function computeTradeScore(inputs: BotInputs): BotOutput {
  const normalized = {
    priceTrendScore: clamp(inputs.priceTrendScore),
    flowScore: clamp(inputs.flowScore),
    ivScore: clamp(inputs.ivScore),
    greeksScore: clamp(inputs.greeksScore),
    riskScore: clamp(inputs.riskScore),
  };
  const tradeScore =
    0.3 * normalized.priceTrendScore +
    0.25 * normalized.flowScore +
    0.15 * normalized.ivScore +
    0.2 * normalized.greeksScore +
    0.1 * normalized.riskScore;

  const quality = tradeScore >= 80 ? "high" : tradeScore >= 60 ? "medium" : tradeScore >= 40 ? "low" : "bad";
  return {
    tradeScore: Math.round(tradeScore),
    quality,
    recommendedStrategy: pickStrategy(normalized),
    inputs: normalized,
  };
}

function pickStrategy(scores: BotInputs): string {
  const bullish = scores.priceTrendScore > 60 && scores.flowScore > 60;
  const bearish = scores.priceTrendScore < 40 && scores.flowScore < 40;
  const highIV = scores.ivScore > 60;
  const lowIV = scores.ivScore < 40;

  if (scores.riskScore < 40) return "Reduce size or skip trade";
  if (bullish && highIV) return "Bullish credit spread";
  if (bullish && lowIV) return "Call debit spread";
  if (bearish && highIV) return "Bearish credit spread";
  if (bearish && lowIV) return "Put debit spread";
  return "Neutral spread or wait for clearer signal";
}
