import { blackScholes, round } from "@/lib/blackScholes";
import { fetchFinnhubQuote, finnhubKey } from "@/lib/finnhub";
import { rngFor } from "@/lib/flow/seeded";
import { FlowItem, OptionQuote, OptionType, StockQuote } from "@/types";

/**
 * Market data provider abstraction.
 *
 * - With FINNHUB_API_KEY / MARKET_DATA_API_KEY set: real Finnhub quotes power
 *   getQuote, and the options chain is MODELED (Black-Scholes) around the real
 *   spot price — Finnhub's free tier does not include options chains.
 * - Without a key: fully deterministic sample provider (seeded per symbol+hour).
 * - Flow is sample data in both modes until a real flow feed is added.
 */

export const DATA_DELAY_MINUTES = 15;

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<StockQuote>;
  getOptionsChain(symbol: string): Promise<OptionQuote[]>;
  getFlow(symbol?: string): Promise<FlowItem[]>;
}

function hourBucket(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
}

/* ------------------------------ SHARED ---------------------------- */

const BASE_PRICES: Record<string, number> = {
  AAPL: 232, MSFT: 428, NVDA: 131, TSLA: 248, AMZN: 186,
  META: 512, GOOGL: 172, SPY: 553, QQQ: 478, AMD: 158,
  PLTR: 32, SOFI: 9.5, F: 11, NIO: 5.2, COIN: 245,
};

function hashSym(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function basePrice(symbol: string): number {
  return BASE_PRICES[symbol.toUpperCase()] ?? 20 + (hashSym(symbol.toUpperCase()) % 400);
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

/** Black-Scholes-modeled chain anchored to a (real or sample) quote. */
function buildChain(symbol: string, quote: StockQuote): OptionQuote[] {
  const rnd = rngFor(`c:${symbol}:${hourBucket()}`);
  const spot = quote.price;
  const step = strikeStep(spot);
  const expiries = nextFridays(4);
  const baseIv = 0.22 + rnd() * 0.35;
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

/** Sample flow used in both modes until a real flow feed exists. */
async function buildFlow(
  getQuote: (s: string) => Promise<StockQuote>,
  symbol?: string
): Promise<FlowItem[]> {
  const symbols = symbol
    ? [symbol.toUpperCase()]
    : ["NVDA", "TSLA", "AAPL", "SPY", "AMD", "META", "PLTR", "COIN"];
  const items: FlowItem[] = [];
  for (const sym of symbols) {
    const rnd = rngFor(`f:${sym}:${hourBucket()}`);
    const quote = await getQuote(sym);
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const type: OptionType = rnd() > 0.45 ? "CALL" : "PUT";
      const otm = 1 + (type === "CALL" ? 1 : -1) * (0.02 + rnd() * 0.06);
      const strike = round(
        Math.round((quote.price * otm) / strikeStep(quote.price)) * strikeStep(quote.price)
      );
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

/* ------------------------------ SAMPLE ---------------------------- */

class SampleProvider implements MarketDataProvider {
  async getQuote(symbolRaw: string): Promise<StockQuote> {
    const symbol = symbolRaw.toUpperCase();
    const rnd = rngFor(`q:${symbol}:${hourBucket()}`);
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
    return buildChain(symbol, await this.getQuote(symbol));
  }

  async getFlow(symbol?: string): Promise<FlowItem[]> {
    return buildFlow((s) => this.getQuote(s), symbol);
  }
}

/* ------------------------------ FINNHUB --------------------------- */

class FinnhubProvider implements MarketDataProvider {
  private fallback = new SampleProvider();

  async getQuote(symbolRaw: string): Promise<StockQuote> {
    const symbol = symbolRaw.toUpperCase();
    const q = await fetchFinnhubQuote(symbol);
    if (!q) return this.fallback.getQuote(symbol); // off-hours / bad symbol / rate limit
    const price = round(q.c);
    const step = strikeStep(price);
    return {
      symbol,
      price,
      bid: round(price - 0.02),
      ask: round(price + 0.02),
      volume: 0, // not in Finnhub /quote; real volume needs a candles call
      prevClose: round(q.pc),
      changePct: round(q.dp),
      dayHigh: round(q.h),
      dayLow: round(q.l),
      supportLevel: round(Math.floor((price * 0.96) / step) * step),
      resistanceLevel: round(Math.ceil((price * 1.045) / step) * step),
    };
  }

  async getOptionsChain(symbolRaw: string): Promise<OptionQuote[]> {
    const symbol = symbolRaw.toUpperCase();
    // Chain is MODELED around the real spot — free tier has no options data.
    return buildChain(symbol, await this.getQuote(symbol));
  }

  async getFlow(symbol?: string): Promise<FlowItem[]> {
    return buildFlow((s) => this.getQuote(s), symbol);
  }
}

/* --------------------------- PROVIDER PICK ------------------------ */

export function isMockData(): boolean {
  return !finnhubKey();
}

export function getProvider(): MarketDataProvider {
  return finnhubKey() ? new FinnhubProvider() : new SampleProvider();
}
