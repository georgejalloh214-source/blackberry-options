import { round } from "@/lib/blackScholes";
import { pick, rngFor } from "@/lib/flow/seeded";
import { OptionType } from "@/types";
import { applyFlowFilters } from "@/lib/flow/liveFlow";
import { FlowOrderType, HistoricalFlowQuery, LiveFlowEvent, SentimentLabel } from "@/types/features";

export const HISTORY_START = "2017-01-01";

/**
 * Historical flow archive (2017-present). Deterministic per (symbol, date) so
 * the same query always returns the same "archive". TODO(live): replace with
 * a real historical flow API behind this same signature.
 */
export function queryHistoricalFlow(q: HistoricalFlowQuery): LiveFlowEvent[] {
  const symbol = q.symbol.toUpperCase();
  const from = q.from < HISTORY_START ? HISTORY_START : q.from;
  const to = q.to;
  const limit = Math.min(q.limit ?? 100, 500);

  const out: LiveFlowEvent[] = [];
  const cursor = new Date(`${to}T00:00:00Z`);
  const stop = new Date(`${from}T00:00:00Z`);

  while (cursor >= stop && out.length < limit * 3) {
    const day = cursor.toISOString().slice(0, 10);
    const rnd = rngFor(`hist:${symbol}:${day}`);
    // deterministic historical "spot": random-walk-ish anchor per year
    const yearAnchor = 40 + (rngFor(`anchor:${symbol}:${day.slice(0, 4)}`)() * 400);
    const spot = round(yearAnchor * (0.9 + rnd() * 0.2));
    const count = Math.floor(rnd() * 4); // 0-3 notable prints per day

    for (let i = 0; i < count; i++) {
      const type: OptionType = rnd() > 0.45 ? "CALL" : "PUT";
      const orderType = pick(rnd, ["SWEEP", "BLOCK", "SPLIT"] as const) as FlowOrderType;
      const strike = round(Math.round((spot * (0.9 + rnd() * 0.2)) / 2.5) * 2.5);
      const size = Math.floor(200 + rnd() * 9000);
      const premium = Math.floor(size * 100 * (0.4 + rnd() * 10));
      const sentiment: SentimentLabel =
        type === "CALL" ? (rnd() > 0.3 ? "BULLISH" : "NEUTRAL") : rnd() > 0.3 ? "BEARISH" : "NEUTRAL";
      const expiryD = new Date(cursor);
      expiryD.setUTCDate(expiryD.getUTCDate() + 7 + Math.floor(rnd() * 45));
      const expiry = expiryD.toISOString().slice(0, 10);

      out.push({
        id: `${symbol}-${day}-${i}`,
        symbol,
        contract: `${symbol} $${strike}${type[0]} ${expiry.slice(5)}`,
        type,
        orderType,
        premium,
        size,
        strike,
        expiry,
        sentiment,
        spotAtPrint: spot,
        time: `${day}T15:${String(Math.floor(rnd() * 60)).padStart(2, "0")}:00.000Z`,
        darkPool: false,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return applyFlowFilters(out, q).slice(0, limit);
}
