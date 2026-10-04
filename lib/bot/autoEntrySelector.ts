import { AUTO_ENTRY_CONFIG } from "@/lib/bot/autoEntryConfig";
import { AutoEntryTrade } from "@/lib/bot/autoEntryTypes";

export function selectTopStrategies(trades: AutoEntryTrade[]): AutoEntryTrade[] {
  return [...trades]
    .sort((a, b) => b.tradeScore - a.tradeScore || b.riskLevel - a.riskLevel)
    .slice(0, AUTO_ENTRY_CONFIG.maxStrategiesPerDay);
}
