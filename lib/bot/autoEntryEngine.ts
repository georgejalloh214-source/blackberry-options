import { AUTO_ENTRY_CONFIG } from "@/lib/bot/autoEntryConfig";
import { AutoEntryLeg, AutoEntryTrade } from "@/lib/bot/autoEntryTypes";

export function buildAutoEntryTrade(
  symbol: string,
  recommendedLegs: AutoEntryLeg[],
  bot: { tradeScore: number; riskScore: number }
): AutoEntryTrade | null {
  const riskLevel = bot.riskScore;
  if (bot.tradeScore < AUTO_ENTRY_CONFIG.minTradeScore || riskLevel < AUTO_ENTRY_CONFIG.maxRiskLevel) return null;
  if (!recommendedLegs.length) return null;

  return {
    symbol: symbol.toUpperCase(),
    legs: recommendedLegs,
    tradeScore: bot.tradeScore,
    riskLevel,
    source: "AUTO_ENTRY",
  };
}
