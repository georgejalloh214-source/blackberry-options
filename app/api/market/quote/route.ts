import { fail, ok } from "@/lib/api";
import { getProvider } from "@/lib/marketData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");
  try {
    const quote = await getProvider().getQuote(symbol);
    return ok(quote);
  } catch (e) {
    return fail("QUOTE_ERROR", e instanceof Error ? e.message : "Quote fetch failed", 500);
  }
}
