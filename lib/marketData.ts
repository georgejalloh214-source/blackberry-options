import { blackScholes, round } from "@/lib/blackScholes";
import { FlowItem, OptionQuote, OptionType, StockQuote } from "@/types";

/**
 * Market data provider abstraction.
 *
 * v1 ships a deterministic MOCK provider (seeded by symbol + hour) so the
 * entire app works end-to-end with zero API keys. When MARKET_DATA_API_KEY
 * is set, wire a real provider (Finnhub / Polygon free tier — 15-min delayed)
 * behind the exact same interface. Nothing above this layer changes.
 */

export const DATA_DELAY_MINUTES = 15;

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<StockQuote>;
  getOptionsChain(symbol: string): Promise<OptionQuote[]>;
  getFlow(symbol?: string): Promise<FlowItem[]>;
}

/* ---------------------------------------------------------------- */
/* Deterministic seeded RNG (mulberry32) so mock data is stable      */
/* within the hour and consistent across scanner/chain/paper trades. */
/* ---------------------------------------------------------------- */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hourBucket(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
}

function rngFor(key: string): () => number {
  return mulberry32(hashString(`${key}:${hourBucket()}`));
}

/* ------------------------------ MOCK ----------------------------- */

const BASE_PRICES: Record<string, number> = {
  AAPL: 232, MSFT: 428, NVDA: 131, TSLA: 248, AMZN: 186,
  META: 512, GOOGL: 172, SPY: 553, QQQ: 478, AMD: 158,
  PLTR: 32, SOFI: 9.5, F: 11, NIO: 5.2, COIN: 245,
};

function basePrice(symbol: string): number {
  return BASE_PRICES[symbol.toUpperCase()] ?? 20 + (hashString(symbol.toUpperCase()) % 400);
}

function nextFridays(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7));
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

function strikeStep(price: number): number {
  if (price < 25) return 0.5;
  if (price < 100) return 2.5;
  if (price < 250) return 5;
  return 10;
}

class MockProvider implements MarketDataProvider {
  async getQuote(symbolRaw: string): Promise<StockQuote> {
    const symbol = symbolRaw.toUpperCase();
    const rnd = rngFor(`q:${symbol}`);
    const base = basePrice(symbol);
    const price = round(base * (0.97 + rnd() * 0.06));
    const prevClose = round(base * (0.97 + rnd() * 0.06));
    const step = strikeStep(price);
    return {
      symbol,
      price,
      bid: round(price - 0.02),
      ask: round(price + 0.02),
      volume: Math.floor(1_000_000 + rnd() * 40_000_000),
      prevClose,
      changePct: round(((price - prevClose) / prevClose) * 100),
      dayHigh: round(price * (1 + rnd() * 0.015)),
      dayLow: round(price * (1 - rnd() * 0.015)),
      supportLevel: round(Math.floor((price * 0.96) / step) * step),
      resistanceLevel: round(Math.ceil((price * 1.045) / step) * step),
    };
  }

  async getOptionsChain(symbolRaw: string): Promise<OptionQuote[]> {
    const symbol = symbolRaw.toUpperCase();
    const quote = await this.getQuote(symbol);
    const rnd = rngFor(`c:${symbol}`);
    const spot = quote.price;
    const step = strikeStep(spot);
    const expiries = nextFridays(4);
    const baseIv = 0.22 + rnd() * 0.35; // symbol-level IV regime
    const ivPercentile = Math.floor(rnd() * 100);
    const chain: OptionQuote[] = [];

    for (const expiry of expiries) {
      const dte = Math.max(
        1,
        Math.round((new Date(expiry).getTime() - Date.now()) / 86_400_000)
      );
      const t = dte / 365;
      const atm = Math.round(spot / step) * step;
      for (let i = -7; i <= 7; i++) {
        const strike = round(atm + i * step);
        if (strike <= 0) continue;
        // IV smile: higher IV further from ATM, slight put skew
        const moneyness = Math.abs(strike - spot) / spot;
        for (const type of ["PUT", "CALL"] as OptionType[]) {
          const skew = type === "PUT" && strike < spot ? 0.03 : 0;
          const iv = round(baseIv + moneyness * 0.5 + skew + rnd() * 0.02, 3);
          const bs = blackScholes({ spot, strike, t, iv, type });
          const spreadPct = 0.02 + moneyness * 0.25 + rnd() * 0.04;
          const half = Math.max(0.01, (bs.price * spreadPct) / 2);
          const liquidityFactor = Math.max(0, 1 - moneyness * 6);
          chain.push({
            symbol,
            expiry,
            strike,
            type,
            iv,
            ivPercentile,
            bid: round(Math.max(0.01, bs.price - half)),
            ask: round(bs.price + half),
            mid: round(bs.price),
            volume: Math.floor(rnd() * 8000 * liquidityFactor),
            openInterest: Math.floor(rnd() * 25000 * liquidityFactor),
            dte,
            greeks: {
              delta: bs.delta,
              gamma: bs.gamma,
              theta: bs.theta,
              vega: bs.vega,
              rho: bs.rho,
            },
          });
        }
      }
    }
    return chain;
  }

  async getFlow(symbol?: string): Promise<FlowItem[]> {
    const symbols = symbol
      ? [symbol.toUpperCase()]
      : ["NVDA", "TSLA", "AAPL", "SPY", "AMD", "META", "PLTR", "COIN"];
    const items: FlowItem[] = [];
    for (const sym of symbols) {
      const rnd = rngFor(`f:${sym}`);
      const quote = await this.getQuote(sym);
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const type: OptionType = rnd() > 0.45 ? "CALL" : "PUT";
        const otm = 1 + (type === "CALL" ? 1 : -1) * (0.02 + rnd() * 0.06);
        const strike = round(Math.round((quote.price * otm) / strikeStep(quote.price)) * strikeStep(quote.price));
        const expiry = nextFridays(3)[Math.floor(rnd() * 3)];
        const size = Math.floor(200 + rnd() * 4800);
        const premium = Math.floor(size * 100 * (0.5 + rnd() * 6));
        const bullish = type === "CALL" ? rnd() > 0.3 : rnd() > 0.7;
        items.push({
          id: `${sym}-${expiry}-${strike}-${type}-${i}`,
          symbol: sym,
          contract: `${sym} $${strike}${type === "PUT" ? "P" : "C"} ${expiry.slice(5)}`,
          type,
          tradeType: rnd() > 0.6 ? "SWEEP" : rnd() > 0.3 ? "BLOCK" : "SPLIT",
          premium,
          size,
          sentiment: bullish ? "BULLISH" : rnd() > 0.5 ? "BEARISH" : "NEUTRAL",
          time: new Date(Date.now() - Math.floor(rnd() * 3_600_000)).toISOString(),
        });
      }
    }
    return items.sort((a, b) => b.premium - a.premium);
  }
}

/* --------------------------- PROVIDER PICK ------------------------ */
// TODO(v1.1): add FinnhubProvider implementing MarketDataProvider and
// select it here when MARKET_DATA_API_KEY is present.
const provider: MarketDataProvider = new MockProvider();

export function getProvider(): MarketDataProvider {
  return provider;
}

export function isMockData(): boolean {
  return !process.env.MARKET_DATA_API_KEY;
}
