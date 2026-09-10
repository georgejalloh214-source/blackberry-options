import { BotOutput } from "@/lib/bot/brain";
import { OptionQuote } from "@/types";

export type RecommendedLeg = {
  action: "BUY" | "SELL";
  type: "PUT" | "CALL";
  strike: number;
  expiration: string;
  premium: number;
  delta: number;
};

export function recommendContracts(
  chain: OptionQuote[],
  bot: BotOutput["inputs"] & { tradeScore: number },
  currentPrice: number
): RecommendedLeg[] {
  if (!chain.length || bot.tradeScore < 55) return [];

  const bullish = bot.priceTrendScore >= 55 && bot.flowScore >= 50;
  const bearish = bot.priceTrendScore < 45 && bot.flowScore < 50;
  if (!bullish && !bearish) return [];

  const expiry = [...new Set(chain.map((contract) => contract.expiry))].sort()[0];
  const type = bullish ? "PUT" : "CALL";
  const contracts = chain
    .filter((contract) => contract.expiry === expiry && contract.type === type)
    .sort((a, b) => a.strike - b.strike);
  if (contracts.length < 2) return [];

  if (bullish) {
    const short = [...contracts].reverse().find((contract) => contract.strike <= currentPrice) ?? contracts[Math.floor(contracts.length / 2)];
    const long = contracts.find((contract) => contract.strike < short.strike);
    if (!long) return [];
    return [leg("SELL", short), leg("BUY", long)];
  }

  const short = contracts.find((contract) => contract.strike >= currentPrice) ?? contracts[Math.floor(contracts.length / 2)];
  const long = contracts.find((contract) => contract.strike > short.strike);
  if (!long) return [];
  return [leg("SELL", short), leg("BUY", long)];
}

function leg(action: RecommendedLeg["action"], contract: OptionQuote): RecommendedLeg {
  return {
    action,
    type: contract.type,
    strike: contract.strike,
    expiration: contract.expiry,
    premium: action === "SELL" ? contract.bid : contract.ask,
    delta: contract.greeks.delta,
  };
}
