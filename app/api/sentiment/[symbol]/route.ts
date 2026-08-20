import { ok, fail } from "@/lib/api";
import { getSentimentProvider } from "@/lib/sentiment";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  if (!symbol) return fail("MISSING_SYMBOL", "Symbol path param required.");
  try {
    return ok(await getSentimentProvider().getSentiment(symbol));
  } catch (e) {
    return fail("SENTIMENT_ERROR", e instanceof Error ? e.message : "Sentiment failed", 500);
  }
}
