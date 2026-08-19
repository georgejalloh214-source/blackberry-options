import axios from "axios";
import { blackScholes, round } from "@/lib/blackScholes";
import { FlowItem, OptionQuote, OptionType, StockQuote } from "@/types";

export const DATA_DELAY_MINUTES = 15;

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<StockQuote>;
  getOptionsChain(symbol: string): Promise<OptionQuote[]>;
  getFlow(symbol?: string): Promise<FlowItem[]>;
}

/* ---------------------------------------------------------------- */
/* REAL PROVIDER — FINNHUB                                          */
/* ---------------------------------------------------------------- */

export class FinnhubMarketDataProvider implements MarketDataProvider {
  constructor(private apiKey: string) {}

  async getQuote(symbol: string): Promise<StockQuote> {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`;
    const { data } = await axios.get(url);

    return {
      symbol,
      price: data.c,
      change: data.d,
      percentChange: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      asOf: new Date().toISOString(),
      dataDelayMinutes: DATA_DELAY_MINUTES,
    };
  }

  async getOptionsChain(symbol: string): Promise<OptionQuote[]> {
    // Finnhub free tier does NOT provide full options chains.
    // So we generate Greeks using Black-Scholes + Finnhub's live stock price.

    const quote = await this.getQuote(symbol);
    const price = quote.price;

    // You can expand this later with real chain data from Polygon.
    const expirations = ["2024-09-20", "2024-10-18"];
    const strikes = [price * 0.8, price * 0.9, price, price * 1.1, price * 1.2];

    const chain: OptionQuote[] = [];

    for (const exp of expirations) {
      for (const strike of strikes) {
        const call = blackScholes({
          S: price,
          K: strike,
          r: 0.01,
          sigma: 0.25,
          t: 0.1,
          type: "call",
        });

        const put = blackScholes({
          S: price,
          K: strike,
          r: 0.01,
          sigma: 0.25,
          t: 0.1,
          type: "put",
        });

        chain.push({
          symbol,
          expiration: exp,
          strike: round(strike),
          type: OptionType.CALL,
          bid: round(call.price * 0.95),
          ask: round(call.price * 1.05),
          mid: round(call.price),
          delta: round(call.delta),
          gamma: round(call.gamma),
          theta: round(call.theta),
          vega: round(call.vega),
          rho: round(call.rho),
        });

        chain.push({
          symbol,
          expiration: exp,
          strike: round(strike),
          type: OptionType.PUT,
          bid: round(put.price * 0.95),
          ask: round(put.price * 1.05),
          mid: round(put.price),
          delta: round(put.delta),
          gamma: round(put.gamma),
          theta: round(put.theta),
          vega: round(put.vega),
          rho: round(put.rho),
        });
      }
    }

    return chain;
  }

  async getFlow(): Promise<FlowItem[]> {
    // Placeholder — Finnhub does not provide options flow.
    // You can wire your Python flow engine here later.
    return [];
  }
}

/* ---------------------------------------------------------------- */
/* EXPORT REAL PROVIDER                                             */
/* ---------------------------------------------------------------- */

export const marketData = new FinnhubMarketDataProvider(
  process.env.MARKET_DATA_API_KEY!
);
