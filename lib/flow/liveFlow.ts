import { getProvider } from "@/lib/marketData";
import { round } from "@/lib/blackScholes";
import { pick, rngFor } from "@/lib/flow/seeded";
import { OptionType } from "@/types";
import { FlowFiltersState, FlowOrderType, LiveFlowEvent, SentimentLabel } from "@/types/features";

/**
 * Live flow provider. TODO(live): swap for a real feed (Unusual Whales /
 * FlowAlgo / CBOE) behind this same function signature when FLOW_DATA_API_KEY
 * is set. Sample feed is deterministic per minute so polling clients see a
 * stable, append-only tape.
 */

const WATCHLIST = ["NVDA", "TSLA", "AAPL", "SPY", "AMD", "META", "PLTR", "COIN", "MSFT", "QQQ"];

function nextFridays(count: number, rnd: () => number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7) + 7 * Math.floor(rnd() * count));
  return d.toISOString().slice(0, 10);
}

async function eventsForMinute(minuteKey: string, symbol?: string): Promise<LiveFlowEvent[]> {
  const symbols = symbol ? [symbol.toUpperCase()] : WATCHLIST;
  const out: LiveFlowEvent[] = [];

  for (const sym of symbols) {
    const rnd = rngFor(`live:${sym}:${minuteKey}`);
    const count = Math.floor(rnd() * 3); // 0-2 prints per symbol per minute
    if (!count) continue;
    const quote = await getProvider().getQuote(sym);

    for (let i = 0; i < count; i++) {
      const type: OptionType = rnd() > 0.45 ? "CALL" : "PUT";
      const orderType = pick(rnd, ["SWEEP", "SWEEP", "BLOCK", "SPLIT"] as const) as FlowOrderType;
      const otm = 1 + (type === "CALL" ? 1 : -1) * (0.01 + rnd() * 0.08);
      const strike = round(Math.round((quote.price * otm) / 2.5) * 2.5);
      const size = Math.floor(100 + rnd() * 6000);
      const premium = Math.floor(size * 100 * (0.4 + rnd() * 8));
      const sentiment: SentimentLabel =
        orderType === "SWEEP"
          ? type === "CALL" ? "BULLISH" : "BEARISH"
          : rnd() > 0.5
            ? type === "CALL" ? "BULLISH" : "BEARISH"
            : "NEUTRAL";
      const expiry = nextFridays(4, rnd);

      out.push({
        id: `${sym}-${minuteKey}-${i}`,
        symbol: sym,
        contract: `${sym} $${strike}${type[0]} ${expiry.slice(5)}`,
        type,
        orderType,
        premium,
        size,
        strike,
        expiry,
        sentiment,
        spotAtPrint: quote.price,
        time: new Date(`${minuteKey}:00.000Z`).toISOString(),
        darkPool: false,
      });
    }
  }
  return out.sort((a, b) => b.premium - a.premium);
}

/** Returns flow for the last `minutes` minutes (default 15). */
export async function getLiveFlow(symbol?: string, minutes = 15): Promise<LiveFlowEvent[]> {
  const out: LiveFlowEvent[] = [];
  const now = Date.now();
  for (let m = 0; m < minutes; m++) {
    const key = new Date(now - m * 60_000).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    out.push(...(await eventsForMinute(key, symbol)));
  }
  return out.sort((a, b) => b.time.localeCompare(a.time));
}

export function applyFlowFilters<T extends { premium: number; strike?: number; expiry?: string; sentiment?: SentimentLabel; orderType?: FlowOrderType }>(
  events: T[],
  f: Partial<FlowFiltersState>
): T[] {
  return events.filter((e) => {
    if (f.minPremium && e.premium < f.minPremium) return false;
    if (f.strike && e.strike !== f.strike) return false;
    if (f.expiry && e.expiry !== f.expiry) return false;
    if (f.sentiment && f.sentiment !== "ALL" && e.sentiment !== f.sentiment) return false;
    if (f.orderType && f.orderType !== "ALL" && e.orderType !== f.orderType) return false;
    return true;
  });
}
