import { fail, ok } from "@/lib/api";
import { getProvider } from "@/lib/marketData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");
  const expiry = searchParams.get("expiry");
  try {
    let chain = await getProvider().getOptionsChain(symbol);
    if (expiry) chain = chain.filter((c) => c.expiry === expiry);
    const expiries = [...new Set(chain.map((c) => c.expiry))].sort();
    return ok({ chain, expiries });
  } catch (e) {
    return fail("CHAIN_ERROR", e instanceof Error ? e.message : "Options chain fetch failed", 500);
  }
}
