import { getProvider } from "@/lib/marketData";
import { round } from "@/lib/blackScholes";
import { pick, rngFor } from "@/lib/flow/seeded";
import { DarkPoolPrint, PriceCluster } from "@/types/features";

const VENUES = ["UBS ATS", "MS Pool", "JPM-X", "Sigma X", "CrossFinder", "Level ATS"] as const;

/** Sample dark pool prints, deterministic per symbol per 5-minute bucket. */
export async function getDarkPoolPrints(symbolRaw: string, buckets = 12): Promise<DarkPoolPrint[]> {
  const symbol = symbolRaw.toUpperCase();
  const quote = await getProvider().getQuote(symbol);
  const out: DarkPoolPrint[] = [];
  const now = Date.now();

  for (let b = 0; b < buckets; b++) {
    const t = new Date(now - b * 300_000);
    const key = `${symbol}:${t.toISOString().slice(0, 15)}`; // 5-min-ish bucket
    const rnd = rngFor(`dark:${key}`);
    const count = Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const price = round(quote.price * (0.985 + rnd() * 0.03));
      const size = Math.floor(10_000 + rnd() * 490_000);
      out.push({
        id: `${key}-${i}`,
        symbol,
        price,
        size,
        notional: Math.round(price * size),
        venue: pick(rnd, VENUES),
        aboveAsk: price > quote.ask,
        belowBid: price < quote.bid,
        time: t.toISOString(),
        darkPool: true,
      });
    }
  }
  return out.sort((a, b) => b.time.localeCompare(a.time));
}

/** Aggregate prints into price clusters => institutional support/resistance. */
export function computeClusters(prints: DarkPoolPrint[], spot: number): PriceCluster[] {
  const bucketSize = Math.max(0.5, round(spot * 0.005)); // ~0.5% buckets
  const map = new Map<number, { notional: number; count: number }>();
  for (const p of prints) {
    const bucket = round(Math.round(p.price / bucketSize) * bucketSize);
    const cur = map.get(bucket) ?? { notional: 0, count: 0 };
    cur.notional += p.notional;
    cur.count += 1;
    map.set(bucket, cur);
  }
  return [...map.entries()]
    .map(([price, v]) => ({
      price,
      totalNotional: v.notional,
      printCount: v.count,
      kind: (price <= spot ? "SUPPORT" : "RESISTANCE") as PriceCluster["kind"],
    }))
    .sort((a, b) => b.totalNotional - a.totalNotional)
    .slice(0, 6);
}
