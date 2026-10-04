import YahooFinance from "yahoo-finance2";

const MAGICA_API_URL = "https://inference.magica.com/v1/chat/completions";
const DEFAULT_MODEL = "~google/gemini-flash-latest";
const yahooFinance = new YahooFinance();

export type AssistantTask = "analysis" | "option-explainer" | "trade-thesis" | "earnings-copilot";

export interface ContractInput {
  strike: number;
  expiration: string;
  optionType: "CALL" | "PUT";
  impliedVolatility?: number | null;
}

type Quote = Awaited<ReturnType<typeof yahooFinance.quote>>;

function average(values: number[], count: number): number | null {
  if (values.length < count) return null;
  const window = values.slice(-count);
  return window.reduce((total, value) => total + value, 0) / count;
}

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = new Date(value < 1_000_000_000_000 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  return typeof value === "string" ? value : null;
}

function summarizeContracts(contracts: Array<Record<string, unknown>> = []) {
  return contracts
    .slice()
    .sort((left, right) => Number(right.openInterest || 0) - Number(left.openInterest || 0))
    .slice(0, 6)
    .map((contract) => ({
      strike: contract.strike,
      impliedVolatility: contract.impliedVolatility,
      openInterest: contract.openInterest,
      volume: contract.volume,
      bid: contract.bid,
      ask: contract.ask,
    }));
}

async function askMagica(prompt: string): Promise<unknown> {
  const apiKey = process.env.MAGICA_API_KEY?.trim();
  if (!apiKey || !apiKey.startsWith("gx_")) {
    throw new Error("AI assistant is not configured. Set MAGICA_API_KEY on the server.");
  }

  let response: Response;
  try {
    response = await fetch(MAGICA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MAGICA_LLM_MODEL?.trim() || DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error("Could not connect to Magica AI. Try again shortly.");
  }

  if (!response.ok) {
    throw new Error(response.status === 429
      ? "Magica AI is rate limited. Try again shortly."
      : "Magica AI could not complete this request.");
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Magica AI returned an empty response.");
  }

  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  for (const candidate of [cleaned, start >= 0 && end > start ? cleaned.slice(start, end + 1) : ""]) {
    try {
      if (candidate) return JSON.parse(candidate) as unknown;
    } catch {
      // try the next candidate
    }
  }
  return { summary: text.trim() };
}

export async function createAssistantAnswer(
  task: AssistantTask,
  symbol: string,
  contract?: ContractInput,
) {
  const quote = await yahooFinance.quote(symbol);
  if (typeof quote.regularMarketPrice !== "number") {
    throw new Error("Yahoo Finance did not return a current price for this ticker.");
  }

  const end = new Date();
  const start = new Date(end.getTime() - 100 * 24 * 60 * 60 * 1000);
  const history = await yahooFinance.historical(symbol, { period1: start, period2: end, interval: "1d" });
  const closes = history
    .map((bar) => bar.close)
    .filter((close): close is number => typeof close === "number" && Number.isFinite(close));
  const rawQuote = quote as Quote & Record<string, unknown>;
  const market = {
    quote: {
      symbol: quote.symbol || symbol,
      currency: quote.currency || "USD",
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? null,
      changePercent: quote.regularMarketChangePercent ?? null,
      volume: quote.regularMarketVolume ?? null,
      marketCap: quote.marketCap ?? null,
      asOf: normalizeDate(quote.regularMarketTime),
    },
    movingAverages: {
      average20Day: average(closes, 20),
      average50Day: average(closes, 50),
    },
  };

  const earningsContext = {
    nextEarningsDate: normalizeDate(rawQuote.earningsTimestampStart ?? rawQuote.earningsTimestamp),
    trailingEPS: rawQuote.epsTrailingTwelveMonths ?? null,
    forwardEPS: rawQuote.epsForward ?? null,
    trailingPE: rawQuote.trailingPE ?? null,
    forwardPE: rawQuote.forwardPE ?? null,
  };

  let optionsContext: unknown = null;
  if (task === "trade-thesis") {
    const result = await yahooFinance.options(symbol) as unknown as {
      options?: Array<{
        expirationDate?: Date | string;
        calls?: Array<Record<string, unknown>>;
        puts?: Array<Record<string, unknown>>;
      }>;
    };
    const nearest = result.options?.[0];
    optionsContext = nearest ? {
      expiration: normalizeDate(nearest.expirationDate),
      calls: summarizeContracts(nearest.calls),
      puts: summarizeContracts(nearest.puts),
    } : { calls: [], puts: [] };
  }

  const context = { ...market, earnings: earningsContext, options: optionsContext, contract };
  const prompts: Record<AssistantTask, string> = {
    analysis: "Analyze this ticker using only the supplied Yahoo Finance quote and moving averages. Return valid JSON with bullishSignals (array), bearishSignals (array), risks (array), tradingSentiment (bullish/neutral/bearish), and summary (string). Do not invent facts or give personalized financial advice.",
    "option-explainer": "Explain this call or put option in plain English. Explain how strike, expiration, and implied volatility matter, and that the buyer can lose the entire premium. No premium was supplied, so do not estimate breakeven or return. Return valid JSON with explanation (string) and risks (array). Do not recommend a trade.",
    "trade-thesis": "Create a balanced educational trade thesis from the supplied quote, moving averages, and nearest available Yahoo option-chain snapshot. Return valid JSON with bullCase (string), bearCase (string), and riskFactors (array). Do not infer direction from open interest alone, invent catalysts, or give personalized financial advice.",
    "earnings-copilot": "Create an earnings briefing using only the supplied quote, moving averages, and Yahoo earnings fields. Return valid JSON with whatTradersAreWatching (array), bullCase (string), bearCase (string), and keyRisks (array). If earnings details are missing, say so rather than inventing them. Do not give personalized financial advice.",
  };

  const answer = await askMagica(`${prompts[task]}\n\nTicker: ${symbol}\nMarket context: ${JSON.stringify(context)}`);
  return { task, symbol, market, answer };
}