import { fail, ok } from "@/lib/api";
import { fetchFinnhubQuote, finnhubKey } from "@/lib/finnhub";
import { getProvider } from "@/lib/marketData";
import { round } from "@/lib/blackScholes";

export interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  source: "FINNHUB" | "SAMPLE";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");

  try {
    if (finnhubKey()) {
      const q = await fetchFinnhubQuote(symbol);
      if (q) {
        const data: RealtimeQuote = {
          symbol,
          price: round(q.c),
          change: round(q.d),
          changePct: round(q.dp),
          high: round(q.h),
          low: round(q.l),
          open: round(q.o),
          prevClose: round(q.pc),
          source: "FINNHUB",
        };
        return ok(data, 0); // Finnhub REST quotes are near-real-time
      }
    }
    // Fallback: sample provider quote
    const s = await getProvider().getQuote(symbol);
    const data: RealtimeQuote = {
      symbol,
      price: s.price,
      change: round(s.price - s.prevClose),
      changePct: s.changePct,
      high: s.dayHigh,
      low: s.dayLow,
      open: s.prevClose,
      prevClose: s.prevClose,
      source: "SAMPLE",
    };
    return ok(data);
  } catch (e) {
    return fail("REALTIME_ERROR", e instanceof Error ? e.message : "Quote failed", 500);
  }
}
