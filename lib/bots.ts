import { getProvider } from "@/lib/marketData";
import { EntryTimingResult, OptionContractRef } from "@/types";

/**
 * Bot adapter. The Python bots (MarketTrend, EntrySignals, WhaleHunter,
 * RiskManager) live in their OWN repo and expose an HTTP API. This adapter
 * calls BOT_API_URL when configured; otherwise it falls back to a mock that
 * derives sensible signals from delayed market data so the UI works today.
 * No Python logic is ever ported into this repo.
 */
export async function getEntryTiming(
  symbol: string,
  contract: OptionContractRef
): Promise<EntryTimingResult> {
  const botUrl = process.env.BOT_API_URL;
  if (botUrl) {
    try {
      const res = await fetch(`${botUrl}/entry-timing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, optionContract: contract }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = (await res.json()) as Omit<EntryTimingResult, "botStatus">;
        return { ...json, botStatus: "LIVE" };
      }
    } catch {
      // fall through to safe default — never fabricate a live signal
    }
    return {
      signal: "WAIT",
      reasons: ["Bot signals unavailable — bot API unreachable. Defaulting to WAIT."],
      riskScore: 50,
      botStatus: "MOCK",
    };
  }
  return mockEntryTiming(symbol, contract);
}

async function mockEntryTiming(
  symbol: string,
  contract: OptionContractRef
): Promise<EntryTimingResult> {
  const provider = getProvider();
  const [quote, chain] = await Promise.all([
    provider.getQuote(symbol),
    provider.getOptionsChain(symbol),
  ]);
  const flow = await provider.getFlow(symbol);

  const reasons: string[] = [];
  let favorable = 0;
  let unfavorable = 0;

  // MarketTrend proxy — day change + position vs support/resistance
  if (quote.changePct > 0.3) {
    favorable++;
    reasons.push(`MarketTrend: ${symbol} up ${quote.changePct.toFixed(2)}% — short-term trend supportive.`);
  } else if (quote.changePct < -1.5) {
    unfavorable++;
    reasons.push(`MarketTrend: ${symbol} down ${quote.changePct.toFixed(2)}% — trend risk elevated.`);
  } else {
    reasons.push(`MarketTrend: ${symbol} flat (${quote.changePct.toFixed(2)}%) — no strong trend edge.`);
  }

  // EntrySignals proxy — distance from support
  const supportCushion = (quote.price - quote.supportLevel) / quote.price;
  if (supportCushion > 0.02) {
    favorable++;
    reasons.push(`EntrySignals: price holds ${(supportCushion * 100).toFixed(1)}% above support ($${quote.supportLevel}).`);
  } else {
    unfavorable++;
    reasons.push(`EntrySignals: price hugging support ($${quote.supportLevel}) — breakdown risk.`);
  }

  // WhaleHunter proxy — flow sentiment
  const bull = flow.filter((f) => f.sentiment === "BULLISH").length;
  const bear = flow.filter((f) => f.sentiment === "BEARISH").length;
  if (contract.type === "PUT" ? bull >= bear : bear >= bull) {
    favorable++;
    reasons.push(`WhaleHunter: options flow leans ${bull >= bear ? "bullish" : "bearish"} (${bull}B/${bear}S) — favorable for this ${contract.type.toLowerCase()} strategy.`);
  } else {
    unfavorable++;
    reasons.push(`WhaleHunter: flow leans against the position (${bull} bullish / ${bear} bearish prints).`);
  }

  // RiskManager proxy — contract-level risk
  const target = chain.find(
    (c) => c.expiry === contract.expiry && c.strike === contract.strike && c.type === contract.type
  );
  let riskScore = 50;
  if (target) {
    const absDelta = Math.abs(target.greeks.delta);
    riskScore = Math.round(Math.min(100, absDelta * 160 + (target.iv > 0.6 ? 20 : 0)));
    if (absDelta <= 0.35) {
      favorable++;
      reasons.push(`RiskManager: |delta| ${absDelta.toFixed(2)} within conservative band; est. assignment prob. ~${Math.round(absDelta * 100)}%.`);
    } else {
      unfavorable++;
      reasons.push(`RiskManager: |delta| ${absDelta.toFixed(2)} is aggressive for premium selling.`);
    }
  } else {
    reasons.push("RiskManager: contract not found in delayed chain — risk unverified.");
    unfavorable++;
  }

  const signal =
    unfavorable === 0 && favorable >= 3
      ? "ENTER_NOW"
      : unfavorable >= 2
        ? "AVOID"
        : "WAIT";

  reasons.push("Signals derived from delayed data (mock bot adapter). Connect BOT_API_URL for live bots.");
  return { signal, reasons, riskScore, botStatus: "MOCK" };
}
