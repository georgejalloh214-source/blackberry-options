import { FlowItem, OptionQuote, PaperPosition, StockQuote } from "@/types";
import { BotInputs } from "@/lib/bot/brain";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function computeTrendScore(quote: StockQuote): number {
  return clamp(50 + quote.changePct * 8);
}

export function computeFlowScore(flow: FlowItem[]): number {
  const bullish = flow.filter((item) => item.sentiment === "BULLISH").reduce((sum, item) => sum + item.premium, 0);
  const bearish = flow.filter((item) => item.sentiment === "BEARISH").reduce((sum, item) => sum + item.premium, 0);
  const total = bullish + bearish;
  if (!total) return 50;
  return clamp(50 + ((bullish - bearish) / total) * 50);
}

export function computeIVScore(chain: OptionQuote[]): number {
  if (!chain.length) return 50;
  const averagePercentile = chain.reduce((sum, contract) => sum + contract.ivPercentile, 0) / chain.length;
  return clamp(100 - averagePercentile);
}

export function computeGreeksScore(chain: OptionQuote[]): number {
  if (!chain.length) return 50;
  const averageDelta = chain.reduce((sum, contract) => sum + Math.abs(contract.greeks.delta), 0) / chain.length;
  const averageTheta = chain.reduce((sum, contract) => sum + Math.abs(contract.greeks.theta), 0) / chain.length;
  const averageGamma = chain.reduce((sum, contract) => sum + contract.greeks.gamma, 0) / chain.length;
  const deltaQuality = 100 - Math.min(100, Math.abs(averageDelta - 0.5) * 200);
  const thetaQuality = 100 - Math.min(100, averageTheta * 20);
  const gammaQuality = clamp(50 + averageGamma * 1_000);
  return clamp(deltaQuality * 0.45 + thetaQuality * 0.35 + gammaQuality * 0.2);
}

export function computeRiskScore(positions: PaperPosition[]): number {
  if (!positions.length) return 80;
  const averageAssignmentRisk = positions.reduce((sum, position) => sum + position.assignmentRiskScore, 0) / positions.length;
  return clamp(100 - averageAssignmentRisk);
}

export function computeBotInputs(quote: StockQuote, chain: OptionQuote[], flow: FlowItem[], positions: PaperPosition[]): BotInputs {
  return {
    priceTrendScore: computeTrendScore(quote),
    flowScore: computeFlowScore(flow),
    ivScore: computeIVScore(chain),
    greeksScore: computeGreeksScore(chain),
    riskScore: computeRiskScore(positions),
  };
}
