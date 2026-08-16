import { fail, ok } from "@/lib/api";
import { getProvider } from "@/lib/marketData";
import { DEFAULT_FILTERS, scanChain, ScannerFilters } from "@/lib/scoring";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");

  const num = (key: string, def: number) => {
    const v = searchParams.get(key);
    if (v === null || v === "") return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const filters: ScannerFilters = {
    minDelta: num("minDelta", DEFAULT_FILTERS.minDelta),
    maxDelta: num("maxDelta", DEFAULT_FILTERS.maxDelta),
    minIV: num("minIV", DEFAULT_FILTERS.minIV),
    maxIV: num("maxIV", DEFAULT_FILTERS.maxIV),
    minVolume: num("minVolume", DEFAULT_FILTERS.minVolume),
    maxDTE: num("maxDTE", DEFAULT_FILTERS.maxDTE ?? 45),
  };

  try {
    const provider = getProvider();
    const [quote, chain] = await Promise.all([
      provider.getQuote(symbol),
      provider.getOptionsChain(symbol),
    ]);
    const options = scanChain(chain, filters, quote.supportLevel, quote.resistanceLevel, 10);
    return ok({ options });
  } catch (e) {
    return fail("SCANNER_ERROR", e instanceof Error ? e.message : "Scanner failed", 500);
  }
}
