/**
 * Finnhub REST helper. The API key lives ONLY in server-side env vars
 * (FINNHUB_API_KEY or MARKET_DATA_API_KEY) — never in the repo, never
 * shipped to the browser. Client components must go through
 * /api/quote/realtime, which proxies this module.
 */

const BASE = "https://finnhub.io/api/v1";

export function finnhubKey(): string | undefined {
  return process.env.FINNHUB_API_KEY || process.env.MARKET_DATA_API_KEY || undefined;
}

export interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // change percent
  h: number;  // day high
  l: number;  // day low
  o: number;  // day open
  pc: number; // previous close
  t: number;  // unix timestamp
}

export async function fetchFinnhubQuote(
  symbol: string,
  key: string | undefined = finnhubKey()
): Promise<FinnhubQuote | null> {
  if (!key) return null;
  try {
    const res = await fetch(
      `${BASE}/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${key}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as FinnhubQuote;
    // Finnhub returns c=0 for unknown symbols / off-hours edge cases
    if (!data || typeof data.c !== "number" || data.c <= 0) return null;
    return data;
  } catch {
    return null; // fail soft — callers fall back to the sample provider
  }
}
