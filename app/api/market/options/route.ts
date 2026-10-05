import { fail, ok } from "@/lib/api";
import { fetchYahooOptionsData } from "@/lib/marketData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");
  const expiry = searchParams.get("expiry");
  try {
    const data = await fetchYahooOptionsData(symbol, expiry ?? undefined);
    if (!data.chain.length) {
      return fail("DATA_UNAVAILABLE", "DATA UNAVAILABLE", 503);
    }
    return ok({ ...data, source: "YAHOO_OPTIONS" }, 15);
  } catch {
    return fail("DATA_UNAVAILABLE", "DATA UNAVAILABLE", 503);
  }
}
