import { AutoEntryTrade } from "@/lib/bot/autoEntryTypes";
import { openMultiLegTrade } from "@/lib/paperTrading";

export async function openAutoEntryTrade(trade: AutoEntryTrade) {
  return openMultiLegTrade({
    symbol: trade.symbol,
    strategy: "AUTO_ENTRY_VERTICAL",
    metadata: {
      source: "AUTO_ENTRY",
      tradeScore: trade.tradeScore,
      riskLevel: trade.riskLevel,
    },
    legs: trade.legs.map((leg) => ({
      symbol: trade.symbol,
      optionContract: { expiry: leg.expiration, strike: leg.strike, type: leg.type },
      quantity: leg.quantity,
      side: leg.action === "BUY" ? "BUY_TO_OPEN" : "SELL_TO_OPEN",
      strategy: "AUTO_ENTRY_VERTICAL",
    })),
  });
}
