import { getProvider } from "@/lib/marketData";
import { getSentimentProvider } from "@/lib/sentiment";
import { getLiveFlow } from "@/lib/flow/liveFlow";
import { kvGetJson, kvSetJson } from "@/lib/store";
import { AlertEvent, AlertRule, SentimentLabel } from "@/types/features";

const RULES_KEY = "bbo:alerts:rules";
const STATE_KEY = "bbo:alerts:state"; // last seen sentiment/price per symbol
const EVENTS_KEY = "bbo:alerts:events";
const SEEN_KEY = "bbo:alerts:seen-flow-ids";

interface AlertState {
  sentiment: Record<string, SentimentLabel>;
  price: Record<string, number>;
}

export async function getRules(): Promise<AlertRule[]> {
  return kvGetJson<AlertRule[]>(RULES_KEY, []);
}

export async function saveRules(rules: AlertRule[]): Promise<void> {
  await kvSetJson(RULES_KEY, rules);
}

export async function getAlertEvents(): Promise<AlertEvent[]> {
  return kvGetJson<AlertEvent[]>(EVENTS_KEY, []);
}

/** Evaluate all rules once. Called from the client poller via GET /api/alerts?check=1. */
export async function checkAlerts(): Promise<AlertEvent[]> {
  const rules = await getRules();
  if (!rules.length) return [];

  const state = await kvGetJson<AlertState>(STATE_KEY, { sentiment: {}, price: {} });
  const seen = new Set(await kvGetJson<string[]>(SEEN_KEY, []));
  const fired: AlertEvent[] = [];
  const symbols = [...new Set(rules.map((r) => r.symbol.toUpperCase()))];

  for (const symbol of symbols) {
    const symRules = rules.filter((r) => r.symbol.toUpperCase() === symbol);
    const needsFlow = symRules.some((r) =>
      ["SWEEP_PREMIUM", "BLOCK_PREMIUM", "ORDER_TYPE"].includes(r.type)
    );
    const flow = needsFlow ? await getLiveFlow(symbol, 5) : [];
    const freshFlow = flow.filter((e) => !seen.has(e.id));
    freshFlow.forEach((e) => seen.add(e.id));

    for (const rule of symRules) {
      const fire = (message: string) =>
        fired.push({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          ruleType: rule.type,
          symbol,
          message,
          audio: rule.audio,
          at: new Date().toISOString(),
        });

      if (rule.type === "SWEEP_PREMIUM" || rule.type === "BLOCK_PREMIUM") {
        const want = rule.type === "SWEEP_PREMIUM" ? "SWEEP" : "BLOCK";
        for (const e of freshFlow) {
          if (e.orderType === want && e.premium >= (rule.minPremium ?? 0)) {
            fire(`${want} ${e.contract} — $${(e.premium / 1e6).toFixed(2)}M ${e.sentiment}`);
          }
        }
      }

      if (rule.type === "ORDER_TYPE" && rule.orderType) {
        for (const e of freshFlow) {
          if (e.orderType === rule.orderType) {
            fire(`${rule.orderType} print on ${e.contract} — $${(e.premium / 1e3).toFixed(0)}K`);
          }
        }
      }

      if (rule.type === "PRICE_LEVEL" && rule.priceLevel && rule.direction) {
        const quote = await getProvider().getQuote(symbol);
        const prev = state.price[symbol];
        const crossedUp = prev !== undefined && prev < rule.priceLevel && quote.price >= rule.priceLevel;
        const crossedDown = prev !== undefined && prev > rule.priceLevel && quote.price <= rule.priceLevel;
        if ((rule.direction === "ABOVE" && crossedUp) || (rule.direction === "BELOW" && crossedDown)) {
          fire(`${symbol} crossed ${rule.direction.toLowerCase()} $${rule.priceLevel} (now $${quote.price})`);
        }
        state.price[symbol] = quote.price;
      }

      if (rule.type === "SENTIMENT_CHANGE") {
        const report = await getSentimentProvider().getSentiment(symbol);
        const prev = state.sentiment[symbol];
        if (prev && prev !== report.overall) {
          fire(`${symbol} sentiment flipped ${prev} → ${report.overall} (score ${report.score})`);
        }
        state.sentiment[symbol] = report.overall;
      }
    }
  }

  await kvSetJson(STATE_KEY, state);
  await kvSetJson(SEEN_KEY, [...seen].slice(-500));
  if (fired.length) {
    const prev = await getAlertEvents();
    await kvSetJson(EVENTS_KEY, [...fired, ...prev].slice(0, 100));
  }
  return fired;
}
