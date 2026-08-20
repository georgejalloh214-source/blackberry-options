import { getProvider } from "@/lib/marketData";
import { pick, rngFor } from "@/lib/flow/seeded";
import { SentimentLabel, SentimentReport, SentimentSource } from "@/types/features";

/**
 * Sentiment provider abstraction.
 * TODO(live): implement RealSentimentProvider using Reddit API (OAuth),
 * X API v2 (bearer token), Yahoo Finance RSS, and a news API — behind the
 * exact same interface. Until keys exist, the deterministic sample provider
 * keeps the UI honest (isSample: true) and stable per symbol per day.
 */
export interface SentimentProvider {
  getSentiment(symbol: string): Promise<SentimentReport>;
}

const THEMES = [
  "earnings expectations", "AI product roadmap", "insider buying", "short interest",
  "analyst upgrades", "guidance cut fears", "buyback chatter", "sector rotation",
  "valuation debate", "options gamma squeeze talk", "macro rate sensitivity",
  "institutional accumulation",
] as const;

const PLAYERS = [
  "Vanguard", "BlackRock", "Citadel", "Renaissance", "ARK Invest",
  "Berkshire-watchers", "r/options regulars", "FinTwit momentum accounts",
  "Nancy Pelosi tracker bots", "dark pool whales",
] as const;

function label(score: number): SentimentLabel {
  if (score > 15) return "BULLISH";
  if (score < -15) return "BEARISH";
  return "NEUTRAL";
}

class SampleSentimentProvider implements SentimentProvider {
  async getSentiment(symbolRaw: string): Promise<SentimentReport> {
    const symbol = symbolRaw.toUpperCase();
    const day = new Date().toISOString().slice(0, 10);
    const rnd = rngFor(`sent:${symbol}:${day}`);
    const quote = await getProvider().getQuote(symbol);

    // Anchor sample sentiment loosely to price action so it feels coherent
    const base = Math.max(-60, Math.min(60, quote.changePct * 18));

    const mk = (name: SentimentSource["name"], spread: number, size: number): SentimentSource => {
      const score = Math.round(Math.max(-100, Math.min(100, base + (rnd() - 0.5) * spread)));
      return { name, label: label(score), score, sampleSize: Math.floor(size * (0.5 + rnd())) };
    };

    const sources: SentimentSource[] = [
      mk("Reddit", 70, 480),
      mk("X", 90, 1200),
      mk("Yahoo Finance", 40, 150),
      mk("News", 30, 45),
    ];

    const score = Math.round(sources.reduce((s, x) => s + x.score, 0) / sources.length);
    const overall = label(score);

    const themes = new Set<string>();
    while (themes.size < 4) themes.add(pick(rnd, THEMES));
    const players = new Set<string>();
    while (players.size < 3) players.add(pick(rnd, PLAYERS));

    const dir = overall === "BULLISH" ? "leaning bullish" : overall === "BEARISH" ? "leaning bearish" : "split";
    const digest =
      `${symbol} chatter is ${dir} today (${score > 0 ? "+" : ""}${score}). ` +
      `Price ${quote.changePct >= 0 ? "up" : "down"} ${Math.abs(quote.changePct).toFixed(2)}% has ` +
      `${sources[0].label === overall ? "Reddit and X aligned" : "retail and institutional voices diverging"}, ` +
      `with most discussion centered on ${[...themes][0]} and ${[...themes][1]}. ` +
      `Names moving the conversation: ${[...players].join(", ")}.`;

    return {
      symbol,
      overall,
      score,
      sources,
      topThemes: [...themes],
      majorPlayers: [...players],
      digest,
      isSample: true,
    };
  }
}

const provider: SentimentProvider = new SampleSentimentProvider();
export function getSentimentProvider(): SentimentProvider {
  return provider;
}
