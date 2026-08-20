import { ok, fail } from "@/lib/api";
import { computeClusters, getDarkPoolPrints } from "@/lib/flow/darkPool";
import { getProvider } from "@/lib/marketData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");
  try {
    const [prints, quote] = await Promise.all([
      getDarkPoolPrints(symbol),
      getProvider().getQuote(symbol),
    ]);
    return ok({
      prints,
      clusters: computeClusters(prints, quote.price),
      source: process.env.FLOW_DATA_API_KEY ? "LIVE" : "SAMPLE",
    });
  } catch (e) {
    return fail("DARK_POOL_ERROR", e instanceof Error ? e.message : "Dark pool failed", 500);
  }
}
